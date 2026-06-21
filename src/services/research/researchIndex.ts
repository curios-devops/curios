// Research Service - Main Entry Point
// Pro research workflow was removed; only the Regular/Insights (Stories) workflow remains.

// Export Regular insights service (Free-tier workflow ONLY)
export { insightsService } from './regular/agents/insightsService';

// Export the single-agent Insights (Stories) pipeline
export { InsightAgent } from './regular/agents/insightAgent';

// Export research types
export * from './types.ts';

// Architecture Notes:
// - Insights (Stories) pages use: import { insightsService } from '@/services/research/regular/agents/insightsService'
