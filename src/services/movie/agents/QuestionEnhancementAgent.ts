// Step 1 — Question Enhancement Agent.
// Turns a raw user question into a research question (for grounding) and a visual story
// question (the emotional/human framing that drives the cinematic visuals).

import { callMovieLLMJson } from '../core/llm';
import { logger } from '../../../utils/logger';
import { normalizeMovieMode } from '../config/movieModes';
import type { EnhancedQuestion } from '../types';

const SYSTEM_PROMPT = `You transform a user's question into two reframings for a short cinematic explainer video:
1. researchQuestion: a clear, search-optimized question to gather facts, statistics and citations.
2. visualStoryQuestion: a human, emotional, story-driven framing ("Tell the story of...") that gives the video a relatable narrative arc.
3. realismScore: 0-100 — how photojournalistic the visuals should be (100 = real news/people/places
   where authentic photography matters; 0 = abstract/artistic concepts best served by stylized art).
4. proposedMode: the visual style that best fits this topic, one of:
   real (breaking news, sports, politics — authentic photography matters) |
   cinematic (science, space, technology, nature — dramatic film look) |
   cartoon (light news, curiosities, fun facts) |
   pixar (education, kids-friendly explainers) |
   lego (playful builds, engineering, how-things-fit) |
   anime (action, dramatic stories, pop culture) |
   retro80s (nostalgia, music, tech history) |
   meme (viral news, internet culture, absurd situations)
Keep the two questions concise (one sentence each).`;

export async function enhanceQuestion(question: string): Promise<EnhancedQuestion> {
  try {
    const result = await callMovieLLMJson<EnhancedQuestion>(
      SYSTEM_PROMPT,
      `User question: "${question}"`,
      { researchQuestion: 'string', visualStoryQuestion: 'string', realismScore: 'number', proposedMode: 'string' },
      0.5,
    );

    const realismScore = typeof result.realismScore === 'number' ? result.realismScore : undefined;
    return {
      researchQuestion: result.researchQuestion?.trim() || question,
      visualStoryQuestion: result.visualStoryQuestion?.trim() || question,
      realismScore,
      // Fall back on the realism score when the model skips/garbles the mode.
      proposedMode: normalizeMovieMode(result.proposedMode) || ((realismScore ?? 0) >= 50 ? 'real' : 'cinematic'),
    };
  } catch (error) {
    logger.warn('[Movie/QuestionEnhancement] Falling back to raw question', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { researchQuestion: question, visualStoryQuestion: question };
  }
}
