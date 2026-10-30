// Cloud Run job animation-recorder: records one Curios animation as a video, once, for everyone.
// animation-studio runs it with ANIMATION_KEY when an animation (or its "|portrait" version) is ready. It
// opens curiosai.com/render/animation in headless Chrome at the video's size; that page plays the animation
// with the narrator, records it, uploads it and reports to the studio, then sets window.__render. If the
// page can't report (crash, timeout), this job reports the failure itself, so viewers' browsers take over.
import puppeteer from 'puppeteer';

const KEY = process.env.ANIMATION_KEY ?? '';
const SECRET = process.env.RENDER_SECRET ?? '';
const SITE = process.env.SITE || 'https://curiosai.com';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gpfccicfqynahflehpqo.supabase.co';
const ANON = process.env.SUPABASE_ANON_KEY ?? '';
const started = Date.now();

async function failed(error) {
  console.error('render failed', KEY, error);
  await fetch(`${SUPABASE_URL}/functions/v1/animation-studio`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'render_failed', key: KEY, secret: SECRET, error: String(error).slice(0, 300), seconds: Math.round((Date.now() - started) / 1000) }),
  }).catch(() => undefined);
  process.exit(1);
}

if (!KEY || !SECRET) await failed('ANIMATION_KEY and RENDER_SECRET are required');
const portrait = KEY.endsWith('|portrait');
let browser;
try {
  browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 20 * 60 * 1000, // the page's verdict can take minutes; the default (3 min) cuts the wait
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  await page.setViewport(portrait ? { width: 720, height: 1280 } : { width: 1280, height: 720 });
  page.on('console', (m) => { if (m.type() === 'error') console.log('page:', m.text().slice(0, 200)); });
  await page.goto(`${SITE}/render/animation?key=${encodeURIComponent(KEY)}#s=${encodeURIComponent(SECRET)}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__render, { timeout: 15 * 60 * 1000, polling: 1000 });
  const verdict = await page.evaluate(() => window.__render);
  console.log('render', KEY, verdict, `${Math.round((Date.now() - started) / 1000)} s`);
  if (verdict !== 'ok') await failed(verdict);
} catch (e) {
  await failed(e instanceof Error ? e.message : e);
} finally {
  await browser?.close().catch(() => undefined);
}
