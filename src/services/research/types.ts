export interface WebSearchItem {
  reason: string;
  query: string;
}

export interface WebSearchPlan {
  searches: WebSearchItem[];
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface ResearchData {
  outline: string[];
  content: string;
  followUpQuestions: string[];
  sources: SearchResult[];
  images: any[];
}

export interface AgentResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SearchOptions {
  useWebSearchTool?: boolean;
  mode?: 'auto' | 'pro' | 'deep-research';
}