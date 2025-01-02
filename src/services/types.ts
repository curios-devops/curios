export interface RetryOptions {
  maxRetries: number;
  delayMs: number;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}