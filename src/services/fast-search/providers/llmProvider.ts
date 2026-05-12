// LLM Provider - Handles single-pass LLM generation with openai-mini

import type { WebSearchResult } from './webSearchProvider';
import type { ImageResult, VideoResult } from './mediaSearchProvider';

export interface SearchContext {
  query: string;
  webResults: WebSearchResult[];
  images: ImageResult[];
  videos: VideoResult[];
  date: string;
  locale: string;
}

export interface LLMResponse {
  answer: string;
  followUps: string[];
}

/**
 * Generate structured answer using openai-mini in a single pass
 * Takes search context and returns formatted answer with follow-ups
 *
 * @param context - The complete search context
 * @returns LLM response with answer and follow-up questions
 */
export async function generateAnswer(
  context: SearchContext
): Promise<LLMResponse> {
  // TODO: Implement in Phase 3
  // Use openai-mini for generation
  // Single-pass structured output
  throw new Error('LLM generation not yet implemented');
}

/**
 * Generate answer with streaming support
 * Streams the answer as it's being generated
 *
 * @param context - The search context
 * @param onChunk - Callback for each chunk
 * @returns Follow-up questions after streaming completes
 */
export async function generateAnswerStreaming(
  context: SearchContext,
  onChunk: (chunk: string) => void
): Promise<{ followUps: string[] }> {
  // TODO: Implement in Phase 3
  throw new Error('Streaming generation not yet implemented');
}
