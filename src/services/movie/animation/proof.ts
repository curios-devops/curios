// The critic's contact sheet: before a story is published it plays once, fast and unseen, in this browser
// (the same sandboxed stage the viewer gets), and two pictures of each beat go to the studio as one image.
// A model reading the page's code can't see that a camera move cut a head; a picture shows it.
import { stageDocument, type StageEvent, type StageTheme } from './stage.ts';

const COLUMNS = 4;
const FRAME = { w: 480, h: 270 };
const STAGE = { w: 1280, h: 720 };
const READY_MS = 6000; // a stage that never says ready is shot anyway
const TIMEOUT_MS = 30000;

/** Each beat's pictures sit side by side: an odd column is a beat's middle, the next one its end. */
export function sheetLayout(frames: number) {
  return { w: COLUMNS * FRAME.w, h: Math.ceil(frames / COLUMNS) * FRAME.h, at: (i: number) => ({ x: (i % COLUMNS) * FRAME.w, y: Math.floor(i / COLUMNS) * FRAME.h, beat: Math.floor(i / 2) + 1 }) };
}

function draw(frames: ImageBitmap[]): string {
  const { w, h, at } = sheetLayout(frames.length);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d')!;
  g.font = '600 18px system-ui, sans-serif';
  frames.forEach((frame, i) => {
    const { x, y, beat } = at(i);
    g.drawImage(frame, x, y, FRAME.w, FRAME.h);
    frame.close();
    g.fillStyle = '#000';
    g.fillRect(x, y, 30, 26);
    g.fillStyle = '#fff';
    g.fillText(String(beat), x + 9, y + 20);
  });
  return canvas.toDataURL('image/jpeg', 0.75);
}

/** The contact sheet as a JPEG data URL; null if the stage couldn't be shot (the story then goes out unreviewed). */
export function contactSheet(html: string, theme: StageTheme, beats: number): Promise<string | null> {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('aria-hidden', 'true');
    // In the window, as the twin: browsers stop drawing a cross-origin frame that is off-screen.
    frame.style.cssText = `position:fixed;left:0;top:0;width:${STAGE.w}px;height:${STAGE.h}px;border:0;opacity:0;pointer-events:none;z-index:-10`;
    frame.srcdoc = stageDocument(html, theme);
    let asked = false;
    const shoot = () => {
      if (asked) return;
      asked = true;
      frame.contentWindow?.postMessage({ curios: 1, cmd: 'proof', beats, scale: FRAME.w / STAGE.w }, '*');
    };
    const finish = (sheet: string | null) => {
      clearTimeout(lazy);
      clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
      frame.remove();
      resolve(sheet);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.contentWindow) return;
      const m = e.data as StageEvent & { curios?: number };
      if (!m?.curios) return;
      if (m.ev === 'ready') shoot();
      else if (m.ev === 'proof') { try { finish(draw(m.frames)); } catch { finish(null); } }
    };
    const lazy = setTimeout(shoot, READY_MS);
    const timeout = setTimeout(() => finish(null), TIMEOUT_MS);
    window.addEventListener('message', onMessage);
    document.body.appendChild(frame);
  });
}
