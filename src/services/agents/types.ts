export interface Agent {
  name: string;
  instructions: string;
  functions?: Function[];
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export interface Perspective {
  id: string;
  title: string;
  description: string;
}

export interface ResearchResult {
  query: string;
  perspectives: Perspective[];
  results: SearchResult[];
}

export interface ArticleResult {
  content: string;
  followUpQuestions: string[];
  citations: string[];
}

export interface AgentResponse {
  success: boolean;
  data?: ResearchResult | ArticleResult | any;
  error?: string;
}