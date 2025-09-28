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
          // REGULAR SEARCH: Simplified direct flow
          console.log('🔍 [SEARCH] Starting Regular Search flow', { query, timestamp: new Date().toISOString() });
          
          try {
            // Step 1: Search Retrieval
            console.log('🔍 [SEARCH] Step 1: Starting SearchRetrieverAgent');
            onStatusUpdate?.('Searching for information...');
            
            const searchResponse = await retrieverAgent.execute(
              query,
              (status) => {
                console.log('🔍 [RETRIEVER]', status);
                onStatusUpdate?.(status);
              },
              [], // no perspectives for regular search
              false // isPro = false
            );
            
            console.log('🔍 [SEARCH] SearchRetrieverAgent response:', {
              success: searchResponse.success,
              hasData: !!searchResponse.data,
              resultsCount: searchResponse.data?.results?.length || 0,
              timestamp: new Date().toISOString()
            });

            console.log('🔍 [DEBUG] Detailed SearchRetrieverAgent response:', {
              success: searchResponse.success,
              hasData: !!searchResponse.data,
              resultsCount: searchResponse.data?.results?.length || 0,
              imagesCount: searchResponse.data?.images?.length || 0,
              videosCount: searchResponse.data?.videos?.length || 0,
              perspectivesCount: searchResponse.data?.perspectives?.length || 0,
              firstResultTitle: searchResponse.data?.results?.[0]?.title || 'NO RESULTS',
              timestamp: new Date().toISOString()
            });

            if (!searchResponse.success || !searchResponse.data) {
              console.error('🔍 [SEARCH] SearchRetrieverAgent failed');
              throw new Error('Search retrieval failed');
            }

            // Step 2: Article Generation
            console.log('🔍 [SEARCH] Step 2: Starting SearchWriterAgent');
            onStatusUpdate?.('Generating comprehensive answer...');

            const researchData = {
              query,
              perspectives: [], // regular search has no perspectives
              results: searchResponse.data.results || []
            };

            console.log('🔍 [DEBUG] Preparing research data for SearchWriterAgent:', {
              query,
              perspectivesCount: researchData.perspectives.length,
              resultsCount: researchData.results.length,
              firstResultTitle: researchData.results[0]?.title || 'NO RESULTS',
              timestamp: new Date().toISOString()
            });

            let writerResponse;
            try {
              console.log('🔍 [SEARCH] SearchWriterAgent execution starting NOW');
              console.log('🔍 [DEBUG] SearchWriterAgent execution start:', {
                timestamp: new Date().toISOString()
              });
              writerResponse = await writerAgent.execute(researchData, (status) => {
                console.log('🔍 [WRITER]', status);
                onStatusUpdate?.(status);
              });
              console.log('🔍 [SEARCH] SearchWriterAgent execution completed');
            } catch (writerError) {
              console.error('🔍 [SEARCH] SearchWriterAgent threw an error:', writerError);
              writerResponse = {
                success: false,
                data: null
              };
            }

            console.log('🔍 [DEBUG] SearchWriterAgent response:', {
              success: writerResponse.success,
              hasData: !!writerResponse.data,
              contentLength: writerResponse.data?.content?.length || 0,
              followUpQuestionsCount: writerResponse.data?.followUpQuestions?.length || 0,
              citationsCount: writerResponse.data?.citations?.length || 0,
              timestamp: new Date().toISOString()
            });

            console.log('🔍 [SEARCH] SearchWriterAgent response:', {
              success: writerResponse.success,
              hasData: !!writerResponse.data,
              contentLength: writerResponse.data?.content?.length || 0,
              timestamp: new Date().toISOString()
            });
            
            if (!writerResponse.success || !writerResponse.data) {
              console.error('🔍 [SEARCH] SearchWriterAgent failed');
              throw new Error('Article generation failed');
            }
            
            // Step 3: Format Response
            console.log('🔍 [SEARCH] Step 3: Formatting final response');
            
            const validatedImages = (searchResponse.data.images || []).filter((img: { url: string }) => {
              try {
                const u = new URL(img.url);
                return u.protocol === 'https:';
              } catch {
                return false;
              }
            });

            const response: SearchResponse = {
              answer: writerResponse.data.content || 'No results found. Please try again.',
              sources: (searchResponse.data.results || []).map((result: { title: string; url: string; content: string }) => ({
                title: result.title,
                url: result.url,
                snippet: result.content,
              })),
              images: validatedImages,
              videos: searchResponse.data.videos || [],
              provider: 'Standard Search',
              perspectives: undefined,
              citations: writerResponse.data.citations || [],
            };
            
            console.log('🔍 [SEARCH] Regular search completed successfully:', {
              sourcesCount: response.sources.length,
              imagesCount: response.images.length,
              videosCount: response.videos.length,
              provider: response.provider,
              timestamp: new Date().toISOString()
            });
            
            onStatusUpdate?.('Search completed!');
            return response;
            
          } catch (error) {
            console.error('🔍 [SEARCH] Regular search failed:', {
              error: error instanceof Error ? error.message : error,
              timestamp: new Date().toISOString()
            });
            throw error;
          }
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
