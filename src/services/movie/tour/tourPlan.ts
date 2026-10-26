// 360 Tour (Video page type): the question becomes a place you can stand in and walk around —
// a Viggle scene (360° panorama + Gaussian-splat 3D scene, ~20 s, $0.06) built by the
// viggle-scene edge function, which also keeps every tour per question so it's made only once.
// The director (LLM) only picks the place and writes the words; everything else is code.
import { supabase } from '../../../lib/supabase.ts';
import { appSettings } from '../../../config/appSettings.ts';
import { fetchOpenAI } from '../core/llm.ts';
import { pickVoice } from '../../character/voices.ts';
import { VOICE_DIRECTION_GUIDE } from '../audio/voiceDirection.ts';

export interface TourPlan {
  title: string;
  /** English scene prompt for Viggle (≤ 1000 chars). */
  prompt: string;
  overview: string;
  related: string[];
  relatedSearch: string[];
}

export interface Tour {
  question: string;
  title: string;
  overview: string;
  related: { question: string; search?: string }[];
  spzUrl: string;
  panoramaUrl: string;
  /** Linked to an account (a guest's tour isn't until they sign up and claim it). */
  owned?: boolean;
  /** Immersion: the people of this world (empty until the cast is made). */
  cast?: CastMember[];
}

export interface CastMember {
  name: string;
  role: string;
  /** One line, like "Experience the town through the eyes of a tavern regular." */
  tagline: string;
  voiceId: string;
  gender: 'female' | 'male';
  /** What they say to whoever comes close, in character (ElevenLabs v4 delivery tags allowed). */
  lines: string[];
  /** Transparent full-body cutout, stood in the 3D world. */
  bodyUrl: string;
  /** Transparent first-person hands, shown when you explore as them. */
  handsUrl?: string | null;
}

export interface CastPlan {
  name: string;
  role: string;
  tagline: string;
  look: string;
  hands: string;
  gender: 'female' | 'male';
  age: string;
  vibe: string;
  lines: string[];
}

/** Keeps 3-6 usable characters with distinct names. */
export function validateCast(raw: unknown): CastPlan[] {
  const list = (raw as { characters?: unknown } | null)?.characters;
  const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
  const out: CastPlan[] = [];
  for (const c of Array.isArray(list) ? list : []) {
    const r = (c ?? {}) as Record<string, unknown>;
    const name = str(r.name, 40);
    const lines = (Array.isArray(r.lines) ? r.lines : []).map((l) => str(l, 300)).filter(Boolean).slice(0, 4);
    if (!name || !str(r.look, 500) || !lines.length || out.some((x) => x.name.toLowerCase() === name.toLowerCase())) continue;
    out.push({
      name, role: str(r.role, 60), tagline: str(r.tagline, 160), look: str(r.look, 500), hands: str(r.hands, 400),
      gender: r.gender === 'male' ? 'male' : 'female', age: str(r.age, 20), vibe: str(r.vibe, 60), lines,
    });
  }
  return out.slice(0, 6);
}

/**
 * Immersion: the director peoples the world — 3 to 6 characters who belong there, each a way to
 * experience it (XGEN's "lenses"), with their own voice and a few lines said to the visitor.
 */
export async function planCast(tour: Pick<Tour, 'question' | 'title' | 'overview'>, scenePrompt = ''): Promise<CastPlan[]> {
  const system =
    'You are the director of an immersive world. Create 3 to 6 characters who naturally belong in this place (era, culture, trade), ' +
    'each a different way to experience it — like a coachman, a baker, an elder, a musician in a frontier town. For each: name, role ' +
    '(question language), tagline (one sentence ENTIRELY in the question language, e.g. in Spanish "Vive el pueblo a través de los ojos de …"), look (English, ' +
    'full-body appearance: age, clothes, build — for an image), hands (English: the one object their hands hold, seen in first person — ' +
    'a tool, an instrument, a cup; never a surface, wall or scene), ' +
    'gender (female|male), age (young|middle_aged|old), vibe (2-3 English words for their voice), and 3 lines (question language) ' +
    'they say to a visitor who walks up: in character, vivid, about this place and their life in it, each ≤ 25 words; they can mention ' +
    'the other characters. Make them distinct and entertaining.\n' + VOICE_DIRECTION_GUIDE;
  const text = await fetchOpenAI({
    model: appSettings.models.luna,
    reasoning: { effort: 'none' },
    temperature: 0.8,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Question: ${tour.question}\nWorld: ${tour.title}. ${tour.overview}\n${scenePrompt ? `Scene: ${scenePrompt}\n` : ''}\nReturn valid JSON only: {"characters": [{"name","role","tagline","look","hands","gender","age","vibe","lines": ["…"]}]}` },
    ],
  });
  let raw: unknown = null;
  try { raw = JSON.parse(text); } catch { /* invalid JSON → no cast */ }
  const cast = validateCast(raw);
  if (cast.length < 2) throw new Error('The director could not cast this world');
  return cast;
}

/** Each character gets a voice of their own (never shared), by gender, age and vibe. */
export function castVoices(cast: Pick<CastPlan, 'gender' | 'age' | 'vibe'>[]): string[] {
  const taken: string[] = [];
  return cast.map((c) => {
    const id = pickVoice({ gender: c.gender, age: c.age, vibe: c.vibe }, taken);
    taken.push(id);
    return id;
  });
}

/** One tour per question: case, spacing and punctuation don't make a new one. */
export function tourKey(question: string): string {
  return question.toLowerCase().normalize('NFC').replace(/[¿?¡!.,;:"'«»()]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
}

/** Keeps a usable plan or null (the page then shows the failure). */
export function validateTourPlan(raw: unknown): TourPlan | null {
  const r = raw as { title?: unknown; scene?: unknown; overview?: unknown; related?: unknown } | null;
  if (!r || typeof r.scene !== 'string' || r.scene.trim().length < 20) return null;
  let related = r.related;
  if (typeof related === 'string') { try { related = JSON.parse(related); } catch { related = []; } }
  const follow = (Array.isArray(related) ? related : [])
    .map((x) => (typeof x === 'string' ? { question: x, search: '' } : (x ?? {}) as { question?: unknown; search?: unknown }))
    .filter((x): x is { question: string; search: unknown } => typeof x.question === 'string' && x.question.trim().length > 0)
    .slice(0, 4);
  return {
    title: typeof r.title === 'string' ? r.title.trim().slice(0, 90) : '',
    prompt: r.scene.trim().slice(0, 1000),
    overview: typeof r.overview === 'string' ? r.overview.trim().slice(0, 1200) : '',
    related: follow.map((x) => x.question.trim().slice(0, 90)),
    relatedSearch: follow.map((x) => (typeof x.search === 'string' ? x.search.trim().slice(0, 60) : '')),
  };
}

export async function planTour(question: string, context: { title: string; snippet: string }[] = []): Promise<TourPlan> {
  const facts = context.slice(0, 6).map((c, i) => `[${i + 1}] ${c.title}: ${c.snippet.slice(0, 300)}`).join('\n');
  const system =
    'You are a location scout for an immersive 360° tour. Pick the ONE place that best answers the question — ' +
    'somewhere the viewer can stand and look around (a square, a room, a landscape, a street, an interior, a site at a given time). ' +
    'Write the scene prompt in English, 60-140 words: where exactly the viewer stands at eye level, what surrounds them in every ' +
    'direction (ahead, sides, behind, above, the ground), materials, lighting, time of day and era when it matters. ' +
    'Concrete and visual only: no text, signs, logos or close-up people; no camera words. ' +
    'Also write a short overview (2-4 sentences, in the question language) of what the viewer is looking at and why it matters, ' +
    'and 4 follow-up questions the viewer may want to explore next, each with a 2-4 word English stock-footage search. ' +
    'When web results are given, base the facts on them.';
  const keys = {
    title: 'string: short tour title in the question language',
    scene: 'string: the English scene prompt',
    overview: 'string: 2-4 sentences in the question language',
    related: 'array of 4 objects { question: string in the question language, search: 2-4 concrete English words }',
  };
  // A short, well-defined plan: the fast tier without reasoning writes it in ~5 s (Sol took 10-19 s).
  const text = await fetchOpenAI({
    model: appSettings.models.luna,
    reasoning: { effort: 'none' },
    temperature: 0.5,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `${facts ? `Question: ${question}\n\nWeb results:\n${facts}` : `Question: ${question}`}\n\nReturn valid JSON only. Expected keys: ${JSON.stringify(keys)}` },
    ],
  });
  let raw: unknown = null;
  try { raw = JSON.parse(text); } catch { /* invalid JSON → no plan */ }
  const plan = validateTourPlan(raw);
  if (!plan) throw new Error('The director could not pick a place for this tour');
  return plan;
}

type Answer = { ready?: boolean; tour?: Tour; left?: number; taskId?: string; meta?: string; status?: string; error?: unknown };

async function call(body: Record<string, unknown>): Promise<Answer> {
  const { data, error } = await supabase.functions.invoke('viggle-scene', { body });
  if (error) {
    // The function's own error code (sign_in_required, daily_limit…) travels in the response body.
    const ctx = (error as { context?: Response }).context;
    const detail = ctx ? await ctx.json().catch(() => null) : null;
    throw new Error(String((detail as { error?: unknown } | null)?.error ?? error.message));
  }
  return data as Answer;
}

/**
 * The tour already made for this question (free), or how many new tours the viewer may still
 * make today — checked before a credit is charged.
 */
export async function findTour(key: string): Promise<{ tour: Tour | null; left: number }> {
  const a = await call({ action: 'lookup', key });
  return a.ready && a.tour ? { tour: a.tour, left: 0 } : { tour: null, left: a.left ?? 1 };
}

/** Makes a new tour (signed-in; the caller has charged the Pro Credit) and waits until it's ready. */
export async function makeTour(key: string, question: string, plan: TourPlan, signal: AbortSignal): Promise<Tour> {
  const started = await call({
    action: 'create', key, question, prompt: plan.prompt, title: plan.title, overview: plan.overview,
    related: plan.related.map((q, i) => ({ question: q, search: plan.relatedSearch[i] || '' })),
  });
  if (!started.taskId) throw new Error('Viggle did not start the scene');
  for (let i = 0; i < 90 && !signal.aborted; i++) {
    await new Promise((r) => setTimeout(r, i === 0 ? 8000 : 3000));
    const s = await call({ action: 'status', key, taskId: started.taskId, meta: started.meta });
    if (s.ready && s.tour) return s.tour;
    if (s.status && s.status !== 'queued' && s.status !== 'processing') throw new Error(`Viggle scene ${s.status}`);
  }
  throw new Error(signal.aborted ? 'aborted' : 'The tour took too long');
}

/** Makes the cast's images once per tour (the server keeps it) and returns the tour with its cast. */
export async function makeCast(key: string, cast: CastPlan[]): Promise<Tour> {
  const voices = castVoices(cast);
  const a = await call({ action: 'cast', key, cast: cast.map((c, i) => ({ ...c, voiceId: voices[i] })) });
  if (!a.tour) throw new Error('no cast');
  return a.tour;
}

/** Links a tour this guest made to the account they've just signed in with. */
export async function claimTour(key: string): Promise<void> {
  await call({ action: 'claim', key });
}

// Tours made as a guest on this device, so signing up can save them to the new account.
const GUEST_TOURS = 'curios_guest_tours';
export function guestTours(): string[] {
  try { return JSON.parse(localStorage.getItem(GUEST_TOURS) || '[]') as string[]; } catch { return []; }
}
export function rememberGuestTour(key: string, keep = true) {
  const list = guestTours().filter((k) => k !== key);
  if (keep) list.push(key);
  try { localStorage.setItem(GUEST_TOURS, JSON.stringify(list.slice(-20))); } catch { /* storage blocked */ }
}
