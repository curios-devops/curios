import { SearchRetrieverAgent } from '../regular/agents/searchRetrieverAgent.ts';
import { SearchWriterAgent } from '../regular/agents/searchWriterAgent.ts';

// Export initialized instances to be used across the application
export const retrieverAgent = new SearchRetrieverAgent();
export const writerAgent = new SearchWriterAgent();
