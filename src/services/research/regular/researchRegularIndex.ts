// Insights (Stories) — Free-tier workflow, single-agent pipeline.
export { insightsService } from './agents/insightsService';
export { InsightAgent } from './agents/insightAgent';

// Type exports
export type {
  AgentResponse,
  SearchResult,
  WebSearchItem,
  ResearchData,
  WebSearchPlan
} from '../types.ts';

export type {
  InsightResult,
  InsightRequest
} from './agents/insightAgent';
