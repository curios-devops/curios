// Base types
export interface WebSearchItem {
  reason: string;
  query: string;
}

export interface WebSearchPlan {
  searches: WebSearchItem[];
}

export interface SearchResult {
  title?: string;
  url?: string;
  content?: string;
  snippet?: string;
  score?: number;
  source?: string;
  publishedDate?: string;
  [key: string]: unknown;
}

export interface ResearchData {
  query: string;
  headline: string;
  markdown_report: string;
  sources: SearchResult[];
  images?: Array<{
    url: string;
    alt?: string;
    source?: string;
    width?: number;
    height?: number;
  }>;
  outline?: string[];
  followUpQuestions?: string[];
}

export interface ResearchRequest {
  query: string;
  useProFeatures?: boolean;
  maxResults?: number;
  userId?: string;
}

export interface ResearchResult {
  success: boolean;
  data?: ResearchData;
  error?: string;
  metadata?: {
    totalTime?: number;
    sourcesUsed?: number;
    modelUsed?: string;
  };
}

export interface AgentResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    [key: string]: string | number | boolean | null | undefined | Record<string, unknown>;
  };
}

// Progress related types
export type ResearchProgressCallback = (
  stage: string,
  timeRemaining: string,
  progress: number,
  thinkingStep: string,
  searchTerms?: string[],
  sources?: SearchResult[],
  currentAgent?: string,
  agentAction?: string,
  researchPhase?: 'planning' | 'searching' | 'analyzing' | 'synthesizing' | 'citing'
) => void;

export type InsightProgressCallback = (
  stage: string,
  timeRemaining: string,
  progress: number,
  thinkingStep: string,
  searchTerms?: string[],
  sources?: SearchResult[],
  currentAgent?: string,
  agentAction?: string,
  insightPhase?: 'analyzing' | 'searching' | 'synthesizing' | 'finalizing'
) => void;

export interface SearchOptions {
  useWebSearchTool?: boolean;
  mode?: 'auto' | 'pro' | 'deep-research';
}