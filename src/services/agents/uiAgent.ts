import { BaseAgent } from './baseAgent';
import { AgentResponse } from './types';
import { logger } from '../../utils/logger';
import { PerspectiveAgent } from './perspectiveAgent';
import { RetrieverAgent } from './retrieverAgent';

/**
 * UIAgent handles user interaction and presentation of results.
 * In Pro mode, it additionally constructs perspective objects by:
 *  - Calling the PerspectiveAgent to generate perspective queries.
 *  - Using the RetrieverAgent to fetch search results for each perspective.
 */
export class UIAgent extends BaseAgent {
  private perspectiveAgent: PerspectiveAgent;
  private retrieverAgent: RetrieverAgent;

  constructor() {
    super('UI Agent', 'Handle user interaction and presentation of results');
    this.perspectiveAgent = new PerspectiveAgent();
    this.retrieverAgent = new RetrieverAgent();
  }

  /**
   * Executes the UIAgent logic by formatting the incoming data.
   * In Pro mode, it generates perspective objects with additional search results.
   *
   * @param data - The input data expected to contain research and article information.
   * @param isPro - Flag indicating if Pro mode is enabled.
   * @param originalQuery - The original search query string.
   * @returns An AgentResponse object containing the formatted research and article data.
   */
  async execute(
    data: any,
    isPro: boolean = false,
    originalQuery?: string
  ): Promise<AgentResponse> {
    try {
      // Start with any existing perspectives from data (if any)
      let perspectives = data?.research?.perspectives || [];

      // If running in Pro mode and an original query is provided,
      // generate perspective queries and retrieve search results for each.
      if (isPro && originalQuery) {
        const perspectiveResponse = await this.perspectiveAgent.execute(originalQuery);
        let perspectiveQueries: string[] = perspectiveResponse.data?.perspectives || [];
        if (!Array.isArray(perspectiveQueries)) {
          logger.warn('Perspective payload is not an array as expected.', {
            perspectiveData: perspectiveResponse.data,
          });
          perspectiveQueries = [];
        }
        logger.info('Generated perspectives', { perspectiveQueries });
        const perspectiveResults = await Promise.all(
          perspectiveQueries.map(async (perspQuery: string) => {
            if (perspQuery && perspQuery.toLowerCase() !== originalQuery.toLowerCase()) {
              let resp = await this.retrieverAgent.execute(perspQuery);
              // If no results were returned, force a fallback result for this perspective.
              if (!resp.data || !resp.data.results || resp.data.results.length === 0) {
                logger.warn(`No results returned for perspective "${perspQuery}". Using fallback data.`);
                resp = {
                  success: true,
                  data: {
                    results: [{
                      title: 'General Information',
                      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(perspQuery)}`,
                      content: `We're currently experiencing high traffic. Please try your search again in a moment.`,
                    }],
                    images: [{
                      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Wikipedia_Logo_1.0.png/220px-Wikipedia_Logo_1.0.png',
                      alt: 'Wikipedia Logo',
                      source_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(perspQuery)}`
                    }],
                    videos: []
                  }
                };
              }
              logger.info(`Retriever results for perspective "${perspQuery}":`, {
                results: resp.data.results,
              });
              return {
                id: perspQuery, // Use the perspective query as a unique identifier.
                title: perspQuery,
                description: `Search results for "${perspQuery}"`,
                results: resp.data.results, // These will map to "sources" in the UI.
                images: resp.data.images,
                videos: resp.data.videos || [] // Pass along any video results.
              };
            } else {
              return null;
            }
          })
        );
        // Filter out any null entries.
        perspectives = perspectiveResults.filter(item => item !== null);
      }

      // Format the final data object, including video results if available.
      const formattedData = {
        research: {
          results: data?.research?.results || [],
          perspectives: perspectives,
          videos: data?.research?.videos || []
        },
        article: data?.article || {
          content: 'We are experiencing high traffic. Please try again in a moment.',
          followUpQuestions: [],
          citations: [],
        },
      };

      return {
        success: true,
        data: formattedData,
      };
    } catch (error) {
      logger.warn('UIAgent execution encountered an error:', error);
      return {
        success: true,
        data: this.getFallbackData(data),
      };
    }
  }

  /**
   * Provides fallback data for the UIAgent.
   * @param data - Optional original data to attempt partial fallback.
   * @returns A fallback object ensuring that both research and article fields are present.
   */
  protected getFallbackData(data?: any): any {
    return {
      research: {
        results: data?.research?.results || [],
        perspectives: data?.research?.perspectives || [],
        videos: data?.research?.videos || []
      },
      article: {
        content:
          data?.article?.content ||
          'We are experiencing high traffic. Please try again in a moment.',
        followUpQuestions: data?.article?.followUpQuestions || [],
        citations: data?.article?.citations || [],
      },
    };
  }
}
