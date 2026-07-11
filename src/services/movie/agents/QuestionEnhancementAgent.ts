// Step 1 — Question Enhancement Agent.
// Turns a raw user question into a research question (for grounding) and a visual story
// question (the emotional/human framing that drives the cinematic visuals).

import { callMovieLLMJson } from '../core/llm';
import { logger } from '../../../utils/logger';
import type { EnhancedQuestion } from '../types';

const SYSTEM_PROMPT = `You transform a user's question into two reframings for a short cinematic explainer video:
1. researchQuestion: a clear, search-optimized question to gather facts, statistics and citations.
2. visualStoryQuestion: a human, emotional, story-driven framing ("Tell the story of...") that gives the video a relatable narrative arc.
3. realismScore: 0-100 — how photojournalistic the visuals should be (100 = real news/people/places
   where authentic photography matters; 0 = abstract/artistic concepts best served by stylized art).
Keep the two questions concise (one sentence each).`;

export async function enhanceQuestion(question: string): Promise<EnhancedQuestion> {
  try {
    const result = await callMovieLLMJson<EnhancedQuestion>(
      SYSTEM_PROMPT,
      `User question: "${question}"`,
      { researchQuestion: 'string', visualStoryQuestion: 'string', realismScore: 'number' },
      0.5,
    );

    return {
      researchQuestion: result.researchQuestion?.trim() || question,
      visualStoryQuestion: result.visualStoryQuestion?.trim() || question,
      realismScore: typeof result.realismScore === 'number' ? result.realismScore : undefined,
    };
  } catch (error) {
    logger.warn('[Movie/QuestionEnhancement] Falling back to raw question', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { researchQuestion: question, visualStoryQuestion: question };
  }
}
