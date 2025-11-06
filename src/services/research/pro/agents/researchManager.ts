import { ResearchPlannerAgent } from './researchPlannerAgent.ts';
import { ResearchRetrieverAgent } from './researchRetrieverAgent.ts';
import { ResearchWriterAgent } from './researchWriterAgent.ts';
import type { ResearchData } from '../../types.ts';
import { logger } from '../../../../utils/logger.ts';

export class ResearchManager {
  private plannerAgent: ResearchPlannerAgent;
  private searchAgent: ResearchRetrieverAgent;
  private writerAgent: ResearchWriterAgent;

  constructor() {
    this.plannerAgent = new ResearchPlannerAgent();
    this.searchAgent = new ResearchRetrieverAgent();
    this.writerAgent = new ResearchWriterAgent();
  }

  async conductResearch(
    query: string,
    onProgress: (agent: string, status: string, progress: number) => void
  ): Promise<ResearchData> {
    try {
      // 1. Planning Phase
      onProgress('Planner', 'Planning research approach...', 0);
      const planResponse = await this.plannerAgent.execute({
        query
      });
      if (!planResponse.success || !planResponse.data) {
        throw new Error(planResponse.error || 'Planning failed');
      }

      // 2. Search Phase
      onProgress('Search', 'Gathering information from multiple sources...', 33);
      const searchResponse = await this.searchAgent.search(
        planResponse.data.search_queries.map(q => ({ query: q, reason: 'Research strategy' })),
        true
      );
      if (!searchResponse.success || !searchResponse.data) {
        throw new Error(searchResponse.error || 'Search failed');
      }

      // 3. Synthesis Phase
      onProgress('Writer', 'Synthesizing research findings...', 66);
      const writeResponse = await this.writerAgent.execute({
        query,
        search_queries: planResponse.data.search_queries,
        results: searchResponse.data,
        thinking_process: planResponse.data.thinking_process
      });
      if (!writeResponse.success || !writeResponse.data) {
        throw new Error(writeResponse.error || 'Synthesis failed');
      }

      // Map the writer response to ResearchData
      const writerData = writeResponse.data;
      return {
        query,
        headline: writerData.headline,
        markdown_report: writerData.markdown_report,
        sources: writerData.citations.map((c: any) => {
          const source = c.source || {};
          return {
            title: source.title || 'Source',
            url: source.url || '',
            content: c.text
          };
        }),
        images: [], // Will be populated by the writer if needed
        outline: writerData.markdown_report
          .split('\n## ')
          .filter((line: string) => line.trim())
          .map((line: string) => line.split('\n')[0].trim()),
        followUpQuestions: writerData.follow_up_questions
      };
    } catch (error) {
      logger.error('Research process failed:', error);
      throw error;
    }
  }
}