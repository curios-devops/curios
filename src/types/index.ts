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
  title?: string;
  url: string;
  image?: string;
  alt: string;
  source_url?: string;
}

export interface VideoResult {
  title: string;
  url: string;
  thumbnail?: string;
  duration?: string;
}

export interface SearchResponse {
  answer: string;
  sources: Source[];
  images: ImageResult[];
  videos: VideoResult[];
  provider?: string;
  perspectives?: Perspective[];
}

export interface SearchState {
  isLoading: boolean;
  error: string | null;
  data: SearchResponse | null;
}

export interface Perspective {
  id: string;
  title: string;
  description: string;
  sources?: Source[];
}

export type UserType = 'free' | 'premium';