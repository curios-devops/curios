// FastSearch Controller - Main entry point for fast search functionality
// Single-LLM pipeline architecture for faster search responses

import { executeWebSearch } from './providers/webSearchProvider';
import { searchImages, searchVideos } from './providers/mediaSearchProvider';
import { generateAnswer, generateAnswerStreaming } from './providers/llmProvider';
import { logger } from '../../utils/logger';

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
 * 2. Media search (Tavily images)
 * 3. Single LLM generation with structured output
 *
 * @param request - The search request with query and optional locale
 * @returns FastSearchResponse with answer, sources, media, and follow-ups
 */
export async function executeFastSearch(
  request: FastSearchRequest
): Promise<FastSearchResponse> {
  const { query, locale = 'en' } = request;

  logger.info('FastSearch: Starting search', { query, locale });

  const startTime = Date.now();

  try {
    // Step 1 & 2: Execute web and media searches in parallel
    logger.debug('FastSearch: Executing searches in parallel');

    const [webResults, images, videos] = await Promise.all([
      executeWebSearch(query),
      searchImages(query),
      searchVideos(query)
    ]);

    const searchTime = Date.now() - startTime;
    logger.info('FastSearch: Searches completed', {
      webResultCount: webResults.length,
      imageCount: images.length,
      videoCount: videos.length,
      searchTimeMs: searchTime
    });

    // Step 3: Generate answer with LLM
    logger.debug('FastSearch: Generating answer');

    const llmStartTime = Date.now();
    const { answer, followUps } = await generateAnswer({
      query,
      webResults,
      images,
      videos,
      date: new Date().toISOString().split('T')[0],
      locale
    });

    const llmTime = Date.now() - llmStartTime;
    const totalTime = Date.now() - startTime;

    logger.info('FastSearch: Search completed successfully', {
      totalTimeMs: totalTime,
      searchTimeMs: searchTime,
      llmTimeMs: llmTime,
      answerLength: answer.length,
      followUpCount: followUps.length
    });

    return {
      answer,
      sources: webResults.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet
      })),
      images: images.map(img => ({
        url: img.url,
        title: img.title,
        source: img.source
      })),
      videos: videos.map(v => ({
        url: v.url,
        title: v.title,
        thumbnail: v.thumbnail
      })),
      followUps
    };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error('FastSearch: Search failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query,
      totalTimeMs: totalTime
    });
    throw error;
  }
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
  const { query, locale = 'en' } = request;

  logger.info('FastSearch: Starting streaming search', { query, locale });

  const startTime = Date.now();

  try {
    // Step 1: Execute media searches (images/videos only)
    // Web search is handled by LLM's web_search tool
    logger.debug('FastSearch: Executing media searches in parallel');

    const [images, videos] = await Promise.all([
      searchImages(query),
      searchVideos(query)
    ]);

    const searchTime = Date.now() - startTime;
    logger.info('FastSearch: Media searches completed', {
      imageCount: images.length,
      videoCount: videos.length,
      searchTimeMs: searchTime
    });

    // Step 2: Generate answer with streaming LLM (includes web search via tool)
    logger.debug('FastSearch: Generating answer with streaming + web search');

    const llmStartTime = Date.now();
    const { followUps } = await generateAnswerStreaming({
      query,
      webResults: [], // LLM uses web_search tool instead
      images,
      videos,
      date: new Date().toISOString().split('T')[0],
      locale
    }, onChunk);

    const llmTime = Date.now() - llmStartTime;
    const totalTime = Date.now() - startTime;

    logger.info('FastSearch: Streaming search completed successfully', {
      totalTimeMs: totalTime,
      searchTimeMs: searchTime,
      llmTimeMs: llmTime,
      followUpCount: followUps.length
    });

    return {
      sources: [], // Citations are embedded in answer text with web_search tool
      images: images.map(img => ({
        url: img.url,
        title: img.title,
        source: img.source
      })),
      videos: videos.map(v => ({
        url: v.url,
        title: v.title,
        thumbnail: v.thumbnail
      })),
      followUps
    };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error('FastSearch: Streaming search failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query,
      totalTimeMs: totalTime
    });
    throw error;
  }
}
