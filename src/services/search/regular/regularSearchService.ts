import { SearchResponse } from '../../../commonApp/types/index';
import { SearchRetrieverAgent } from './agents/searchRetrieverAgent.ts';
import { SearchWriterAgent } from './agents/searchWriterAgent.ts';
import { logger } from '../../../utils/logger.ts';

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
    
    try {
      // Step 1: Get search results (direct Brave/Apify call)
      onStatusUpdate?.('Searching...');
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
        console.error('❌ [REGULAR SEARCH] Writer failed to generate content');
        throw new Error('Writer failed to generate content');
      }
      
      console.log('✅ [REGULAR SEARCH] Writer SUCCESS');
      
      // Step 3: Format & Return
      console.log('✅ [REGULAR SEARCH] Formatting response...');
      
      const finalResponse = {
        answer: writerResponse.data.content,
        sources: (searchResponse.data.results || []).map((r: any) => ({
          title: r.title,
          url: r.url,
          snippet: r.content
        })),
        images: searchResponse.data.images || [],
        videos: searchResponse.data.videos || [],
        provider: 'Standard Search',
        perspectives: undefined, // Regular search never has perspectives
        citations: writerResponse.data.citations || [],
        followUpQuestions: writerResponse.data.followUpQuestions || []
      };
      
      console.log('✅✅✅ [REGULAR SEARCH] === COMPLETE - RETURNING TO UI ===', {
        hasAnswer: !!finalResponse.answer,
        answerLength: finalResponse.answer?.length || 0,
        sourcesCount: finalResponse.sources.length,
        imagesCount: finalResponse.images.length,
        videosCount: finalResponse.videos.length,
        citationsCount: finalResponse.citations.length,
        followUpQuestionsCount: finalResponse.followUpQuestions.length,
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


