// types.ts

// Improved function type for agents with proper typing
export type AgentFunction = (...args: unknown[]) => Promise<unknown>;

export interface Agent {
  name: string;
  instructions: string;
  functions?: AgentFunction[];
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  image?: string;
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
  images?: import('../../types').ImageResult[]; // Use proper type from main types
}

export interface ArticleResult {
  content: string;
  followUpQuestions: string[];
  citations: string[];
}

// Generic AgentResponse with proper typing
export interface AgentResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    queryTransformation?: {
      originalType: string;
      finalType: string;
      wasTransformed: boolean;
    };
    [key: string]: unknown;
  };
}
