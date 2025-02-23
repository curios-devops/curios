// types.ts

// Optionally refine the function type for agents
export type AgentFunction = (...args: any[]) => Promise<any>;

export interface Agent {
  name: string;
  instructions: string;
  functions?: AgentFunction[];
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
  results?: SearchResult[];
}

export interface ResearchResult {
  query: string;
  perspectives: Perspective[];
  results: SearchResult[];
  images?: any[]; // If you know the structure, replace `any` with a specific type
}

export interface ArticleResult {
  content: string;
  followUpQuestions: string[];
  citations: string[];
}

// Generic AgentResponse to allow stricter typing if needed
export interface AgentResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    queryTransformation?: {
      originalType: string;
      finalType: string;
      wasTransformed: boolean;
    };
    [key: string]: any;
  };
}
