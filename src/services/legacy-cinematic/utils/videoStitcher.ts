/**
 * Client-Side Video Stitcher
 * Records sequential video playback into a single MP4 file using MediaRecorder API
 */

interface StitchOptions {
  clips: Array<{ url: string; duration?: number }>;
  onProgress?: (progress: number) => void;
  videoBitrate?: number;
}

/**
 * Stitches multiple video clips into a single video file on the client side
 * Uses Canvas + MediaRecorder API to record sequential playback
 */
export async function stitchVideosClientSide({
  clips,
  onProgress,
  videoBitrate = 5000000, // 5 Mbps
}: StitchOptions): Promise<Blob> {
  if (!clips.length) {
    throw new Error('No clips to stitch');
  }

  // Create offscreen canvas for video composition
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Load first video to get dimensions
  const firstVideo = await loadVideo(clips[0].url);
  canvas.width = firstVideo.videoWidth;
  canvas.height = firstVideo.videoHeight;

  // Create MediaRecorder from canvas stream
  const stream = canvas.captureStream(30); // 30 FPS
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: videoBitrate,
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  // Start recording
  mediaRecorder.start();

  // Play each clip and draw to canvas
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const video = await loadVideo(clip.url);

    // Draw video frames to canvas
    await playVideoToCanvas(video, canvas, ctx);

    // Report progress
    onProgress?.((i + 1) / clips.length * 100);
  }

  // Stop recording
  mediaRecorder.stop();

  // Wait for final data
  const blob = await new Promise<Blob>((resolve, reject) => {
    mediaRecorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: 'video/webm' });
      resolve(finalBlob);
    };
    mediaRecorder.onerror = (error) => {
      reject(new Error(`Recording failed: ${error}`));
    };
  });

  return blob;
}

/**
 * Loads a video element from URL
 */
function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';

    video.onloadedmetadata = () => {
      resolve(video);
    };

    video.onerror = () => {
      reject(new Error(`Failed to load video: ${url}`));
    };

    video.src = url;
  });
}

/**
 * Plays video and draws each frame to canvas
 */
function playVideoToCanvas(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): Promise<void> {
  return new Promise((resolve, reject) => {
    video.onended = () => {
      resolve();
    };

    video.onerror = () => {
      reject(new Error('Video playback failed'));
    };

    // Draw frames to canvas
    const drawFrame = () => {
      if (video.paused || video.ended) {
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      requestAnimationFrame(drawFrame);
    };

    video.play().then(() => {
      drawFrame();
    }).catch(reject);
  });
}

/**
 * Simplified version: Just download all clips individually
 * More reliable than client-side stitching for now
 */
export async function downloadClipsSequentially(
  clips: Array<{ url: string; title?: string }>,
  baseTitle: string = 'cinematic'
): Promise<void> {
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const safeTitle = `${baseTitle}-scene-${i + 1}`;

    try {
      const response = await fetch(clip.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = `${safeTitle}.mp4`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(blobUrl);

      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to download clip ${i + 1}:`, error);
    }
  }
}
