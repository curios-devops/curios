// FastSearch Service - Main entry point
// Export all public APIs for the fast-search module

export { executeFastSearch, executeFastSearchStreaming } from './controller';
export type { FastSearchRequest, FastSearchResponse } from './controller';
export { default as FastSearchResults } from './pages/FastSearchResults';
