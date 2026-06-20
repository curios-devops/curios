// Search Service - Pro Tier
export { default as ProSearchResultsPage } from './pages/ProSearchResults';
export { SwarmController } from './agents/swarmController';
export { PerspectiveAgent } from './agents/perspectiveAgent';

// Export the pro search service directly
export { performProSearch as performSearch } from './proSearchService.ts';
