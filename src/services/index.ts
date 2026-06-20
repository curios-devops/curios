// Services - Main Entry Point

// Export all services

// Explicitly re-export only unique symbols to avoid ambiguity
export { WriterAgent as SearchWriterAgent, RetrieverAgent } from './legacy-search/regular/searchRegularIndex';
export { ProSearchResultsPage, SwarmController, PerspectiveAgent } from './legacy-search/pro/searchProIndex';
export { default as SearchResultsPage } from './legacy-search/regular/pages/SearchResults.tsx';

export { generateArtifact, PlannerAgent, ResearcherAgent, WriterAgent as LabWriterAgent, FormatterAgent, LabController, orchestrateArtifact } from './lab/regular/regularIndex.ts';
export { default as LabsResultsPage } from './lab/regular/pages/LabsResults.tsx';

export type {
	Artifact,
	ArtifactStep,
	PlanDetail,
	PlanResponse,
	ResearchResponse,
	WriterResponse,
	FormatterResponse,
	AgentResponse
} from '../commonApp/types/index';

// Research exports (avoid ambiguous re-exports)
export type {
	ResearchResponse as ProResearchResponse,
	WriterResponse as ProWriterResponse,
	PlanDetail as ProPlanDetail,
	PlanResponse as ProPlanResponse,
	FormatterResponse as ProFormatterResponse,
	AgentResponse as ProAgentResponse
} from '../commonApp/types/researchTypes';
