export interface SearxResult {
  title: string;
  url: string;
  content: string;
}

export interface Source {
  title: string;
  url: string;
  snippet: string;
}

export interface ImageResult {
  url: string;
  alt: string;
  source_url?: string;
}

export interface SearchResponse {
  answer: string;
  sources: Source[];
  images: ImageResult[];
  provider?: string;
}

export interface SearchState {
  isLoading: boolean;
  error: string | null;
  data: SearchResponse | null;
}