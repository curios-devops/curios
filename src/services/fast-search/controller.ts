// FastSearch Controller - Main entry point for fast search functionality
// Single-LLM pipeline architecture for faster search responses

export interface FastSearchRequest {
  query: string;
  locale?: string;
}

export interface FastSearchResponse {
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  images: Array<{
    url: string;
    title: string;
    source: string;
  }>;
  videos: Array<{
    url: string;
    title: string;
    thumbnail: string;
  }>;
  followUps: string[];
}

/**
 * Execute a fast search query
 * This is the main controller that orchestrates:
 * 1. Web search (OpenAI tool / Tavily fallback)
 * 2. Media search (SerpAPI)
 * 3. Single LLM generation with structured output
 *
 * @param request - The search request with query and optional locale
 * @returns FastSearchResponse with answer, sources, media, and follow-ups
 */
export async function executeFastSearch(
  request: FastSearchRequest
): Promise<FastSearchResponse> {
  // TODO: Implement in Phase 2
  throw new Error('FastSearch not yet implemented');
}

/**
 * Execute a fast search with streaming support
 * Streams the answer as it's being generated while still returning
 * sources, media, and follow-ups at the end
 *
 * @param request - The search request
 * @param onChunk - Callback for each chunk of the answer
 * @returns Promise that resolves when streaming is complete
 */
export async function executeFastSearchStreaming(
  request: FastSearchRequest,
  onChunk: (chunk: string) => void
): Promise<Omit<FastSearchResponse, 'answer'>> {
  // TODO: Implement in Phase 2
  throw new Error('FastSearch streaming not yet implemented');
}
