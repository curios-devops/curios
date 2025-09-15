import { SearchResponse } from '../../commonApp/types/index';
import { SwarmController } from './pro/agents/swarmController.ts';
import { SearchRetrieverAgent } from './regular/agents/searchRetrieverAgent.ts';
import { SearchWriterAgent } from './regular/agents/searchWriterAgent.ts';
import { logger } from '../../utils/logger.ts';

export class SearchError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'SearchError';
  }
}

interface SearchOptions {
  mode?: string;
  isPro?: boolean;
  onStatusUpdate?: (status: string) => void;
}

// Initialize controllers for different search types
const swarmController = new SwarmController();
const retrieverAgent = new SearchRetrieverAgent();
const writerAgent = new SearchWriterAgent();

export async function performSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  try {
    // Validate the query immediately.
    if (!query.trim()) {
      throw new SearchError('Search query cannot be empty');
    }

    const { isPro = false, onStatusUpdate } = options;

    // Execute search operation directly (no Supabase wrapper needed)
    if (isPro) {
      // PRO SEARCH: Use SwarmController (includes PerspectiveAgent)
      logger.info('Using Pro Search flow with SwarmController', { query, isPro });
      
      const { research, article, images, videos } = await swarmController.processQuery(
        query,
        onStatusUpdate,
        true // isPro = true
      );
          
          logger.debug('Pro search service received data from swarm controller', {
            hasResearch: !!research,
            hasVideos: !!videos,
            videoCount: videos?.length,
            perspectivesCount: research.perspectives?.length || 0
          });

          // Ensure images array is always defined and valid.
          const validatedImages = images?.filter((img: { url: string; title?: string; alt?: string }) => {
            try {
              const u = new URL(img.url);
              return u.protocol === 'https:';
            } catch {
              return false;
            }
          }) || [];

          // Extract images from sources when available
          const sourcesWithImages = research.results?.map((result: { title: string; url: string; content: string }) => {
            return {
              title: result.title,
              url: result.url,
              snippet: result.content,
            };
          }) || [];

          // Map the research data to the expected response format.
          const response: SearchResponse = {
            answer: article.content || 'No results found. Please try again.',
            sources: sourcesWithImages,
            images: validatedImages,
            videos: videos || [],
            provider: 'Pro Search',
            perspectives: research.perspectives?.map((perspective: { id: string; title: string; description: string; results?: { title: string; url: string; content: string }[] }) => ({
              id: perspective.id,
              title: perspective.title,
              description: perspective.description,
              sources: perspective.results?.map((result: { title: string; url: string; content: string }) => ({
                title: result.title,
                url: result.url,
                snippet: result.content,
              })) || [],
            })).filter((p: { id: string; title: string }) => p.id && p.title) || [],
            citations: article.citations || [],
          };
          
          logger.debug('Pro search service response', {
            imageCount: response.images.length,
            videoCount: response.videos.length,
            perspectivesCount: response.perspectives?.length || 0,
            provider: response.provider
          });

          return response;
          
        } else {
          // REGULAR SEARCH: Direct SearchRetrieverAgent → SearchWriterAgent (NO PerspectiveAgent, NO SwarmController)
          logger.info('Using Regular Search flow with direct agents', { query, isPro });
          
          // Step 1: SearchRetrieverAgent
          const searchResponse = await retrieverAgent.execute(
            query,
            onStatusUpdate,
            [], // no perspectives for regular search
            false // isPro = false
          );
          
          if (!searchResponse.success || !searchResponse.data) {
            throw new Error('Search retrieval failed');
          }
          
          logger.debug('Regular search retriever completed', {
            resultsCount: searchResponse.data.results?.length || 0,
            imagesCount: searchResponse.data.images?.length || 0,
            videosCount: searchResponse.data.videos?.length || 0
          });
          
          // DIAGNOSTIC: Signal before writer agent execution
          onStatusUpdate?.('Starting article generation...');
          logger.info('About to execute SearchWriterAgent', {
            resultsCount: searchResponse.data.results?.length || 0,
            hasSearchData: !!searchResponse.data,
            searchSuccess: searchResponse.success
          });
          
          // Step 2: SearchWriterAgent (no perspectives)
          logger.info('Calling SearchWriterAgent.execute', {
            query,
            resultsCount: searchResponse.data.results?.length || 0
          });
          
          const writerResponse = await writerAgent.execute({
            query,
            perspectives: [], // regular search has no perspectives
            results: searchResponse.data.results || []
          }, onStatusUpdate);
          
          logger.info('SearchWriterAgent execution completed', {
            writerSuccess: writerResponse.success,
            hasWriterData: !!writerResponse.data,
            contentLength: writerResponse.data?.content?.length || 0
          });
          
          if (!writerResponse.success || !writerResponse.data) {
            throw new Error('Article generation failed');
          }
          
          logger.debug('Regular search writer completed', {
            contentLength: writerResponse.data.content?.length || 0,
            followUpQuestionsCount: writerResponse.data.followUpQuestions?.length || 0
          });

          // Ensure images array is always defined and valid.
          const validatedImages = searchResponse.data.images?.filter((img: { url: string; title?: string; alt?: string }) => {
            try {
              const u = new URL(img.url);
              return u.protocol === 'https:';
            } catch {
              return false;
            }
          }) || [];

          // Map the search data to the expected response format.
          const response: SearchResponse = {
            answer: writerResponse.data.content || 'No results found. Please try again.',
            sources: searchResponse.data.results?.map((result: { title: string; url: string; content: string }) => ({
              title: result.title,
              url: result.url,
              snippet: result.content,
            })) || [],
            images: validatedImages,
            videos: searchResponse.data.videos || [],
            provider: 'Standard Search',
            perspectives: undefined, // regular search has no perspectives
            citations: writerResponse.data.citations || [],
          };
          
          logger.debug('Regular search service response', {
            imageCount: response.images.length,
            videoCount: response.videos.length,
            sourcesCount: response.sources.length,
            provider: response.provider
          });

          return response;
        }
  } catch (error) {
    logger.error('Search error:', {
      error: error instanceof Error ? error.message : error,
      query,
      isPro: options.isPro,
      timestamp: new Date().toISOString(),
    });

    // Return fallback response for any errors
    return {
      answer: 'We apologize, but we could not process your search at this time. Please try again in a moment.',
      sources: [],
      images: [],
      videos: [],
      provider: options.isPro ? 'Pro Search' : 'Standard Search',
      perspectives: undefined,
    };
  }
}
