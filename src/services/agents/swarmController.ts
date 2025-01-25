import { UIAgent } from './uiAgent';
import { PerspectiveAgent } from './perspectiveAgent';
import { RetrieverAgent } from './retrieverAgent';
import { WriterAgent } from './writerAgent';
import { ImageSearchAgent } from './imageSearchAgent';
import { AgentResponse, ResearchResult, ArticleResult } from './types';

export class SwarmController {
  private uiAgent: UIAgent;
  private perspectiveAgent: PerspectiveAgent;
  private retrieverAgent: RetrieverAgent;
  private writerAgent: WriterAgent;
  private imageSearchAgent: ImageSearchAgent;

  constructor() {
    this.uiAgent = new UIAgent();
    this.perspectiveAgent = new PerspectiveAgent();
    this.retrieverAgent = new RetrieverAgent();
    this.writerAgent = new WriterAgent();
    this.imageSearchAgent = new ImageSearchAgent();
  }

  private isDirectQuestion(query: string): boolean {
    const directPatterns = [
      /^what\s+is/i,
      /^who\s+is/i,
      /^when\s+did/i,
      /^where\s+is/i,
      /^how\s+much/i,
      /^how\s+many/i,
      /^which/i,
      /^define/i,
      /^explain/i
    ];
    
    return directPatterns.some(pattern => pattern.test(query)) || query.length < 50;
  }

  async processQuery(
    query: string, 
    onStatusUpdate?: (status: string) => void,
    isPro: boolean = false
  ): Promise<{
    research: ResearchResult;
    article: ArticleResult;
    images: any[];
  }> {
    try {
      const isDirect = this.isDirectQuestion(query);
      let perspectives = [];

      // Generate perspectives for Pro Search or complex queries
      if (isPro || !isDirect) {
        onStatusUpdate?.('Adding different perspectives to enrich your answer...');
        const perspectiveResponse = await this.perspectiveAgent.execute(query);
        perspectives = perspectiveResponse.data?.perspectives || [];
      }

      // Start image search in parallel with other operations
      onStatusUpdate?.('Searching for relevant images...');
      const imageSearchPromise = this.imageSearchAgent.execute(query);

      // Retrieve information
      onStatusUpdate?.('Searching through reliable sources...');
      const retrievalResponse = await this.retrieverAgent.execute(
        query, 
        perspectives,
        onStatusUpdate
      );

      // Generate article from research results
      onStatusUpdate?.('Crafting a comprehensive answer...');
      const writerResponse = await this.writerAgent.execute(
        retrievalResponse.data || { query, perspectives: [], results: [] }
      );

      // Wait for image search to complete
      const imageResponse = await imageSearchPromise;

      // Format the response using UI agent
      onStatusUpdate?.('Formatting the response...');
      const uiResponse = await this.uiAgent.execute({
        research: retrievalResponse.data,
        article: writerResponse.data,
        images: imageResponse.data?.images || []
      });

      // Return the formatted response
      return {
        research: uiResponse.data.research,
        article: uiResponse.data.article,
        images: imageResponse.data?.images || []
      };
    } catch (error) {
      console.warn('Swarm processing error:', error);
      // Return a valid fallback response
      return {
        research: { 
          query, 
          perspectives: [], 
          results: retrievalResponse?.data?.results || []
        },
        article: writerResponse?.data || this.getFallbackArticle(),
        images: []
      };
    }
  }

  private getFallbackArticle(): ArticleResult {
    return {
      content: 'We apologize, but we could not process your search at this time. Please try again in a moment.',
      followUpQuestions: [],
      citations: []
    };
  }
}