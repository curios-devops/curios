// Cinematic → one video file to download. The film only exists live in the player (stock clips
// + narration), so it's composed in the browser, free: each chapter's clip is drawn onto a
// 1280×720 canvas with the same captions as the player, with its narration.
//
// Fast path (WebCodecs, via Mediabunny): the clips are decoded frame by frame and the film is
// encoded to H.264/AAC MP4 as fast as the computer allows — no playback; the voice track is
// mixed offline in an instant. Fallback (no WebCodecs): MediaRecorder records it in real time.
// The voice reuses the narration already generated if the film was played (tts cache).
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

type Voice = { buffer: AudioBuffer; gain: number };
type Opts = {
  title: string;
  scenes: CinematicScene[];
  voiceId: string;
  gender: 'female' | 'male';
  captions: boolean;
  onProgress: (fraction: number) => void;
  signal: AbortSignal;
};

function aborted(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
}

function drawTitle(g: CanvasRenderingContext2D, title: string, fontPx: number) {
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff';
  g.font = `600 ${Math.round(fontPx * 1.6)}px Inter, system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(title, W / 2, H / 2, W * 0.86);
}

export async function exportCinematic(opts: Opts): Promise<ExportedFilm> {
  // Voice (cached if the film was played) and clips for every chapter, all at once.
  const decoder = new OfflineAudioContext(1, 1, 48000);
  const [voices, clipFiles] = await Promise.all([
    Promise.all(opts.scenes.map(async (s): Promise<Voice> => {
      const { text, gain } = levelOf(s.narration);
      // Retried once: a cached line can fail if the player that started it was stopped mid-way.
      const audio = await tts(text, opts.voiceId, opts.gender, opts.signal).catch(() => tts(text, opts.voiceId, opts.gender, opts.signal));
      return { buffer: await decoder.decodeAudioData(audio), gain };
    })),
    Promise.all(opts.scenes.map((s) => fetch(s.clip.url, { signal: opts.signal }).then((r) => {
      if (!r.ok) throw new Error(`clip ${r.status}`);
      return r.blob();
    }))),
  ]);
  aborted(opts.signal);
  try {
    const fast = await encodeFast(opts, voices, clipFiles);
    if (fast) return fast;
  } catch (err) {
    aborted(opts.signal);
    console.warn('[exportCinematic] fast export failed, recording in real time', err);
  }
  return recordRealtime(opts, voices, clipFiles);
}

/** WebCodecs: decode clips frame by frame and encode MP4 faster than real time. Null if unsupported. */
async function encodeFast(opts: Opts, voices: Voice[], clipFiles: Blob[]): Promise<ExportedFilm | null> {
  if (typeof VideoEncoder === 'undefined' || typeof AudioEncoder === 'undefined') return null;
  const mb = await import('mediabunny');
  if (!(await mb.canEncodeVideo('avc', { width: W, height: H })) || !(await mb.canEncodeAudio('aac'))) return null;

  const fit = captionFit(W);
  const step = 1 / FPS;
  const lengths = voices.map((v) => v.buffer.duration + GAP_SEC);
  const totalFrames = Math.round(TITLE_SEC * FPS) + lengths.reduce((n, l) => n + Math.round(l * FPS), 0);

  // The whole voice track, mixed offline (instant): each chapter's line at its start time.
  const rate = 48000;
  const mix = new OfflineAudioContext(1, Math.ceil((totalFrames * step + 0.5) * rate), rate);
  let at = TITLE_SEC;
  voices.forEach((v, i) => {
    const src = mix.createBufferSource();
    src.buffer = v.buffer;
    const level = mix.createGain();
    level.gain.value = v.gain;
    src.connect(level).connect(mix.destination);
    src.start(at);
    at += Math.round(lengths[i] * FPS) * step;
  });
  const voiceTrack = await mix.startRendering();

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }), target: new mb.BufferTarget() });
  const video = new mb.CanvasSource(canvas, { codec: 'avc', bitrate: mb.QUALITY_HIGH, keyFrameInterval: 2 });
  const audio = new mb.AudioBufferSource({ codec: 'aac', bitrate: mb.QUALITY_HIGH });
  output.addVideoTrack(video, { frameRate: FPS });
  output.addAudioTrack(audio);
  await output.start();
  await audio.add(voiceTrack);

  let frame = 0;
  const addFrame = async () => {
    await video.add(frame * step, step);
    frame++;
    if (frame % 15 === 0) opts.onProgress(Math.min(0.99, frame / totalFrames));
  };

  for (let k = 0; k < Math.round(TITLE_SEC * FPS); k++) {
    drawTitle(g, opts.title, fit.fontPx);
    await addFrame();
  }

  for (let i = 0; i < opts.scenes.length; i++) {
    aborted(opts.signal);
    const input = new mb.Input({ source: new mb.BlobSource(clipFiles[i]), formats: mb.ALL_FORMATS });
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error('clip has no video');
    const clipLength = Math.max(0.5, await track.computeDuration());
    const sink = new mb.CanvasSink(track, { width: W, height: H, fit: 'cover', poolSize: 2 });
    const voiceLength = voices[i].buffer.duration;
    const chunks = captionChunks(captionText(opts.scenes[i].narration), fit.maxChars);
    const n = Math.round(lengths[i] * FPS);
    // Short clips loop, like in the player.
    const times = Array.from({ length: n }, (_, k) => (k * step) % clipLength);
    let k = 0;
    for await (const wrapped of sink.canvasesAtTimestamps(times)) {
      if (wrapped) g.drawImage(wrapped.canvas, 0, 0, W, H);
      const t = k * step;
      if (opts.captions && t < voiceLength) drawCaption(g, chunks[chunkAt(chunks, t, voiceLength)] ?? [], fit.fontPx);
      await addFrame();
      k++;
    }
    input.dispose();
  }

  await output.finalize();
  aborted(opts.signal);
  opts.onProgress(1);
  return { blob: new Blob([output.target.buffer!], { type: 'video/mp4' }), extension: 'mp4' };
}

/** Fallback: plays the film into a canvas + audio stream and records it in real time. */
async function recordRealtime(opts: Opts, voices: Voice[], clipFiles: Blob[]): Promise<ExportedFilm> {
  const { mime, extension } = pickMime();
  const audio = new AudioContext();
  const urls = clipFiles.map((b) => URL.createObjectURL(b));
  try {
    const clips = await Promise.all(urls.map((u) => loadClip(u)));
    aborted(opts.signal);

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
        drawTitle(g, opts.title, fit.fontPx);
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
    aborted(opts.signal);
    opts.onProgress(1);
    return { blob: new Blob(parts, { type: mime.split(';')[0] }), extension };
  } finally {
    urls.forEach((u) => URL.revokeObjectURL(u));
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
