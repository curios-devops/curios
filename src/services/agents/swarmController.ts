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

  async processQuery(query: string, onStatusUpdate?: (status: string) => void): Promise<{
    research: ResearchResult;
    article: ArticleResult;
    images: any[];
  }> {
    try {
      const isDirect = this.isDirectQuestion(query);
      let perspectives = [];

      if (!isDirect) {
        onStatusUpdate?.('Adding different perspectives to enrich your answer...');
        const perspectiveResponse = await this.perspectiveAgent.execute(query);
        if (!perspectiveResponse.success) {
          throw new Error(`Perspective generation failed: ${perspectiveResponse.error}`);
        }
        perspectives = perspectiveResponse.data.perspectives;
      }

      // Start image search in parallel with other operations
      onStatusUpdate?.('Searching for relevant images using SearxNG...');
      const imageSearchPromise = this.imageSearchAgent.execute(query);

      onStatusUpdate?.('Searching through reliable sources using SearxNG...');
      const retrievalResponse = await this.retrieverAgent.execute(query, perspectives);
      if (!retrievalResponse.success) {
        onStatusUpdate?.('SearxNG search failed, falling back to Tavily...');
        throw new Error(`Information retrieval failed: ${retrievalResponse.error}`);
      }

      onStatusUpdate?.('Crafting a comprehensive answer...');
      const writerResponse = await this.writerAgent.execute(
        retrievalResponse.data as ResearchResult
      );
      if (!writerResponse.success) {
        throw new Error(`Article generation failed: ${writerResponse.error}`);
      }

      // Wait for image search to complete
      const imageResponse = await imageSearchPromise;
      const images = imageResponse.success ? imageResponse.data.images : [];
      if (!imageResponse.success) {
        onStatusUpdate?.('Image search with SearxNG failed, trying alternative sources...');
      }

      onStatusUpdate?.('Formatting the response...');
      const uiResponse = await this.uiAgent.execute({
        research: retrievalResponse.data,
        article: writerResponse.data,
        images
      });
      if (!uiResponse.success) {
        throw new Error(`UI formatting failed: ${uiResponse.error}`);
      }

      return {
        ...uiResponse.data,
        images
      };
    } catch (error) {
      console.error('Swarm processing error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to process query'
      );
    }
  }
}