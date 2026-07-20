// FastSearch Controller - Main entry point for fast search functionality
// Single-LLM pipeline architecture for faster search responses

import { executeWebSearch } from './providers/webSearchProvider';
import { searchImages, searchVideos, type ImageResult } from './providers/mediaSearchProvider';
import { generateAnswer, generateAnswerStreaming, extractFollowUps } from './providers/llmProvider';
import { expandQuery } from './deep/queryExpansion';
import { executeDeepRetrieval } from './deep/deepRetrieval';
import { generateDeepAnswerStreaming } from './deep/deepSynthesis';
import { generateHeaderImage } from './providers/imageProvider';
import { logger } from '../../utils/logger';

/**
 * Generate dynamic follow-up questions based on the query
 * These are follow-up queries (deeper dives, next steps) not just related topics
 */
function generateDynamicFollowUps(query: string): string[] {
  const lowerQuery = query.toLowerCase();

  // Person queries - deeper biographical follow-ups
  if (lowerQuery.includes('who is') || lowerQuery.includes('who are')) {
    const subject = query.replace(/who (is|are)/i, '').trim();
    return [
      `${subject} net worth and wealth`,
      `${subject} early life and education`,
      `${subject} biggest controversies`,
      `${subject} recent news and updates`
    ];
  }

  // Concept/Definition queries - deeper understanding
  if (lowerQuery.includes('what is') || lowerQuery.includes('what are')) {
    const subject = query.replace(/what (is|are)/i, '').trim();
    return [
      `${subject} explained simply`,
      `${subject} vs alternatives comparison`,
      `${subject} real world applications`,
      `${subject} pros and cons`
    ];
  }

  // How-to queries - next steps and deeper guidance
  if (lowerQuery.includes('how to') || lowerQuery.includes('how do')) {
    const action = query.replace(/how (to|do)/i, '').trim();
    return [
      `Best tools for ${action}`,
      `${action} step by step guide`,
      `Common mistakes ${action}`,
      `Advanced tips for ${action}`
    ];
  }

  // Why queries - deeper reasoning
  if (lowerQuery.includes('why')) {
    return [
      `${query} explained in detail`,
      `${query} scientific explanation`,
      `${query} historical context`,
      `Different perspectives on ${query}`
    ];
  }

  // Where queries - more locations or alternatives
  if (lowerQuery.includes('where')) {
    return [
      `${query} best options`,
      `${query} alternatives`,
      `${query} detailed guide`,
      `${query} tips and recommendations`
    ];
  }

  // When queries - timing and context
  if (lowerQuery.includes('when')) {
    return [
      `${query} complete timeline`,
      `${query} historical context`,
      `${query} future predictions`,
      `Why ${query.replace(/when/i, '')}`
    ];
  }

  // Generic follow-ups - deeper dives into the topic
  return [
    `${query} in depth analysis`,
    `${query} latest updates 2026`,
    `${query} expert opinions`,
    `${query} future trends`
  ];
}

export interface FastSearchRequest {
  query: string;
  locale?: string;
  /** Buy intent confirmed — route image search straight to Brave, skipping the SerpAPI
   * quota the sponsor products carousel (search-amazon-products) already spent on this
   * same query. See mediaSearchProvider.searchImages for the shared-quota rationale. */
  skipSerpApiImages?: boolean;
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
    source?: string;
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
 * @param onSourcesFound - Optional callback when sources are found (before streaming starts)
 * @returns Promise that resolves when streaming is complete
 */
export async function executeFastSearchStreaming(
  request: FastSearchRequest,
  onChunk: (chunk: string) => void,
  onSourcesFound?: (sources: Array<{ title: string; url: string; snippet: string }>) => void,
  onImagesFound?: (images: Array<{ url: string; title: string; source: string }>) => void
): Promise<Omit<FastSearchResponse, 'answer'>> {
  const { query, locale = 'en', skipSerpApiImages } = request;

  logger.info('FastSearch: Starting streaming search', { query, locale });

  const startTime = Date.now();

  try {
    // Step 1: Execute all searches in parallel (web + media)
    logger.debug('FastSearch: Executing searches in parallel');

    const [allWebResults, images, videos] = await Promise.all([
      executeWebSearch(query),
      searchImages(query, { skipSerpApi: skipSerpApiImages }),
      searchVideos(query)
    ]);

    // Default tier is the "snack": cap to the 5 most relevant sources.
    const webResults = allWebResults.slice(0, 5);

    const searchTime = Date.now() - startTime;
    logger.info('FastSearch: Searches completed', {
      webResultCount: webResults.length,
      imageCount: images.length,
      videoCount: videos.length,
      searchTimeMs: searchTime
    });

    // Notify that sources have been found
    if (onSourcesFound && webResults.length > 0) {
      onSourcesFound(webResults.map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.snippet
      })));
    }

    // Notify that images have been found (parallel loading)
    if (onImagesFound && images.length > 0) {
      onImagesFound(images.map(img => ({
        url: img.url,
        title: img.title,
        source: img.source
      })));
    }

    // Step 2: Generate answer with streaming LLM using search results
    logger.debug('FastSearch: Generating answer with streaming');

    const llmStartTime = Date.now();
    const { followUps } = await generateAnswerStreaming({
      query,
      webResults, // Pass real search results from Tavily/Brave
      images,
      videos,
      date: new Date().toISOString().split('T')[0],
      locale
    }, onChunk);

    const llmTime = Date.now() - llmStartTime;
    const totalTime = Date.now() - startTime;

    // Generate dynamic follow-ups based on query if none provided
    const finalFollowUps = followUps && followUps.length > 0
      ? followUps
      : generateDynamicFollowUps(query);

    logger.info('FastSearch: Streaming search completed successfully', {
      totalTimeMs: totalTime,
      searchTimeMs: searchTime,
      llmTimeMs: llmTime,
      followUpCount: finalFollowUps.length
    });

    return {
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
      followUps: finalFollowUps
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

/**
 * Execute a "👑 Ask Deeper" (Pro) fast search with streaming.
 * Agent-lite pipeline: expand the query into 3 angles → broad parallel retrieval
 * with dedupe/rerank → single structured streaming synthesis → contextual header
 * image (non-blocking). Same return shape as the default streaming path, plus an
 * optional generated header image delivered via onHeaderImage when ready.
 *
 * Gating (Pro Credits) is the caller's responsibility — call this only after
 * requestProAccess() has returned true.
 */
/** Merge image groups in order, dropping repeats by URL. */
function dedupeImagesByUrl(groups: ImageResult[][], cap = 24): ImageResult[] {
  const seen = new Set<string>();
  const out: ImageResult[] = [];
  for (const group of groups) {
    for (const img of group) {
      if (!img?.url || seen.has(img.url)) continue;
      seen.add(img.url);
      out.push(img);
    }
  }
  return out.slice(0, cap);
}

export async function executeDeepFastSearchStreaming(
  request: FastSearchRequest,
  onChunk: (chunk: string) => void,
  onSourcesFound?: (sources: Array<{ title: string; url: string; snippet: string }>) => void,
  onImagesFound?: (images: Array<{ url: string; title: string; source: string }>) => void,
  onHeaderImage?: (url: string) => void
): Promise<Omit<FastSearchResponse, 'answer'> & { headerImage?: string }> {
  const { query, locale = 'en', skipSerpApiImages } = request;

  logger.info('FastSearch[Deep]: Starting Ask Deeper search', { query, locale });

  const startTime = Date.now();

  try {
    // Step A: expand the query into 3 complementary angles.
    const expanded = await expandQuery(query, locale);

    // Step B: broad parallel retrieval + dedupe/rerank. In parallel, re-fetch the
    // ORIGINAL query's images so Ask Deeper expands the gallery instead of
    // replacing it: base images are kept and the expanded-angle ones are added,
    // deduped by URL so nothing repeats or disappears.
    const [{ webResults, images: deepImages, videos }, baseImages] = await Promise.all([
      executeDeepRetrieval(expanded, { skipSerpApiImages }),
      searchImages(query, { skipSerpApi: skipSerpApiImages }).catch(() => [] as ImageResult[]),
    ]);
    const images = dedupeImagesByUrl([baseImages, deepImages]);

    const searchTime = Date.now() - startTime;
    logger.info('FastSearch[Deep]: Retrieval completed', {
      webResultCount: webResults.length,
      baseImageCount: baseImages.length,
      deepImageCount: deepImages.length,
      imageCount: images.length,
      videoCount: videos.length,
      searchTimeMs: searchTime
    });

    if (onSourcesFound && webResults.length > 0) {
      onSourcesFound(webResults.map(r => ({ title: r.title, url: r.url, snippet: r.snippet })));
    }
    if (onImagesFound && images.length > 0) {
      onImagesFound(images.map(img => ({ url: img.url, title: img.title, source: img.source })));
    }

    // Step C: structured streaming synthesis. Accumulate text for follow-ups
    // and the image prompt.
    let fullAnswer = '';
    await generateDeepAnswerStreaming(
      {
        query,
        webResults,
        date: new Date().toISOString().split('T')[0],
        locale
      },
      (chunk: string) => {
        fullAnswer += chunk;
        onChunk(chunk);
      }
    );

    const followUps = extractFollowUps(fullAnswer);

    // Step D: contextual header image (non-blocking; failure just omits it).
    let headerImage: string | undefined;
    if (onHeaderImage) {
      const summary = fullAnswer.replace(/[#*`>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
      const url = await generateHeaderImage(query, summary);
      if (url) {
        headerImage = url;
        onHeaderImage(url);
      }
    }

    logger.info('FastSearch[Deep]: Completed', {
      totalTimeMs: Date.now() - startTime,
      answerLength: fullAnswer.length,
      followUpCount: followUps.length,
      hasHeaderImage: !!headerImage
    });

    return {
      sources: webResults.map(r => ({ title: r.title, url: r.url, snippet: r.snippet })),
      images: images.map(img => ({ url: img.url, title: img.title, source: img.source })),
      videos: videos.map(v => ({ url: v.url, title: v.title, thumbnail: v.thumbnail || '', source: v.source })),
      followUps,
      headerImage
    };
  } catch (error) {
    logger.error('FastSearch[Deep]: Search failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query,
      totalTimeMs: Date.now() - startTime
    });
    throw error;
  }
}
