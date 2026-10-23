// Clips: the paused moment as a starting point for the generated answer.
//   Our MP4 (a film/TV scene): the frame straight from the <video>, and its last 5 s cut in the
//   browser (Mediabunny) — find-scene's watermark sits in the top 10 %, so both are cropped below it.
//   YouTube: its player's pixels can't be read by the page. The server cuts the 5 s before the pause
//   into our storage (Tunelio / VidKraken) and its last frame is read here; else, on desktop, the
//   viewer can share this tab once (getDisplayMedia); otherwise the server recreates the frame.

/** find-scene stamps its name in the top-left corner: keep a 16:9 region below it. */
export function belowWatermark(width: number, height: number) {
  const h = Math.round(height * 0.9);
  const w = Math.min(width, Math.round((h * 16) / 9));
  return { left: Math.round((width - w) / 2), top: height - h, width: w, height: h };
}

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]+,/, ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

function jpeg(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? toBase64(b).then(resolve, reject) : reject(new Error('no frame'))), 'image/jpeg', 0.88));
}

/** The frame on screen in our own <video> (same-origin storage, so the canvas isn't tainted). */
export function videoFrame(video: HTMLVideoElement, cropWatermark: boolean): Promise<string> {
  const r = cropWatermark ? belowWatermark(video.videoWidth, video.videoHeight) : { left: 0, top: 0, width: video.videoWidth, height: video.videoHeight };
  const canvas = document.createElement('canvas');
  canvas.width = r.width;
  canvas.height = r.height;
  canvas.getContext('2d')!.drawImage(video, r.left, r.top, r.width, r.height, 0, 0, r.width, r.height);
  return jpeg(canvas);
}

/** The frame at `at` (Infinity = the last one) of a video URL, decoded with Mediabunny. */
export async function frameAt(url: string, at: number): Promise<string | null> {
  try {
    const { ALL_FORMATS, CanvasSink, Input, UrlSource } = await import('mediabunny');
    const input = new Input({ source: new UrlSource(url), formats: ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track) return null;
    const time = Number.isFinite(at) ? at : Math.max(0, (await track.computeDuration()) - 0.1);
    const sink = new CanvasSink(track, { width: Math.min(1280, track.displayWidth) });
    let image: string | null = null;
    const read = (async () => {
      for await (const wrapped of sink.canvasesAtTimestamps([time])) {
        if (!wrapped) continue;
        const c = wrapped.canvas;
        const blob = c instanceof HTMLCanvasElement
          ? await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.88))
          : await c.convertToBlob({ type: 'image/jpeg', quality: 0.88 });
        image = blob ? await toBase64(blob) : null;
        break;
      }
    })();
    await Promise.race([read, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))]);
    input.dispose();
    return image;
  } catch {
    return null;
  }
}

/** The `seconds` before `at` of an MP4, as a 720p MP4 (base64). Null if the browser can't. */
export async function lastSeconds(url: string, at: number, seconds: number, cropWatermark: boolean): Promise<string | null> {
  if (at < 1.5) return null;
  try {
    const { ALL_FORMATS, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, UrlSource } = await import('mediabunny');
    const input = new Input({ source: new UrlSource(url), formats: ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track) return null;
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
    const conversion = await Conversion.init({
      input, output,
      trim: { start: Math.max(0, at - seconds), end: at },
      video: { ...(cropWatermark ? { crop: belowWatermark(track.displayWidth, track.displayHeight) } : {}), height: 720 },
    });
    if (!conversion.isValid) return null;
    await Promise.race([conversion.execute(), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))]);
    const buffer = output.target.buffer;
    input.dispose();
    return buffer ? await toBase64(new Blob([buffer], { type: 'video/mp4' })) : null;
  } catch {
    return null;
  }
}

// ── Screen capture (desktop): one permission per page, kept while the viewer asks questions ──
let shared: { stream: MediaStream; video: HTMLVideoElement } | null = null;

/** Desktop browsers that can share this tab (phones can't). */
export function canCaptureScreen(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia)
    && !window.matchMedia('(pointer: coarse)').matches;
}

/** The region of `el` on screen right now, from the shared tab (asks permission the first time). */
export async function screenRegion(el: Element): Promise<string | null> {
  if (!canCaptureScreen()) return null;
  try {
    if (!shared || shared.stream.getVideoTracks()[0]?.readyState !== 'live') {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser', frameRate: 5 }, audio: false,
        // Chrome: offer this tab first and keep the page from asking about other windows.
        preferCurrentTab: true, selfBrowserSurface: 'include',
      } as DisplayMediaStreamOptions);
      const video = document.createElement('video');
      video.muted = true;
      video.srcObject = stream;
      await video.play();
      shared = { stream, video };
      stream.getVideoTracks()[0].addEventListener('ended', () => { shared = null; });
    }
    await new Promise((r) => setTimeout(r, 300)); // the paused frame reaches the capture
    const { video } = shared;
    const scale = video.videoWidth / window.innerWidth;
    const rect = el.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(rect.width * scale);
    canvas.height = Math.round(rect.height * scale);
    canvas.getContext('2d')!.drawImage(video, rect.left * scale, rect.top * scale, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    return await jpeg(canvas);
  } catch {
    return null; // declined or unsupported → the server recreates the frame
  }
}

export function stopScreenCapture() {
  shared?.stream.getTracks().forEach((t) => t.stop());
  shared = null;
}
