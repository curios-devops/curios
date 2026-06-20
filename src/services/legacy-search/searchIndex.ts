// Search Service - Main Entry Point

// Unified entry points
export { performSearch, performSearchWithStreaming, SearchError } from './searchService';

// Backwards-compatible page exports
export { default as ProSearchResultsPage } from './pro/pages/ProSearchResults';
export { default as SearchResultsPage } from './regular/pages/SearchResults.tsx';

// Optional advanced agents
export { SwarmController } from './pro/agents/swarmController';
export { PerspectiveAgent } from './pro/agents/perspectiveAgent';
export { SearchWriterAgent as WriterAgent } from './regular/agents/searchWriterAgent.ts';
export { SearchRetrieverAgent as RetrieverAgent } from './regular/agents/searchRetrieverAgent.ts';

// Shared types
export * from '../../commonApp/types/index.ts';
