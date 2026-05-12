import { logger } from '../../../utils/logger.ts';
import { supabase } from '../../../lib/supabase.ts';
import { VeoVertexProvider } from '../providers/VeoVertexProvider.ts';

const MAX_REMIX_SOURCE_BYTES = 15 * 1024 * 1024;
const MIX_CDN_HOST_HINTS = [
  'pexels.com',
  'pixabay.com',
  'googleapis.com',
  'supabase.co',
  'cloudfront.net',
  'akamaihd.net',
  'akamaized.net',
  'samplelib.com',
  'res.cloudinary.com',
];
const MIX_BLOCKED_HOST_HINTS = [
  'player.vimeo.com',
  'vimeo.com',
  'instagram.com',
  'facebook.com',
  'tiktok.com',
  'x.com',
  'twitter.com',
];

const finalizationProvider = new VeoVertexProvider();

export interface CloudinarySceneLike {
  id: string;
  title?: string;
  visualPrompt?: string;
  narration: string;
  durationSeconds?: number;
  operationName?: string;
  status?: 'ready' | 'processing' | 'error';
  error?: string;
  videoUrl?: string;
  rawVideoUrl?: string;
  narrationAudioUrl?: string;
  provider?: 'veo' | 'pexels';
  sceneStage?: 'draft' | 'preview' | 'final';
}

export interface ProgressiveSceneStateLike {
  id: string;
  index: number;
  title: string;
  narration: string;
  visualPrompt: string;
  sceneDurationSeconds: number;
  currentQuality: 'draft' | 'final';
  draftVideoUrl?: string;
  draftProvider?: 'ltx' | 'pexels';
  draftStatus: 'queued' | 'generating' | 'ready' | 'failed';
  draftGenerationId?: string;
  draftError?: string;
  finalVideoUrl?: string;
  finalProvider?: 'veo';
  finalStatus: 'queued' | 'generating' | 'ready' | 'failed';
  finalGenerationId?: string;
  finalError?: string;
  isUpgrading: boolean;
  operationName?: string;
  narrationAudioUrl?: string;
  enhancedVideoUrl?: string;
  mixedVideoUrl?: string;
  mixStatus?: 'queued' | 'processing' | 'ready' | 'failed';
  mixError?: string;
  mixProvider?: 'cloudinary';
}

export type OnSceneReadyCallback = (
  sceneIndex: number,
  quality: 'draft' | 'final',
  videoUrl: string,
  sceneState: ProgressiveSceneStateLike
) => void;

function hostMatchesHint(hostname: string, hints: string[]): boolean {
  return hints.some((hint) => hostname === hint || hostname.endsWith(`.${hint}`));
}

function getUrlHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isLikelyBlockedMixSource(url: string): boolean {
  const hostname = getUrlHostname(url);
  if (!hostname) {
    return true;
  }
  if (hostMatchesHint(hostname, MIX_CDN_HOST_HINTS)) {
    return false;
  }
  return hostMatchesHint(hostname, MIX_BLOCKED_HOST_HINTS);
}

function isLikelyBlockedMixFailure(message?: string): boolean {
  if (!message) {
    return false;
  }
  const normalized = message.toLowerCase();
  return (
    normalized.includes('likely blocked') ||
    normalized.includes('sourcebase64') ||
    normalized.includes('source fetch failed (403)') ||
    normalized.includes('source fetch failed (401)') ||
    normalized.includes('error in loading')
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function toCloudinaryLayerPublicId(publicId: string): string {
  return publicId.replace(/\//g, ':');
}

function parseCloudinaryUrl(url: string): { cloudName: string; publicId: string; extension: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'res.cloudinary.com') {
      return null;
    }

    const pathSegments = parsed.pathname.split('/').filter(Boolean);
    if (!pathSegments.length) {
      return null;
    }

    const cloudName = pathSegments[0];
    const marker = '/video/upload/';
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) {
      return null;
    }

    const afterUpload = parsed.pathname.slice(markerIndex + marker.length);
    const segments = afterUpload.split('/').filter(Boolean);
    if (!segments.length) {
      return null;
    }

    const lastSegment = segments[segments.length - 1];
    const dotIndex = lastSegment.lastIndexOf('.');
    if (dotIndex === -1) {
      return null;
    }

    const extension = lastSegment.slice(dotIndex + 1) || 'mp4';
    const fileName = lastSegment.slice(0, dotIndex);

    const isTransformation = (segment: string): boolean => {
      return segment.includes('=') ||
        segment.includes(',') ||
        segment.includes(':') ||
        /^(f_|e_|l_|so_|du_|vc_|br_|q_|fl_|bo_|co_|g_|y_|w_|h_|c_|ar_)/.test(segment);
    };

    const publicIdParts: string[] = [];
    for (const segment of segments.slice(0, -1)) {
      if (!isTransformation(segment)) {
        publicIdParts.push(segment);
      }
    }
    publicIdParts.push(fileName);

    const publicId = publicIdParts.join('/');
    if (!publicId) {
      return null;
    }

    return { cloudName, publicId, extension };
  } catch {
    return null;
  }
}

export function buildCloudinaryConcatUrl(sceneUrls: string[]): string | undefined {
  const parsed = sceneUrls
    .map((url) => parseCloudinaryUrl(url))
    .filter((value): value is { cloudName: string; publicId: string; extension: string } => !!value);

  if (!parsed.length) {
    logger.warn('[CinematicService] No valid Cloudinary URLs to concat');
    return undefined;
  }

  const first = parsed[0];
  const cloudName = first.cloudName;
  const extension = first.extension || 'mp4';
  const normalizeTransform = 'c_fill,w_1280,h_720';

  if (parsed.length === 1) {
    return `https://res.cloudinary.com/${cloudName}/video/upload/${normalizeTransform}/f_${extension},q_auto:good/${first.publicId}.${extension}`;
  }

  const spliceTransform = parsed
    .slice(1)
    .map((item) => {
      const layerId = toCloudinaryLayerPublicId(item.publicId);
      return `l_video:${layerId},${normalizeTransform},fl_splice`;
    })
    .join('/');

  return `https://res.cloudinary.com/${cloudName}/video/upload/${normalizeTransform}/${spliceTransform}/f_${extension},q_auto:good/${first.publicId}.${extension}`;
}

async function buildSourceBase64Payload(sourceUrl: string): Promise<{
  sourceBase64: string;
  sourceMimeType: string;
} | null> {
  try {
    const response = await fetch(sourceUrl, {
      mode: 'cors',
      credentials: 'omit',
      headers: {
        Accept: 'video/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return null;
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_REMIX_SOURCE_BYTES) {
      return null;
    }

    const sourceBytes = new Uint8Array(await response.arrayBuffer());
    if (sourceBytes.length === 0 || sourceBytes.length > MAX_REMIX_SOURCE_BYTES) {
      return null;
    }

    return {
      sourceBase64: bytesToBase64(sourceBytes),
      sourceMimeType: response.headers.get('content-type') || 'video/mp4',
    };
  } catch {
    return null;
  }
}

export async function remixSceneWithCloudinary(params: {
  sourceUrl: string;
  userId: string;
  targetDurationSeconds: number;
  narrationAudioUrl?: string;
  narrationText?: string;
}): Promise<{
  playbackUrl: string;
  durationMode?: 'none' | 'trim' | 'extend_loop';
}> {
  const requestBody: {
    sourceUrl: string;
    userId: string;
    targetDurationSeconds: number;
    narrationAudioUrl?: string;
    narrationText?: string;
    sourceBase64?: string;
    sourceMimeType?: string;
  } = {
    sourceUrl: params.sourceUrl,
    userId: params.userId,
    targetDurationSeconds: params.targetDurationSeconds,
    narrationAudioUrl: params.narrationAudioUrl,
    narrationText: params.narrationText,
  };

  if (isLikelyBlockedMixSource(params.sourceUrl)) {
    const sourcePayload = await buildSourceBase64Payload(params.sourceUrl);
    if (sourcePayload) {
      requestBody.sourceBase64 = sourcePayload.sourceBase64;
      requestBody.sourceMimeType = sourcePayload.sourceMimeType;
    }
  }

  let { data, error } = await supabase.functions.invoke('cloudinary-process-video', {
    body: requestBody,
  });

  if (
    (error || !data?.success) &&
    !requestBody.sourceBase64 &&
    isLikelyBlockedMixFailure(error?.message || data?.error)
  ) {
    const sourcePayload = await buildSourceBase64Payload(params.sourceUrl);
    if (sourcePayload) {
      requestBody.sourceBase64 = sourcePayload.sourceBase64;
      requestBody.sourceMimeType = sourcePayload.sourceMimeType;

      const retry = await supabase.functions.invoke('cloudinary-process-video', {
        body: requestBody,
      });

      data = retry.data;
      error = retry.error;
    }
  }

  if (error) {
    throw new Error(`Cloudinary remix failed: ${error.message}`);
  }

  if (!data?.success || !data?.cloudinary?.playbackUrl) {
    throw new Error(data?.error || 'Cloudinary remix returned no playback URL');
  }

  return {
    playbackUrl: data.cloudinary.playbackUrl,
    durationMode: data.cloudinary.durationMode as 'none' | 'trim' | 'extend_loop' | undefined,
  };
}

export async function finalizeTemporaryScene(
  scene: CloudinarySceneLike,
  userId: string
): Promise<CloudinarySceneLike> {
  if (!scene.operationName || scene.status !== 'ready' || !scene.error?.includes('Temporary clip ready while we finish processing.')) {
    return scene;
  }

  try {
    const saveResult = await finalizationProvider.saveVideo({
      userId,
      operationName: scene.operationName,
    });

    if (!saveResult?.publicUrl) {
      return scene;
    }

    return {
      ...scene,
      videoUrl: saveResult.publicUrl,
      error: undefined,
      status: 'ready',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/pending/i.test(message)) {
      logger.info('[CinematicService] Scene finalization retry deferred', {
        sceneId: scene.id,
        operationName: scene.operationName,
        error: message,
      });
    }
    return scene;
  }
}
