// Animation (Video page type): asks the animation-studio edge function for the question's live stage.
// One per question, kept by the server: an animation already made opens at once; a new one is written
// by Luna/Sol/Astra in the background (1-3 minutes) while the page polls.
import { supabase } from '../../../lib/supabase.ts';

export interface Animation {
  question: string;
  kind: 'machine' | 'story' | 'simulation';
  style: string;
  model: string;
  html: string;
}

type Answer = { ready?: boolean; animation?: Animation; left?: number; status?: string; error?: unknown };

async function call(body: Record<string, unknown>): Promise<Answer> {
  const { data, error } = await supabase.functions.invoke('animation-studio', { body });
  if (error) {
    // The function's own error code (sign_in_required, daily_limit…) travels in the response body.
    const ctx = (error as { context?: Response }).context;
    const detail = ctx ? await ctx.json().catch(() => null) : null;
    throw new Error(String((detail as { error?: unknown } | null)?.error ?? error.message));
  }
  return data as Answer;
}

/** The animation already made for this question, or how many new ones the viewer may still make today. */
export async function findAnimation(key: string): Promise<{ animation: Animation | null; making: boolean; left: number }> {
  const a = await call({ action: 'lookup', key });
  return { animation: a.ready && a.animation ? a.animation : null, making: a.status === 'making', left: a.left ?? 1 };
}

/** Starts it (unless it's already being made) and waits until the page is written. */
export async function makeAnimation(key: string, question: string, tier: 'luna' | 'sol' | 'astra', signal: AbortSignal, already = false, kind?: 'simulation'): Promise<Animation> {
  if (!already) {
    const started = await call({ action: 'start', key, question, tier, kind });
    if (started.ready && started.animation) return started.animation;
  }
  for (let i = 0; i < 200 && !signal.aborted; i++) {
    await new Promise((r) => setTimeout(r, i === 0 ? 15000 : 4000));
    if (signal.aborted) break;
    const s = await call({ action: 'status', key }).catch(() => ({ status: 'making' }) as Answer);
    if (s.ready && s.animation) return s.animation;
    if (s.status === 'failed') throw new Error('failed');
  }
  throw new Error(signal.aborted ? 'aborted' : 'The animation took too long');
}
