// Saving an Animation as a video: the stage is a live page, not a file, so it is recorded in the
// browser while it plays once from the start, in real time — the stage sends a picture per frame
// (stage.ts capture), drawn here with the caption line and the site, and the narrator's voice is
// mixed in. MP4 where the browser records it (Safari, recent Chrome); WebM otherwise (Cloudinary
// converts it to MP4 on upload).

export interface Recording {
  /** The stage's latest picture, with the caption line being said. */
  frame: (bitmap: ImageBitmap, caption: string) => void;
  /** Whether sound is recorded (the audio context started). */
  withSound: boolean;
  /** A narrator line to hear and record (only routed through the recording when it has sound). */
  voice: (audio: HTMLAudioElement) => void;
  /** The frame on screen now, with a play mark: the video's preview picture. */
  poster: () => Promise<Blob | null>;
  stop: () => Promise<Blob>;
}

// One audio context for recordings, started inside the Save tap (iPhone only lets sound start there).
let shared: AudioContext | null = null;
export function unlockRecordingAudio(): void {
  try {
    shared ??= new AudioContext();
    void shared.resume().catch(() => undefined);
  } catch { /* no Web Audio: the video is recorded without sound */ }
}

function pickMime(): string {
  const found = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
  if (!found) throw new Error('This browser cannot record video');
  return found;
}

/** Output size for a player of this shape: 1280 on the long side, even numbers. */
export function videoSize(width: number, height: number): { w: number; h: number } {
  const even = (n: number) => Math.round(n / 2) * 2;
  return width >= height ? { w: 1280, h: even((1280 * height) / width) } : { w: even((1280 * width) / height), h: 1280 };
}

export async function startRecording(w: number, h: number, waitForSound = 1000): Promise<Recording> {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d')!;
  unlockRecordingAudio();
  const audio = shared!;
  await Promise.race([audio.resume(), new Promise((r) => setTimeout(r, waitForSound))]).catch(() => undefined);
  const mix = audio.createMediaStreamDestination();
  // A silent tone keeps sound flowing between lines: an MP4 recorder waits for sound and would stop the picture too.
  const hush = audio.createGain();
  hush.gain.value = 0;
  const tone = audio.createConstantSource();
  tone.connect(hush).connect(mix);
  tone.start();
  const sound = audio.state === 'running' ? mix.stream.getAudioTracks() : []; // no sound rather than no video
  const mime = pickMime();
  const recorder = new MediaRecorder(new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...sound]), { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  recorder.start(1000);

  const unit = Math.min(w, h) / 20;
  return {
    withSound: sound.length > 0,
    frame(bitmap, caption) {
      g.drawImage(bitmap, 0, 0, w, h);
      bitmap.close();
      g.font = `600 ${Math.round(unit * 0.9)}px system-ui, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if (caption) {
        const tw = g.measureText(caption).width + unit;
        g.fillStyle = 'rgba(0,0,0,0.6)';
        g.beginPath();
        g.roundRect((w - tw) / 2, h - unit * 3.2, tw, unit * 1.5, unit * 0.3);
        g.fill();
        g.fillStyle = '#fff';
        g.fillText(caption, w / 2, h - unit * 2.45);
      }
      g.font = `600 ${Math.round(unit * 0.6)}px system-ui, sans-serif`;
      g.textAlign = 'right';
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.fillText('curiosai.com', w - unit * 0.6, unit * 0.8);
    },
    voice(el) {
      if (!sound.length) return; // a stopped context would silence the narrator for the viewer too
      const source = audio.createMediaElementSource(el);
      source.connect(mix);
      source.connect(audio.destination);
    },
    poster() {
      const copy = document.createElement('canvas');
      copy.width = w;
      copy.height = h;
      const p = copy.getContext('2d')!;
      p.drawImage(canvas, 0, 0);
      const r = unit * 2.2;
      p.fillStyle = 'rgba(0,0,0,0.45)';
      p.beginPath();
      p.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      p.fill();
      p.fillStyle = '#fff';
      p.beginPath();
      p.moveTo(w / 2 - r * 0.32, h / 2 - r * 0.45);
      p.lineTo(w / 2 + r * 0.5, h / 2);
      p.lineTo(w / 2 - r * 0.32, h / 2 + r * 0.45);
      p.closePath();
      p.fill();
      return new Promise((resolve) => copy.toBlob(resolve, 'image/jpeg', 0.85));
    },
    stop() {
      return new Promise((resolve) => {
        recorder.onstop = () => { tone.stop(); mix.disconnect(); resolve(new Blob(chunks, { type: mime.split(';')[0] })); };
        recorder.stop();
      });
    },
  };
}
