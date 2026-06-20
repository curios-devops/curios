import { SearchResponse } from '../../../commonApp/types/index';
import { SearchRetrieverAgent } from './agents/searchRetrieverAgent.ts';
import { SearchWriterAgent, StreamingCallback } from './agents/searchWriterAgent.ts';
import { logger } from '../../../utils/logger.ts';
import { detectShoppingIntent } from '../../shopping-intent.ts';
import { searchAmazonProducts, AmazonProduct } from '../../amazon-api.ts';

function normalizeUrl(url: string): string {
  if (!url) return '#';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('www.')) return 'https://' + url;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(:\d+)?(\/|$)/i.test(url)) return 'https://' + url;
  return url;
}

export class SearchError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'SearchError';
  }
}

interface RegularSearchOptions {
  onStatusUpdate?: (status: string) => void;
  imageUrls?: string[]; // Public URLs of images for reverse image search
}

export interface StreamingSearchOptions extends RegularSearchOptions {
  onContentChunk?: StreamingCallback; // Callback for streaming content chunks
  onSourcesFound?: (sources: string[]) => void; // Callback when sources are found
}

// Initialize agents for regular search
const retrieverAgent = new SearchRetrieverAgent();
const writerAgent = new SearchWriterAgent();

/**
 * Regular Search Service - Ultra-simplified direct flow
 * Query → Brave Search → Writer → Results
 * 
 * NO Pro features, NO SwarmController, NO BaseAgent, NO complexity
 * Just simple, fast, direct search for standard tier users
 */
export async function performRegularSearch(
  query: string,
  options: RegularSearchOptions = {}
): Promise<SearchResponse> {
  try {
    const { onStatusUpdate, imageUrls } = options;
    
    // Validate: need either query text OR images
    const hasQuery = query && query.trim().length > 0;
    const hasImages = imageUrls && imageUrls.length > 0;
    
    if (!hasQuery && !hasImages) {
      throw new SearchError('Search query or images required');
    }
    
    // For image-only searches, pass empty string (writer will detect and handle)
    const effectiveQuery = hasQuery ? query : '';

    console.log('🔍 [REGULAR SEARCH] Starting direct search flow:', {
      query: effectiveQuery,
      hasImages,
      imageCount: imageUrls?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    // Shopping intent detection (parallel, non-blocking)
    let shoppingProductsPromise: Promise<AmazonProduct[]> | null = null;
    if (hasQuery && !hasImages) {
      // Only detect shopping for text queries, not image searches
      console.log('🛍️ [SHOPPING] Checking shopping intent for query:', query);
      const intentResult = detectShoppingIntent(query);
      console.log('🛍️ [SHOPPING] Intent detection:', {
        isShoppingIntent: intentResult.isShoppingIntent,
        confidence: intentResult.confidence,
        method: intentResult.detectionMethod,
        matchedTerms: intentResult.matchedTerms
      });
      
      if (intentResult.isShoppingIntent && intentResult.confidence >= 40) {
        // Fetch products in parallel (don't block main search)
        console.log('🛍️ [SHOPPING] Starting product search in parallel...');
        shoppingProductsPromise = searchAmazonProducts(query, 4)
          .then(result => {
            console.log('🛍️ [SHOPPING] Product search completed:', {
              success: result.success,
              productsCount: result.products.length
            });
            return result.success ? result.products : [];
          })
          .catch(error => {
            console.error('🛍️ [SHOPPING] Product search failed:', error);
            return []; // Fail silently, don't break main search
          });
      } else {
        console.log('🛍️ [SHOPPING] No shopping intent detected or confidence too low');
      }
    } else {
      console.log('🛍️ [SHOPPING] Skipping shopping detection (image search or no query)');
    }
    
    try {
      // Step 1: Get search results (direct Brave/Apify call)
      onStatusUpdate?.('Finding relevant information...');
      console.log('🔍 [REGULAR SEARCH] Calling RetrieverAgent.execute()');
      const searchResponse = await retrieverAgent.execute(effectiveQuery, onStatusUpdate, imageUrls);
      console.log('🔍 [REGULAR SEARCH] RetrieverAgent.execute() completed:', {
        success: searchResponse.success,
        hasData: !!searchResponse.data,
        resultsCount: searchResponse.data?.results?.length || 0
      });
      
      if (!searchResponse.success || !searchResponse.data) {
        console.error('❌ [REGULAR SEARCH] Search retrieval failed');
        throw new Error('Search retrieval failed');
      }
      
      console.log('✅ [REGULAR SEARCH] Search retrieval SUCCESS');

      // Step 2: Generate article (direct OpenAI call via Supabase)
      onStatusUpdate?.('Writing answer...');
      console.log('🔍 [REGULAR SEARCH] Starting WriterAgent.execute()');
      const researchData = {
        query: effectiveQuery,
        perspectives: [], // Regular search has no perspectives
        results: searchResponse.data.results || [],
        images: searchResponse.data.images || [],
        videos: searchResponse.data.videos || [],
        isReverseImageSearch: searchResponse.data.isReverseImageSearch || false // Pass flag to Writer
      };

      console.log('🔍 [REGULAR SEARCH] Calling WriterAgent with:', {
        query: researchData.query,
        resultsCount: researchData.results.length,
        imagesCount: researchData.images.length,
        videosCount: researchData.videos.length,
        isReverseImageSearch: researchData.isReverseImageSearch
      });
      
      const writerResponse = await writerAgent.execute({
        query: effectiveQuery,
        researchResult: researchData,
        isImageSearch: researchData.isReverseImageSearch
      });

      console.log('🔍 [REGULAR SEARCH] WriterAgent.execute() completed');

      console.log('✅ [REGULAR SEARCH] WriterAgent complete:', {
        success: writerResponse?.success,
        hasContent: !!writerResponse?.data?.content,
        contentLength: writerResponse?.data?.content?.length || 0
      });

      if (!writerResponse?.success || !writerResponse?.data?.content) {
        console.error('❌ [REGULAR SEARCH] Writer failed to generate content', {
          error: writerResponse?.error,
          hasData: !!writerResponse?.data
        });
        // Preserve the original error message if available
        throw new Error(writerResponse?.error || 'Writer failed to generate content');
      }
      
      console.log('✅ [REGULAR SEARCH] Writer SUCCESS');
      
      // Step 3: Wait for shopping products (if any)
      let shoppingProducts: AmazonProduct[] = [];
      if (shoppingProductsPromise) {
        try {
          console.log('🛍️ [SHOPPING] Waiting for product results...');
          shoppingProducts = await shoppingProductsPromise;
          console.log('🛍️ [SHOPPING] Products received:', shoppingProducts.length);
        } catch (error) {
          console.error('🛍️ [SHOPPING] Failed to get products:', error);
          // Continue without products
        }
      }
      
      // Step 4: Format & Return
      console.log('✅ [REGULAR SEARCH] Formatting response...');
      
      const finalResponse = {
        answer: writerResponse.data.content,
        sources: (searchResponse.data.results || []).map((r: any) => ({
          title: r.title,
          url: normalizeUrl(r.url),
          snippet: r.content
        })),
        images: searchResponse.data.images || [],
        videos: searchResponse.data.videos || [],
        provider: 'Standard Search',
        perspectives: undefined, // Regular search never has perspectives
        citations: writerResponse.data.citations || [],
        followUpQuestions: writerResponse.data.followUpQuestions || [],
        // Add shopping products if any
        shoppingProducts: shoppingProducts.length > 0 ? shoppingProducts : undefined
      };
      
      console.log('✅✅✅ [REGULAR SEARCH] === COMPLETE - RETURNING TO UI ===', {
        hasAnswer: !!finalResponse.answer,
        answerLength: finalResponse.answer?.length || 0,
        sourcesCount: finalResponse.sources.length,
        imagesCount: finalResponse.images.length,
        videosCount: finalResponse.videos.length,
        citationsCount: finalResponse.citations.length,
        followUpQuestionsCount: finalResponse.followUpQuestions.length,
        shoppingProductsCount: finalResponse.shoppingProducts?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      // IMPORTANT: Return immediately, no async operations after this
      return finalResponse;
      
    } catch (error) {
      console.error('❌ [REGULAR SEARCH] Search failed:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  } catch (error) {
    logger.error('Regular search error:', {
      error: error instanceof Error ? error.message : error,
      query,
      timestamp: new Date().toISOString(),
    });

    // Return fallback response for any errors
    return {
      answer: 'We apologize, but we could not process your search at this time. Please try again in a moment.',
      sources: [],
      images: [],
      videos: [],
      provider: 'Standard Search',
      perspectives: undefined,
    };
  }
}

/**
 * Regular Search Service with Streaming Support
 * Query → Brave Search → Writer (streaming) → Results
 * 
 * Same as performRegularSearch but streams the article content progressively
 * Returns sources/images/videos immediately, then streams article content
 */
export async function performRegularSearchWithStreaming(
  query: string,
  options: StreamingSearchOptions = {}
): Promise<SearchResponse> {
  try {
    const { onStatusUpdate, imageUrls, onContentChunk, onSourcesFound } = options;
    
    // Validate: need either query text OR images
    const hasQuery = query && query.trim().length > 0;
    const hasImages = imageUrls && imageUrls.length > 0;
    
    if (!hasQuery && !hasImages) {
      throw new SearchError('Search query or images required');
    }
    
    const effectiveQuery = hasQuery ? query : '';

    console.log('🔄 [STREAMING SEARCH] Starting streaming search flow:', {
      query: effectiveQuery,
      hasImages,
      hasStreamingCallback: !!onContentChunk,
      timestamp: new Date().toISOString()
    });
    
    // Shopping intent detection (parallel, non-blocking) - same as non-streaming
    let shoppingProductsPromise: Promise<AmazonProduct[]> | null = null;
    if (hasQuery && !hasImages) {
      console.log('🛍️ [SHOPPING STREAMING] Checking shopping intent for query:', query);
      const intentResult = detectShoppingIntent(query);
      console.log('🛍️ [SHOPPING STREAMING] Intent detection:', {
        isShoppingIntent: intentResult.isShoppingIntent,
        confidence: intentResult.confidence,
        method: intentResult.detectionMethod,
        matchedTerms: intentResult.matchedTerms
      });
      
      if (intentResult.isShoppingIntent && intentResult.confidence >= 40) {
        console.log('🛍️ [SHOPPING STREAMING] Starting product search in parallel...');
        shoppingProductsPromise = searchAmazonProducts(query, 4)
          .then(result => {
            console.log('🛍️ [SHOPPING STREAMING] Product search completed:', {
              success: result.success,
              productsCount: result.products.length
            });
            return result.success ? result.products : [];
          })
          .catch(error => {
            console.error('🛍️ [SHOPPING STREAMING] Product search failed:', error);
            return [];
          });
      } else {
        console.log('🛍️ [SHOPPING STREAMING] No shopping intent detected or confidence too low');
      }
    } else {
      console.log('🛍️ [SHOPPING STREAMING] Skipping shopping detection (image search or no query)');
    }
    
    try {
      // Step 1: Get search results (same as non-streaming)
      onStatusUpdate?.('Finding relevant information...');
      const searchResponse = await retrieverAgent.execute(effectiveQuery, onStatusUpdate, imageUrls);
      
      if (!searchResponse.success || !searchResponse.data) {
        console.error('❌ [STREAMING SEARCH] Search retrieval failed');
        throw new Error('Search retrieval failed');
      }
      
      console.log('✅ [STREAMING SEARCH] Search retrieval SUCCESS, starting streaming writer');
      
      if (onSourcesFound && searchResponse.data.results) {
        const sourceUrls = searchResponse.data.results
          .map(r => normalizeUrl(r.url))
          .filter(url => url && url !== '#');
        onSourcesFound(sourceUrls);
      }

      // Step 2: Generate article with streaming
      onStatusUpdate?.('Generating answer...');
      const researchData = {
        query: effectiveQuery,
        perspectives: [],
        results: searchResponse.data.results || [],
        images: searchResponse.data.images || [],
        videos: searchResponse.data.videos || [],
        isReverseImageSearch: searchResponse.data.isReverseImageSearch || false
      };

      // Use streaming if callback provided, otherwise fallback to regular execution
      let writerResponse;
      if (onContentChunk) {
        writerResponse = await writerAgent.executeWithStreaming({
          query: effectiveQuery,
          researchResult: researchData,
          isImageSearch: researchData.isReverseImageSearch,
          onContentChunk
        });
      } else {
        writerResponse = await writerAgent.execute({
          query: effectiveQuery,
          researchResult: researchData,
          isImageSearch: researchData.isReverseImageSearch
        });
      }

      if (!writerResponse?.success || !writerResponse?.data?.content) {
        const errorMsg = writerResponse?.error || 'Writer failed to generate content';
        console.error('❌ [STREAMING SEARCH] Writer failed to generate content', {
          error: errorMsg,
          hasData: !!writerResponse?.data
        });
        console.log('❌ [STREAMING SEARCH] Throwing error:', errorMsg);
        // Preserve the original error message if available
        throw new Error(errorMsg);
      }
      
      // Step 3: Wait for shopping products (if any)
      let shoppingProducts: AmazonProduct[] = [];
      if (shoppingProductsPromise) {
        try {
          console.log('🛍️ [SHOPPING] Waiting for product results...');
          shoppingProducts = await shoppingProductsPromise;
          console.log('🛍️ [SHOPPING] Products received:', shoppingProducts.length);
        } catch (error) {
          console.error('🛍️ [SHOPPING] Failed to get products:', error);
        }
      }
      
      // Step 4: Format & Return
      const finalResponse = {
        answer: writerResponse.data.content,
        sources: (searchResponse.data.results || []).map((r: any) => ({
          title: r.title,
          url: normalizeUrl(r.url),
          snippet: r.content
        })),
        images: searchResponse.data.images || [],
        videos: searchResponse.data.videos || [],
        provider: 'Standard Search',
        perspectives: undefined,
        citations: writerResponse.data.citations || [],
        followUpQuestions: writerResponse.data.followUpQuestions || [],
        shoppingProducts: shoppingProducts.length > 0 ? shoppingProducts : undefined
      };
      
      console.log('✅ [STREAMING SEARCH] === COMPLETE ===', {
        answerLength: finalResponse.answer?.length || 0,
        sourcesCount: finalResponse.sources.length,
        shoppingProductsCount: finalResponse.shoppingProducts?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      return finalResponse;
      
    } catch (error) {
      console.error('❌ [STREAMING SEARCH] Search failed:', {
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  } catch (error) {
    logger.error('Streaming search error:', {
      error: error instanceof Error ? error.message : error,
      query,
      timestamp: new Date().toISOString(),
    });

    const errorMessage = error instanceof Error ? error.message : String(error);
    const isRateLimitError =
      errorMessage === 'RATE_LIMIT_EXCEEDED' ||
      errorMessage === 'API error: 429' ||
      errorMessage.includes('429');

    // Important: propagate rate-limit errors so UI can show friendly message and redirect.
    if (isRateLimitError) {
      throw new SearchError('RATE_LIMIT_EXCEEDED');
    }

    return {
      answer: 'We apologize, but we could not process your search at this time. Please try again in a moment.',
      sources: [],
      images: [],
      videos: [],
      provider: 'Standard Search',
      perspectives: undefined,
    };
  }
}



