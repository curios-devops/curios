import { logger } from '../../../../utils/logger';
import { env } from '../../../../config/env';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = env.supabase.url;
const SUPABASE_ANON_KEY = env.supabase.anonKey;

// Create Supabase client for edge functions
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface AvatarVideoResult {
  videoUrl: string;
  audioUrl: string;
  videoBlob?: Blob; // For Anam video download
}

type EdgeFunctionErrorPayload = {
  error?: string;
  provider?: string;
  providerStatus?: number;
  providerCode?: string | null;
  providerMessage?: string;
  details?: string;
};

type EdgeFunctionErrorDetails = {
  message: string;
  payload?: EdgeFunctionErrorPayload;
};

/** Decode a base64 string into a Blob */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([byteNumbers], { type: mimeType });
}

async function getEdgeFunctionErrorDetails(error: { message?: string; context?: unknown }): Promise<EdgeFunctionErrorDetails> {
  const baseMessage = error.message || 'Unknown edge function error';
  const context = error.context;

  if (!(context instanceof Response)) {
    return { message: baseMessage };
  }

  try {
    const payload = (await context.clone().json()) as EdgeFunctionErrorPayload;

    if (payload.provider === 'elevenlabs' && payload.providerCode === 'detected_unusual_activity') {
      return {
        message: 'ElevenLabs blocked this account for free-tier usage. Falling back to OpenAI TTS.',
        payload,
      };
    }

    if (payload.provider === 'elevenlabs' && payload.providerMessage) {
      return { message: `ElevenLabs error: ${payload.providerMessage}`, payload };
    }

    if (payload.error) {
      return { message: payload.error, payload };
    }
  } catch {
    try {
      const text = await context.clone().text();
      if (text) {
        return { message: text };
      }
    } catch {
      return { message: baseMessage };
    }
  }

  return { message: baseMessage };
}

function isElevenLabsRestriction(details: EdgeFunctionErrorDetails): boolean {
  return details.payload?.provider === 'elevenlabs' && details.payload?.providerCode === 'detected_unusual_activity';
}

async function invokeTtsFunction(functionName: 'elevenlabs-tts' | 'openai-tts', body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(functionName, { body });

  if (error) {
    const details = await getEdgeFunctionErrorDetails(error);
    logger.error(`❌ [TTS] ${functionName} edge function error`, {
      functionName,
      error: error.message,
      detailedMessage: details.message,
      payload: details.payload,
    });

    const enrichedError = new Error(details.message) as Error & { details?: EdgeFunctionErrorDetails };
    enrichedError.details = details;
    throw enrichedError;
  }

  if (!data || !data.audio) {
    throw new Error(`No audio data received from ${functionName}`);
  }

  return data as { audio: string; size?: number };
}

async function generateAudioUrlWithOpenAI(text: string): Promise<{ audioUrl: string; audioBase64: string }> {
  logger.info('🔁 [OpenAI TTS] Falling back to OpenAI TTS', {
    textLength: text.length,
    method: 'supabase.functions.invoke',
  });

  const data = await invokeTtsFunction('openai-tts', {
    text,
    voice: 'alloy',
  });

  const audioBlob = base64ToBlob(data.audio, 'audio/mpeg');
  const audioUrl = URL.createObjectURL(audioBlob);

  logger.info('✅ [OpenAI TTS] Fallback audio generated successfully', {
    audioBlobSize: audioBlob.size,
    sizeKB: (audioBlob.size / 1024).toFixed(2),
  });

  return { audioUrl, audioBase64: data.audio };
}

/**
 * Generate Anam avatar video using audio from TTS
 * @param audioBase64 - Base64 encoded audio
 * @returns Video URL and video blob from Anam
 */
async function generateAnamAvatar(audioBase64: string): Promise<{ videoUrl: string; videoBlob?: Blob }> {
  try {
    logger.info('🎭 [Anam] Generating avatar video from audio', {
      audioBase64Length: audioBase64.length,
    });

    const { data, error } = await supabase.functions.invoke('anam-avatar', {
      body: { audioBase64 },
    });

    if (error) {
      const details = await getEdgeFunctionErrorDetails(error);
      logger.error('❌ [Anam] Avatar generation failed', {
        error: error.message,
        detailedMessage: details.message,
      });
      throw new Error(details.message);
    }

    if (!data || (!data.videoUrl && !data.video)) {
      throw new Error('No video data received from Anam');
    }

    logger.info('✅ [Anam] Avatar video generated successfully', {
      hasVideoUrl: !!data.videoUrl,
      hasVideoData: !!data.video,
      duration: data.duration,
    });

    // If video is returned as base64, convert to blob
    let videoBlob: Blob | undefined;
    let videoUrl = data.videoUrl || '';

    if (data.video && !data.videoUrl) {
      videoBlob = base64ToBlob(data.video, 'video/mp4');
      videoUrl = URL.createObjectURL(videoBlob);
      logger.info('📹 [Anam] Video converted to blob URL', {
        blobSize: videoBlob.size,
        sizeKB: (videoBlob.size / 1024).toFixed(2),
      });
    }

    return { videoUrl, videoBlob };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('❌ [Anam] Avatar video generation failed', { error: errorMessage });
    throw new Error(`Failed to generate Anam avatar: ${errorMessage}`);
  }
}

/**
 * Generate avatar video with audio using:
 * 1. ElevenLabs TTS (with OpenAI fallback)
 * 2. Anam avatar video generation
 * @param text - The narrative text to convert to speech and avatar
 * @returns Video URL, audio URL, and optional video blob
 */
export async function generateAvatarVideo(text: string): Promise<AvatarVideoResult> {
  let audioBase64: string;
  let audioUrl: string;

  try {
    // Step 1: Generate audio using ElevenLabs TTS
    logger.info('🎬 [TTS Pipeline] Starting audio generation', {
      textLength: text.length,
      provider: 'elevenlabs',
    });

    const data = await invokeTtsFunction('elevenlabs-tts', {
      text,
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
    });

    logger.info('📡 [ElevenLabs] TTS response received');

    audioBase64 = data.audio;
    const audioBlob = base64ToBlob(audioBase64, 'audio/mpeg');
    audioUrl = URL.createObjectURL(audioBlob);

    logger.info('✅ [ElevenLabs] Audio generated successfully', {
      audioBlobSize: audioBlob.size,
      sizeKB: (audioBlob.size / 1024).toFixed(2),
    });

  } catch (error) {
    const maybeDetailedError = error as Error & { details?: EdgeFunctionErrorDetails };

    // Fallback to OpenAI TTS if ElevenLabs fails
    if (maybeDetailedError.details && isElevenLabsRestriction(maybeDetailedError.details)) {
      const result = await generateAudioUrlWithOpenAI(text);
      audioUrl = result.audioUrl;
      audioBase64 = result.audioBase64;
    } else {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ [TTS Pipeline] Audio generation failed', { error: errorMessage });
      throw new Error(`Failed to generate audio: ${errorMessage}`);
    }
  }

  // Step 2: Generate avatar video using Anam
  try {
    const { videoUrl, videoBlob } = await generateAnamAvatar(audioBase64);

    return {
      videoUrl,
      audioUrl,
      videoBlob,
    };

  } catch (error) {
    // If Anam fails, return audio-only result
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.warn('⚠️ [Anam] Avatar generation failed, returning audio-only', { error: errorMessage });

    return {
      videoUrl: '', // No video available
      audioUrl,
    };
  }
}
