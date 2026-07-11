// Step 4 — Swipe Set Agent.
// Converts the director's narrative + research into a set of 5 standalone **swipes**:
// 1 core swipe (the direct, viral answer) + 4 secondary swipes (why / how / data / insight).
// Each swipe is a self-contained 10–15s knowledge frame with its own imagePrompt (still
// frame for gpt-image-2) and videoPrompt (motion for LTX). A shared styleAnchor is woven
// into every image prompt so the swipes stay visually coherent.

import { callMovieLLMJson } from '../core/llm';
import { logger } from '../../../utils/logger';
import type { MovieSwipe, MovieSource, SwipeRole } from '../types';

const ROLE_ORDER: SwipeRole[] = ['core', 'why', 'how', 'data', 'insight'];
// Render cost is linear in seconds (GPU frames); 10s max keeps swipes snappy AND cheap.
const DEFAULT_SWIPE_DURATION = 8;

interface RawSwipeSet {
  title: string;
  description: string;
  styleAnchor: string;
  narratorGender?: string;
  swipes: Array<{
    role?: string;
    title: string;
    narration: string;
    imagePrompt: string;
    videoPrompt: string;
    transitionStyle?: string;
    durationSeconds?: number;
  }>;
}

const SYSTEM_PROMPT = `You are a visual-knowledge director creating a viral, swipe-based explainer (think TikTok/Reels, but every swipe answers part of a question).

Produce EXACTLY 5 swipes. Each swipe is a STANDALONE 10–15 second knowledge frame: 1 idea, 1 coherent visual, understandable with no other context. Structure each swipe as: hook/question → simple insight → visual proof → closure ("aha").

The 5 swipes have these roles, in this order:
1. "core"   — the single best, most shareable answer to the question (the hook everything hangs on)
2. "why"    — why it happens / why it matters
3. "how"    — how it works, mechanism or process
4. "data"   — a striking fact, number, comparison or analogy
5. "insight"— the surprising takeaway or "so what"

NARRATION — energetic delivery is mandatory. Every narration line is spoken by a THRILLED expert who can't wait to tell you this — high energy, real passion, punchy cadence. NEVER flat, calm or robotic. Vary the rhythm and land hard on the payoff word. Keep it tight enough to fit the swipe's duration when spoken fast and excited.

ANIMATION — this is video, not a photo slideshow. The PRIMARY motion of every videoPrompt MUST be the subject/scene itself physically moving: describe the concrete action happening inside the frame (e.g. rocket engines igniting with roaring exhaust plumes, billowing smoke, sparks and heat-haze; crowds surging; water churning; flames, steam, hair and cloth moving; machinery turning; particles streaming). Camera movement (a dolly, pan, parallax, rack-focus) may ONLY be layered on top as support — NEVER let camera movement be the whole motion, and NEVER settle for a slow zoom or a static pan. Make it alive and kinetic.

Return JSON with:
- title: a punchy, shareable title
- description: one-sentence logline
- styleAnchor: a single consistent visual-style sentence (art direction, palette, lens, recurring character/world) that EVERY swipe image must follow
- narratorGender: "male" or "female" — pick the ONE voice that best carries THIS topic's authority and emotion, and use that same narrator for all 5 swipes
- swipes: array of 5 objects, each with:
  - role: one of core | why | how | data | insight (exactly one of each)
  - title: 2-4 word swipe label
  - narration: 1 short, high-energy sentence of voiceover (tight, high idea-density, written to be spoken with excitement)
  - imagePrompt: a vivid 16:9 still-frame description for an image model (compose the shot; do NOT mention motion)
  - videoPrompt: the in-frame action that brings this still ALIVE for an image-to-video model (subject motion first, camera move only as support — see ANIMATION rule)
  - transitionStyle: one of cut | fade | dissolve | whip
  - durationSeconds: 6, 8 or 10`;

// Realism band drives how far the animation may stray from what's literally in the frame.
// Mirrors the image-side bands in NanoBananaProvider (docs/Movie/enhaced_refactor.md).
function animationBandRule(realismScore?: number): string {
  if ((realismScore ?? 0) > 80) {
    return `REALISM BAND: REAL (photojournalistic footage). Animate ONLY what genuinely exists in each frame, with physically-plausible motion. Do NOT invent new objects, characters or on-screen text; do NOT regenerate, reshape or lip-sync faces; do NOT generate new bodies. Example: if a rocket sits on the pad, IGNITE its real engines with real exhaust, smoke and heat-haze — never add rockets, people or effects that aren't already there.`;
  }
  if ((realismScore ?? 0) >= 50) {
    return `REALISM BAND: HYBRID (real anchor, creative motion). Keep the real subject authentic, but you may animate the scene dramatically around it.`;
  }
  return `REALISM BAND: FULL_AI (stylized). Full creative freedom — bring the entire scene vividly and dramatically to life.`;
}

function clampDuration(d?: number): number {
  if (!d || d <= 6) return 6;
  if (d <= 8) return 8;
  return 10;
}

function normalizeRole(role: string | undefined, index: number): SwipeRole {
  const r = (role || '').toLowerCase().trim();
  if ((ROLE_ORDER as string[]).includes(r)) return r as SwipeRole;
  return ROLE_ORDER[index] || 'insight';
}

export async function buildSwipeSet(params: {
  question: string;
  visualStoryQuestion: string;
  narrative: string;
  sources: MovieSource[];
  realismScore?: number;
}): Promise<{ title: string; description: string; narratorGender: 'male' | 'female'; swipes: MovieSwipe[] }> {
  const factLines = params.sources
    .slice(0, 8)
    .map((s) => `- ${s.title}: ${s.snippet}`)
    .join('\n');

  const userPrompt = `Question: ${params.question}
Visual framing: ${params.visualStoryQuestion}

${animationBandRule(params.realismScore)}

Narrative:
${params.narrative}

Research facts:
${factLines || '(none)'}`;

  const raw = await callMovieLLMJson<RawSwipeSet>(
    SYSTEM_PROMPT,
    userPrompt,
    {
      title: 'string',
      description: 'string',
      styleAnchor: 'string',
      narratorGender: 'male | female',
      swipes: 'array of { role, title, narration, imagePrompt, videoPrompt, transitionStyle, durationSeconds }',
    },
    0.6,
  );

  const narratorGender: 'male' | 'female' =
    (raw.narratorGender || '').toLowerCase().trim() === 'male' ? 'male' : 'female';
  const styleAnchor = (raw.styleAnchor || '').trim();
  const rawSwipes = Array.isArray(raw.swipes) ? raw.swipes.slice(0, 5) : [];

  if (rawSwipes.length === 0) {
    logger.warn('[Movie/Swipes] LLM returned no swipes');
  }

  // Build swipes, then make sure the core swipe sits first (it's the only auto-rendered one).
  let swipes: MovieSwipe[] = rawSwipes.map((swipe, index) => {
    const role = normalizeRole(swipe.role, index);
    return {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `swipe_${Date.now()}_${index}`,
      order: index,
      role,
      isCore: role === 'core',
      title: swipe.title || `Swipe ${index + 1}`,
      narration: swipe.narration || '',
      // Weave the shared style anchor into every image prompt for cross-swipe consistency.
      imagePrompt: styleAnchor ? `${swipe.imagePrompt}. Consistent style: ${styleAnchor}` : swipe.imagePrompt,
      videoPrompt: swipe.videoPrompt || 'the subject comes alive with vivid, energetic in-frame motion',
      transitionStyle: swipe.transitionStyle || 'cut',
      durationSeconds: clampDuration(swipe.durationSeconds) || DEFAULT_SWIPE_DURATION,
      narratorGender,
      status: 'pending' as const,
    };
  });

  // Guarantee a single core swipe at index 0 even if the model mislabeled.
  if (!swipes.some((s) => s.isCore) && swipes.length > 0) {
    swipes[0] = { ...swipes[0], role: 'core', isCore: true };
  }
  swipes = [
    ...swipes.filter((s) => s.isCore),
    ...swipes.filter((s) => !s.isCore),
  ].map((s, i) => ({ ...s, order: i }));

  return {
    title: raw.title?.trim() || params.question,
    description: raw.description?.trim() || '',
    narratorGender,
    swipes,
  };
}
