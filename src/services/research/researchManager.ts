import { PlannerAgent } from './plannerAgent';
import { SearchAgent } from './searchAgent';
import { WriterAgent } from './writerAgent';
import type { ResearchData } from './types';
import { logger } from '../../utils/logger';

export class ResearchManager {
  private plannerAgent: PlannerAgent;
  private searchAgent: SearchAgent;
  private writerAgent: WriterAgent;

  constructor() {
    this.plannerAgent = new PlannerAgent();
    this.searchAgent = new SearchAgent();
    this.writerAgent = new WriterAgent();
  }

  async conductResearch(
    query: string,
    onProgress: (agent: string, status: string, progress: number) => void
  ): Promise<ResearchData> {
    try {
      // 1. Planning Phase
      onProgress('Planner', 'Planning research approach...', 0);
      const planResponse = await this.plannerAgent.plan(query, true);
      if (!planResponse.success || !planResponse.data) {
        throw new Error(planResponse.error || 'Planning failed');
      }

      // 2. Search Phase
      onProgress('Search', 'Gathering information from multiple sources...', 33);
      const searchResponse = await this.searchAgent.search(planResponse.data.searches, true);
      if (!searchResponse.success || !searchResponse.data) {
        throw new Error(searchResponse.error || 'Search failed');
      }

      // 3. Synthesis Phase
      onProgress('Writer', 'Synthesizing research findings...', 66);
      const writeResponse = await this.writerAgent.synthesize(query, searchResponse.data, true);
      if (!writeResponse.success || !writeResponse.data) {
        throw new Error(writeResponse.error || 'Synthesis failed');
      }

      return writeResponse.data;
    } catch (error) {
      logger.error('Research process failed:', error);
      throw error;
    }
  }
}