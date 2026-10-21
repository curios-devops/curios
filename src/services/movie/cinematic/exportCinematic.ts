// Cinematic → one video file to download. The film only exists live in the player (stock clips
// + narration), so it's composed in the browser, free: each chapter's clip is drawn onto a
// 1280×720 canvas with the same captions as the player, its narration plays into the
// recording, and MediaRecorder writes it (mp4 where the browser can, webm otherwise).
// It records in real time, so it takes about as long as the film.
import { tts } from '../audio/paragraphNarrator.ts';
import { levelOf } from '../audio/voiceDirection.ts';
import { captionChunks, captionFit, captionText, chunkAt, type CinematicScene } from './cinematicPlan.ts';

const W = 1280;
const H = 720;
const FPS = 30;
const TITLE_SEC = 1.6;
const GAP_SEC = 0.3;

export interface ExportedFilm {
  blob: Blob;
  extension: 'mp4' | 'webm';
}

function pickMime(): { mime: string; extension: 'mp4' | 'webm' } {
  const options: [string, 'mp4' | 'webm'][] = [
    ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'],
    ['video/mp4', 'mp4'],
    ['video/webm;codecs=vp9,opus', 'webm'],
    ['video/webm', 'webm'],
  ];
  const found = options.find(([m]) => MediaRecorder.isTypeSupported(m));
  if (!found) throw new Error('This browser cannot record video');
  return { mime: found[0], extension: found[1] };
}

function loadClip(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous'; // Pexels allows it — without it the canvas can't be recorded
    v.muted = true;
    v.playsInline = true;
    v.loop = true;
    v.preload = 'auto';
    v.oncanplay = () => resolve(v);
    v.onerror = () => reject(new Error('A clip did not load'));
    v.src = url;
    v.load();
  });
}

/** Draws `img` to cover the frame (like object-fit: cover). */
function cover(g: CanvasRenderingContext2D, v: HTMLVideoElement) {
  const s = Math.max(W / v.videoWidth, H / v.videoHeight);
  const w = v.videoWidth * s;
  const h = v.videoHeight * s;
  g.drawImage(v, (W - w) / 2, (H - h) / 2, w, h);
}

function drawCaption(g: CanvasRenderingContext2D, lines: string[], fontPx: number) {
  g.font = `600 ${fontPx}px Inter, system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lineH = fontPx * 1.35;
  const bottom = H - 48;
  lines.forEach((line, i) => {
    const y = bottom - (lines.length - 1 - i) * lineH;
    const w = g.measureText(line).width + fontPx;
    g.fillStyle = 'rgba(0,0,0,0.72)';
    g.beginPath();
    g.roundRect(W / 2 - w / 2, y - lineH / 2 + 2, w, lineH - 4, 6);
    g.fill();
    g.fillStyle = '#fff';
    g.fillText(line, W / 2, y);
  });
}

export async function exportCinematic(opts: {
  title: string;
  scenes: CinematicScene[];
  voiceId: string;
  gender: 'female' | 'male';
  captions: boolean;
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
}): Promise<ExportedFilm> {
  const { mime, extension } = pickMime();
  const audio = new AudioContext();
  try {
    // Voice and clips for every chapter, all at once.
    const [voices, clips] = await Promise.all([
      Promise.all(opts.scenes.map(async (s) => {
        const { text, gain } = levelOf(s.narration);
        return { buffer: await audio.decodeAudioData(await tts(text, opts.voiceId, opts.gender, opts.signal)), gain };
      })),
      Promise.all(opts.scenes.map((s) => loadClip(s.clip.url))),
    ]);
    if (opts.signal.aborted) throw new DOMException('Aborted', 'AbortError');

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d')!;
    const out = audio.createMediaStreamDestination();
    const stream = new MediaStream([...canvas.captureStream(FPS).getVideoTracks(), ...out.stream.getAudioTracks()]);
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
    const parts: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
    const done = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

    const fit = captionFit(W);
    const total = TITLE_SEC + voices.reduce((t, v) => t + v.buffer.duration + GAP_SEC, 0);
    const startAt = performance.now();
    recorder.start(1000);

    // Title card — repainted every frame: a still canvas emits no frames to the recording.
    await new Promise<void>((resolve) => {
      const t0 = performance.now();
      const frame = () => {
        g.fillStyle = '#000';
        g.fillRect(0, 0, W, H);
        g.fillStyle = '#fff';
        g.font = `600 ${Math.round(fit.fontPx * 1.6)}px Inter, system-ui, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(opts.title, W / 2, H / 2, W * 0.86);
        if ((performance.now() - t0) / 1000 >= TITLE_SEC || opts.signal.aborted) resolve();
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });

    for (let i = 0; i < opts.scenes.length; i++) {
      if (opts.signal.aborted) break;
      const clip = clips[i];
      const { buffer, gain } = voices[i];
      const chunks = captionChunks(captionText(opts.scenes[i].narration), fit.maxChars);
      clip.currentTime = 0;
      await clip.play().catch(() => undefined);
      const src = audio.createBufferSource();
      src.buffer = buffer;
      const level = audio.createGain();
      level.gain.value = gain;
      src.connect(level).connect(out);
      const t0 = performance.now();
      src.start();
      const length = buffer.duration + GAP_SEC;
      await new Promise<void>((resolve) => {
        const frame = () => {
          const elapsed = (performance.now() - t0) / 1000;
          cover(g, clip);
          if (opts.captions && elapsed < buffer.duration) drawCaption(g, chunks[chunkAt(chunks, elapsed, buffer.duration)] ?? [], fit.fontPx);
          opts.onProgress(Math.min(0.99, (performance.now() - startAt) / 1000 / total));
          if (elapsed >= length || opts.signal.aborted) resolve();
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      clip.pause();
    }

    recorder.stop();
    await done;
    if (opts.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    opts.onProgress(1);
    return { blob: new Blob(parts, { type: mime.split(';')[0] }), extension };
  } finally {
    void audio.close().catch(() => undefined);
  }
}

/** Saves the file with the film's title as its name. */
export function saveFilm(film: ExportedFilm, title: string) {
  const name = (title || 'curios-cinematic').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  const url = URL.createObjectURL(film.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name || 'curios-cinematic'}.${film.extension}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
