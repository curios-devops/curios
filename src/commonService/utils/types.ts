export interface RetryOptions {
  maxRetries: number;
  delayMs: number;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export interface ImageResult {
  url: string;
  alt: string;
  source_url?: string;
}

export interface VideoResult {
  title: string;
  url: string;
  thumbnail?: string;
  duration?: string;
}