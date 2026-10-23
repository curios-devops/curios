// Clips (Video page type): the moment of a real video that answers the question — a film/TV
// scene (find-scene) or a YouTube segment — kept per question by the clip-search edge function.
// The director (LLM) only decides what to look for and which segment answers; the rest is code.
import { supabase } from '../../../lib/supabase.ts';
import { appSettings } from '../../../config/appSettings.ts';
import { fetchOpenAI } from '../core/llm.ts';

export { tourKey as clipKey } from '../tour/tourPlan.ts';

export interface ClipLine { t: number; d: number; text: string }
export interface ClipMoment { t: number; label: string }

export interface Clip {
  id: string;
  question: string;
  source: 'youtube' | 'scene';
  videoId?: string | null;
  videoUrl?: string | null;
  /** The answering segment, in seconds of the video (a scene clip runs 0..duration). */
  start: number;
  end: number;
  title: string;
  credit: string;
  sourceUrl: string;
  thumbnail: string;
  why: string;
  overview: string;
  /** Film / series / animation: its characters may answer in generated clips (real people never). */
  fiction: boolean;
  moments: ClipMoment[];
  transcript: ClipLine[];
  related: { question: string; search?: string }[];
  owned?: boolean;
}

export interface ClipPlan {
  kind: 'scene' | 'video';
  title: string;
  year?: number;
  isSeries: boolean;
  season?: number;
  episode?: number;
  /** An exact line said in the scene (English as released), to find it in the subtitles. */
  quote: string;
  description: string;
  searches: string[];
  overview: string;
  related: { question: string; search: string }[];
}

const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : undefined);
/** Seconds from 95, "95", "1:35" or "0:01:35" (the director writes either). */
export const seconds = (v: unknown): number | undefined =>
  typeof v === 'string' && /^\d+(:\d{1,2}){1,2}(\.\d+)?$/.test(v.trim())
    ? v.trim().split(':').reduce((a, n) => a * 60 + Number(n), 0)
    : typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : num(v);

/** Keeps a usable plan or null. A scene needs a title (or a quote); a video needs searches. */
export function validateClipPlan(raw: unknown, question: string): ClipPlan | null {
  const r = (raw ?? null) as Record<string, unknown> | null;
  if (!r) return null;
  const searches = (Array.isArray(r.searches) ? r.searches : []).map((s) => str(s, 120)).filter(Boolean).slice(0, 2);
  const related = (Array.isArray(r.related) ? r.related : [])
    .map((x) => (typeof x === 'string' ? { question: x, search: '' } : (x ?? {}) as Record<string, unknown>))
    .map((x) => ({ question: str(x.question, 90), search: str(x.search, 60) }))
    .filter((x) => x.question)
    .slice(0, 4);
  const plan: ClipPlan = {
    kind: r.kind === 'scene' ? 'scene' : 'video',
    title: str(r.title, 120),
    year: num(r.year),
    isSeries: r.isSeries === true,
    season: num(r.season),
    episode: num(r.episode),
    quote: str(r.quote, 200),
    description: str(r.description, 300),
    searches: searches.length ? searches : [question.slice(0, 120)],
    overview: str(r.overview, 1200),
    related,
  };
  if (plan.kind === 'scene' && !plan.title && !plan.quote) plan.kind = 'video';
  return plan;
}

const json = async (system: string, user: string): Promise<unknown> => {
  const text = await fetchOpenAI({
    model: appSettings.models.luna,
    reasoning: { effort: 'none' },
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: system }, { role: 'user', content: `${user}\n\nReturn valid JSON only.` }],
  });
  try { return JSON.parse(text); } catch { return null; }
};

export async function planClip(question: string, context: { title: string; snippet: string }[] = []): Promise<ClipPlan> {
  const facts = context.slice(0, 5).map((c, i) => `[${i + 1}] ${c.title}: ${c.snippet.slice(0, 250)}`).join('\n');
  const system =
    'You find the moment of an EXISTING video that answers a question. ' +
    'If the question asks for a scene, line or moment of a film or TV series, kind = "scene": give the exact title as released, ' +
    'year, isSeries (+ season/episode only if sure), and quote = one exact line spoken in that scene in its original English release ' +
    '(the most recognisable one), plus description = what happens visually. Otherwise kind = "video" (explanations, talks, ' +
    'interviews, demos, podcasts, news). Always write searches: 2 YouTube searches that would find the best real video with the answer ' +
    '(a famous clip, lecture or explainer; English unless the topic is local). Also a short overview (2-3 sentences, in the question ' +
    'language) of what the viewer will see and why it answers, and 4 follow-up questions with a 2-4 word English stock-footage search.';
  const keys = {
    kind: '"scene" | "video"', title: 'string', year: 'number?', isSeries: 'boolean', season: 'number?', episode: 'number?',
    quote: 'string', description: 'string', searches: 'string[2]', overview: 'string (question language)',
    related: 'array of 4 { question (question language), search }',
  };
  const raw = await json(system, `${facts ? `Question: ${question}\n\nWeb results:\n${facts}` : `Question: ${question}`}\n\nExpected keys: ${JSON.stringify(keys)}`);
  const plan = validateClipPlan(raw, question);
  if (!plan) throw new Error('The director could not plan this clip');
  return plan;
}

export interface Candidate { videoId: string; title: string; channel: string; thumbnail: string; url: string; transcript: ClipLine[] }

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** The transcript as "[m:ss] text" lines, trimmed to fit the director's prompt. */
export function transcriptDigest(lines: ClipLine[], maxChars = 7000): string {
  let out = '';
  for (const l of lines) {
    const row = `[${mmss(l.t)}] ${l.text}\n`;
    if (out.length + row.length > maxChars) break;
    out += row;
  }
  return out;
}

export interface SegmentPick { videoId: string; start: number; end: number; why: string; moments: ClipMoment[]; fiction: boolean }

/** Keeps a pick inside the chosen video's transcript, 15-120 s long. */
export function validatePick(raw: unknown, candidates: Candidate[]): SegmentPick | null {
  const r = (raw ?? null) as Record<string, unknown> | null;
  const video = candidates.find((c) => c.videoId === r?.videoId) ?? null;
  if (!r || !video) return null;
  const last = video.transcript.length ? video.transcript[video.transcript.length - 1] : null;
  const length = last ? last.t + last.d : Infinity;
  let start = Math.max(0, seconds(r.start) ?? 0);
  let end = seconds(r.end) ?? start + 45;
  if (start >= length) return null;
  if (end - start < 15) end = start + 15;
  if (end - start > 120) end = start + 120;
  end = Math.min(end, length);
  start = Math.max(0, Math.min(start, end - 15));
  const moments = (Array.isArray(r.moments) ? r.moments : [])
    .map((m) => (m ?? {}) as Record<string, unknown>)
    .map((m) => ({ t: seconds(m.t) ?? -1, label: str(m.label, 60) }))
    .filter((m) => m.t >= 0 && m.t < length && m.label)
    .slice(0, 4);
  return { videoId: video.videoId, start, end, why: str(r.why, 300), moments, fiction: r.fiction === true };
}

export async function pickSegment(question: string, candidates: Candidate[]): Promise<SegmentPick> {
  const list = candidates.map((c, i) => `#${i + 1} videoId=${c.videoId} · "${c.title}" · ${c.channel}\n${transcriptDigest(c.transcript, 6000)}`).join('\n\n');
  const system =
    'You pick the ONE segment of a real video that best answers the question, using the timestamped transcripts. ' +
    'Prefer the clearest, most direct explanation; the segment should start just before the answer begins and end when it is complete ' +
    '(20-90 seconds). Also give up to 4 other key moments of the same video (t in seconds, a short label in the question language), ' +
    'why (one sentence, question language) and fiction = true only for films, series, animation or fictional characters.';
  const raw = await json(system, `Question: ${question}\n\nVideos:\n${list}\n\nExpected keys: {"videoId": "string", "start": "number of seconds from the video start", "end": "number of seconds", "why": "string", "moments": [{"t": "number of seconds", "label": "string"}], "fiction": "boolean"}`);
  const pick = validatePick(raw, candidates);
  if (!pick) throw new Error('The director could not pick a segment');
  return pick;
}

type Answer = { ready?: boolean; clip?: Clip; left?: number; state?: unknown; done?: boolean; scene?: Partial<Clip>; failed?: string; candidates?: Candidate[]; error?: unknown };

async function call(body: Record<string, unknown>): Promise<Answer> {
  const { data, error } = await supabase.functions.invoke('clip-search', { body });
  if (error) {
    // The function's own error code (daily_limit…) travels in the response body.
    const ctx = (error as { context?: Response }).context;
    const detail = ctx ? await ctx.json().catch(() => null) : null;
    throw new Error(String((detail as { error?: unknown } | null)?.error ?? error.message));
  }
  return data as Answer;
}

/** The clip already found for this question (free), or how many new ones the viewer may still make today. */
export async function findClip(key: string): Promise<{ clip: Clip | null; left: number }> {
  const a = await call({ action: 'lookup', key });
  return a.ready && a.clip ? { clip: a.clip, left: 0 } : { clip: null, left: a.left ?? 1 };
}

/** find-scene: the edge function advances a step per call (each ≤ ~25 s) until the clip is ours. */
async function findScene(key: string, plan: ClipPlan, signal: AbortSignal): Promise<Partial<Clip> | null> {
  let state: unknown = {
    title: plan.title, year: plan.year, isSeries: plan.isSeries, season: plan.season, episode: plan.episode,
    quote: plan.quote, description: plan.description,
  };
  for (let i = 0; i < 12 && !signal.aborted; i++) {
    const a = await call({ action: 'scene', key, state });
    if (a.done && a.scene) return a.scene;
    if (a.failed || !a.state) return null;
    state = a.state;
  }
  return null;
}

export type ClipStage = 'scene' | 'youtube' | 'picking';

/** Finds the clip (scene first when the director says so, else / then YouTube), picks the segment and keeps it. */
export async function makeClip(
  key: string, question: string, plan: ClipPlan, signal: AbortSignal, onStage?: (s: ClipStage) => void,
): Promise<Clip> {
  const common = { question, overview: plan.overview, related: plan.related };
  if (plan.kind === 'scene') {
    onStage?.('scene');
    const scene = await findScene(key, plan, signal).catch(() => null);
    if (scene?.videoUrl) {
      const saved = await call({ action: 'save', key, clip: { ...scene, ...common, source: 'scene', fiction: true, why: plan.description } });
      if (saved.clip) return saved.clip;
    }
  }
  if (signal.aborted) throw new Error('aborted');
  onStage?.('youtube');
  const found = await call({ action: 'youtube', key, searches: plan.searches });
  const candidates = found.candidates ?? [];
  if (!candidates.length) throw new Error('no_clip');
  onStage?.('picking');
  const pick = await pickSegment(question, candidates);
  const video = candidates.find((c) => c.videoId === pick.videoId)!;
  const saved = await call({
    action: 'save', key,
    clip: {
      ...common, source: 'youtube', videoId: video.videoId, start: pick.start, end: pick.end,
      title: video.title.replace(/\s*-\s*YouTube$/, ''), credit: video.channel, sourceUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`, why: pick.why, fiction: pick.fiction,
      moments: pick.moments, transcript: video.transcript,
    },
  });
  if (!saved.clip) throw new Error('no_clip');
  return saved.clip;
}

/** Links a clip this guest made to the account they've just signed in with. */
export async function claimClip(key: string): Promise<void> {
  await call({ action: 'claim', key });
}

// Clips made as a guest on this device, so signing up can save them to the new account.
const GUEST_CLIPS = 'curios_guest_clips';
export function guestClips(): string[] {
  try { return JSON.parse(localStorage.getItem(GUEST_CLIPS) || '[]') as string[]; } catch { return []; }
}
export function rememberGuestClip(key: string, keep = true) {
  const list = guestClips().filter((k) => k !== key);
  if (keep) list.push(key);
  try { localStorage.setItem(GUEST_CLIPS, JSON.stringify(list.slice(-20))); } catch { /* storage blocked */ }
}
