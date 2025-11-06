// Research Service - Main Entry Point
// Maintains strict isolation between Pro and Regular/Insights workflows

// Export Pro research service (Pro workflow ONLY)
export { researchService } from './pro/agents/researchService.ts';

// Export Regular insights service (Free-tier workflow ONLY)
export { insightsService } from './regular/agents/insightsService';

// Export Pro specific types and controllers
export { ResearchSwarmController } from './pro/agents/researchSwarmController.ts';
export { ResearchPlannerAgent } from './pro/agents/researchPlannerAgent.ts';
export { ResearchWriterAgent } from './pro/agents/researchWriterAgent.ts';
export { ResearchRetrieverAgent } from './pro/agents/researchRetrieverAgent.ts';

// Export Regular/Insights workflow components
export { InsightSwarmController } from './regular/agents/insightSwarmController.ts';
export { InsightAnalyzerAgent } from './regular/agents/insightAnalyzerAgent.ts';
export { InsightWriterAgent } from './regular/agents/insightWriterAgent.ts';
export { InsightsRetrieverAgent } from './regular/agents/InsightsRetrieverAgent';

// Export research types
export * from './types.ts';

// Architecture Notes:
// - Pro pages use: import { researchService } from '@/services/research/pro/agents/researchService'
// - Insights pages use: import { insightsService } from '@/services/research/regular/agents/insightsService'
// - Never cross-import between pro and regular workflows
