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

Return JSON with:
- title: a punchy, shareable title
- description: one-sentence logline
- styleAnchor: a single consistent visual-style sentence (art direction, palette, lens, recurring character/world) that EVERY swipe image must follow
- swipes: array of 5 objects, each with:
  - role: one of core | why | how | data | insight (exactly one of each)
  - title: 2-4 word swipe label
  - narration: 1 short sentence of voiceover (tight, high idea-density — it must fit the swipe's duration when spoken calmly)
  - imagePrompt: a vivid 16:9 still-frame description for an image model (compose the shot; do NOT mention motion)
  - videoPrompt: how this still should animate (camera move, subject motion) for an image-to-video model
  - transitionStyle: one of cut | fade | dissolve | whip
  - durationSeconds: 6, 8 or 10`;

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
}): Promise<{ title: string; description: string; swipes: MovieSwipe[] }> {
  const factLines = params.sources
    .slice(0, 8)
    .map((s) => `- ${s.title}: ${s.snippet}`)
    .join('\n');

  const userPrompt = `Question: ${params.question}
Visual framing: ${params.visualStoryQuestion}

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
      swipes: 'array of { role, title, narration, imagePrompt, videoPrompt, transitionStyle, durationSeconds }',
    },
    0.6,
  );

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
      videoPrompt: swipe.videoPrompt || 'slow cinematic camera movement',
      transitionStyle: swipe.transitionStyle || 'cut',
      durationSeconds: clampDuration(swipe.durationSeconds) || DEFAULT_SWIPE_DURATION,
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
    swipes,
  };
}
