// Clips — talk to the video. The director (Luna, fast) answers from the transcript UP TO the
// paused second (never later: no spoilers, like ACTx486) and decides 1-3 shots of 5 s; the
// clip-ask edge function makes them with Pruna from the paused moment.
//   Fiction (film, series, animation): the character on screen answers — Pruna speech + lip-sync.
//   Real people: never invented words in their mouth — the shots illustrate the answer and the
//   Curios narrator reads it.
import { supabase } from '../../../lib/supabase.ts';
import { appSettings } from '../../../config/appSettings.ts';
import { fetchOpenAI } from '../core/llm.ts';
import { transcriptDigest, type Clip } from './clipPlan.ts';

export interface ClipShot {
  /** English motion/scene prompt for Pruna. */
  prompt: string;
  /** Fiction: the words the character says in this shot (≤ ~14, fits 5 s). */
  line: string;
  /** Illustration shots (real people): the new starting still, styled on the paused frame. */
  imagePrompt: string;
}

export interface ClipAnswerPlan {
  answer: string;
  voice: 'character' | 'narrator';
  shots: ClipShot[];
}

const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

/** Keeps a usable answer: 1-3 shots; real people never get a speaking line. */
export function validateAnswer(raw: unknown, fiction: boolean): ClipAnswerPlan | null {
  const r = (raw ?? null) as Record<string, unknown> | null;
  const answer = str(r?.answer, 600);
  if (!r || !answer) return null;
  const voice = fiction && r.voice === 'character' ? 'character' : 'narrator';
  const shots = (Array.isArray(r.shots) ? r.shots : [])
    .map((s) => (s ?? {}) as Record<string, unknown>)
    .map((s) => ({
      prompt: str(s.prompt, 600),
      line: voice === 'character' ? str(s.line, 160) : '',
      imagePrompt: voice === 'narrator' ? str(s.imagePrompt, 600) : '',
    }))
    .filter((s) => s.prompt && (voice === 'character' ? s.line : s.imagePrompt))
    .slice(0, 3);
  return shots.length ? { answer, voice, shots } : null;
}

/** The transcript up to the paused second only. */
export function transcriptUntil(clip: Clip, at: number) {
  return clip.transcript.filter((l) => l.t <= at);
}

export async function directAnswer(clip: Clip, at: number, question: string, scene: string): Promise<ClipAnswerPlan> {
  const heard = transcriptDigest(transcriptUntil(clip, at).slice(-80), 5000);
  const system = clip.fiction
    ? 'The viewer paused a film/series scene and asked a question. The character on screen answers IN the scene, in character ' +
      '(their personality, their way of talking), in the question language, based on what has happened so far and on what the ' +
      'character knows. Really answer: give the reason or the explanation, never restate the question. Write answer (the full reply, ' +
      '≤ 40 words) and split it into ' +
      '1-3 shots of 5 seconds: each shot continues the scene from the paused moment (English prompt: same character, same place, ' +
      'same look, the action and camera) and has line = the words said in that shot (≤ 14 words). voice = "character".'
    : 'The viewer paused a real video (real people) and asked a question. Really answer it — the reason or the explanation, never a ' +
      'restatement — clearly, in the question language (≤ 40 words), ' +
      'based on the video so far and general knowledge. Never put words in the mouth of the real person. voice = "narrator". ' +
      'Split the answer into 1-3 illustration shots of 5 seconds that SHOW the idea (no recognizable real person): imagePrompt = ' +
      'the starting still in the visual style of the paused scene (English), prompt = the motion/camera of the shot (English).';
  const user = `Video: ${clip.title} (${clip.credit})\nOn screen when paused: ${scene || 'unknown'}\nHeard so far:\n${heard || '(nothing yet)'}\n\nQuestion: ${question}\n\n` +
    `Return valid JSON only: {"answer": "string", "voice": "${clip.fiction ? 'character' : 'narrator'}", "shots": [{"prompt": "string", "line": "string", "imagePrompt": "string"}]}`;
  const text = await fetchOpenAI({
    model: appSettings.models.luna,
    reasoning: { effort: 'none' },
    temperature: 0.6,
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  });
  let raw: unknown = null;
  try { raw = JSON.parse(text); } catch { /* invalid JSON → no answer */ }
  const plan = validateAnswer(raw, clip.fiction);
  if (!plan) throw new Error('The director could not answer');
  return plan;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('clip-ask', { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const detail = ctx ? await ctx.json().catch(() => null) : null;
    throw new Error(String((detail as { error?: unknown } | null)?.error ?? error.message));
  }
  return data as T;
}

export interface AskStart { questionId: string; frameUrl: string | null; videoUrl: string | null; scene: string; thumbnail: string }

export const startAsk = (clipId: string, at: number, question: string, frame: string | null, video: string | null) =>
  call<AskStart>({ action: 'start', clipId, at, question, ...(frame ? { frame } : {}), ...(video ? { video } : {}) });

/** One shot; resolves to its video URL (or null when it failed — the others still play). */
export function makeShot(start: AskStart, shot: ClipShot, n: number, speaks: boolean): Promise<string | null> {
  return call<{ videoUrl?: string }>({
    action: 'shot', questionId: start.questionId, n, speaks, prompt: shot.prompt, line: shot.line,
    frameUrl: start.frameUrl, videoUrl: start.videoUrl, scene: start.scene, reference: start.thumbnail,
    ...(shot.imagePrompt ? { imagePrompt: shot.imagePrompt } : {}),
  }).then((r) => r.videoUrl ?? null, () => null);
}

export const recordAsk = (questionId: string, answer: unknown) =>
  call<{ ok: boolean }>({ action: 'record', questionId, answer }).catch(() => undefined);
