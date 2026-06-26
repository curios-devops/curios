// Curiosity Engine — shared types for the Space + Share + Feed layer.
// A CuriosityNode is the persistent snapshot of one Q&A interaction.

export type NodeMode = 'fast_search' | 'stories' | 'explore';

export interface NodeSource {
  title: string;
  url: string;
  snippet: string;
}

export interface NodeImage {
  url: string;
  title: string;
  source?: string;
}

export interface NodeVideo {
  url: string;
  title: string;
  thumbnail: string;
  source?: string;
}

// What a results page serializes into the store. The final agent output — no
// regeneration happens on read.
export interface NodeSnapshot {
  mode: NodeMode;
  query: string;
  answer: string;
  shortSummary?: string;
  sources?: NodeSource[];
  images?: NodeImage[];
  videos?: NodeVideo[];
  followUps?: string[];
  coverImage?: string;
  topics?: string[];
}

// A persisted node as returned from the DB.
export interface NodeRecord {
  id: string;
  user_id: string;
  mode: NodeMode;
  query: string;
  answer: string;
  short_summary: string | null;
  sources: NodeSource[];
  images: NodeImage[];
  videos: NodeVideo[];
  follow_ups: string[];
  cover_image: string | null;
  topics: string[];
  is_public: boolean;
  share_slug: string | null;
  view_count: number;
  like_count: number;
  share_count: number;
  save_count: number;
  created_at: string;
  updated_at: string;
}

// A row from the discovery_feed view (nodes + movies + cinematic, common shape).
export interface FeedItem {
  id: string;
  source_table: 'curiosity_node' | 'movie_project' | 'cinematic_video';
  slug: string;
  title: string;
  summary: string | null;
  cover_image: string | null;
  type: string;
  view_count: number;
  like_count: number;
  share_count: number;
  created_at: string;
}
