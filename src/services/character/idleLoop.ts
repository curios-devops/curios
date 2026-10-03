// "Waiting" loop: records a few seconds of the live presenter while it listens
// (not speaking) so that, after the idle pause closes the paid session, the
// stage keeps a short muted loop instead of a frozen frame — it feels like the
// presenter is still waiting for the next question. Free: recorded locally.
//
// Goes through a canvas (video → canvas → captureStream) because iOS Safari
// has no HTMLVideoElement.captureStream.

const PREFERRED_TYPES = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

export function canRecordLoop(): boolean {
  return typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' &&
    'captureStream' in HTMLCanvasElement.prototype;
}

/** Record `ms` of `video` (silent). Resolves to an object URL, or null if unsupported/failed. */
export function recordLoop(video: HTMLVideoElement, ms = 6000, fps = 20): Promise<string | null> {
  if (!canRecordLoop() || !video.videoWidth) return Promise.resolve(null);
  const type = PREFERRED_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
  if (!type) return Promise.resolve(null);

  // Cap the size: a loop doesn't need full resolution.
  const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);

  return new Promise((resolve) => {
    let raf = 0;
    const draw = () => {
      try { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); } catch { /* frame not ready */ }
      raf = requestAnimationFrame(draw);
    };
    draw();
    const recorder = new MediaRecorder(canvas.captureStream(fps), { mimeType: type, videoBitsPerSecond: 1_500_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      cancelAnimationFrame(raf);
      resolve(chunks.length ? URL.createObjectURL(new Blob(chunks, { type })) : null);
    };
    recorder.onerror = () => { cancelAnimationFrame(raf); resolve(null); };
    recorder.start();
    setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop(); }, ms);
  });
}
