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
          console.log('🔍 Starting regular search:', query);
          
          try {
            // Step 1: Get search results
            onStatusUpdate?.('Searching for information...');
            const searchResponse = await retrieverAgent.execute(query, onStatusUpdate);
            
            if (!searchResponse.success || !searchResponse.data) {
              throw new Error('Search retrieval failed');
            }

            // Step 2: Generate article
            onStatusUpdate?.('Generating comprehensive answer...');
            const researchData = {
              query,
              perspectives: [],
              results: searchResponse.data.results || []
            };

            console.log('🔍 [SEARCH] Calling WriterAgent...');
            const writerResponse = await writerAgent.execute(researchData, onStatusUpdate);
            
            console.log('✅ WriterAgent complete:', {
              success: writerResponse?.success,
              hasContent: !!writerResponse?.data?.content
            });
            
            if (!writerResponse?.success || !writerResponse?.data?.content) {
              throw new Error('Writer failed to generate content');
            }
            
            // Step 3: Format & Return
            console.log('✅ Formatting response...');
            
            // 🔍 DEBUG: Check what images we actually have
            console.log('🔍 [SEARCH] Images investigation:', {
              hasSearchResponse: !!searchResponse,
              hasData: !!searchResponse.data,
              hasImages: !!searchResponse.data.images,
              imagesLength: searchResponse.data.images?.length || 0,
              firstImage: searchResponse.data.images?.[0] || 'NO IMAGES',
              imagesArray: searchResponse.data.images
            });
            
            return {
              answer: writerResponse.data.content,
              sources: (searchResponse.data.results || []).map((r: any) => ({
                title: r.title,
                url: r.url,
                snippet: r.content
              })),
              images: searchResponse.data.images || [],
              videos: searchResponse.data.videos || [],
              provider: 'Standard Search',
              perspectives: undefined,
              citations: writerResponse.data.citations || []
            };
            
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
