// Common Types - Shared across all services

// Export research-specific types
export * from './researchTypes';

// Search and Content Types
export interface SearxResult {
  title: string;
  url: string;
  content: string;
}

export interface Source {
  title: string;
  url: string;
  snippet: string;
  image?: string;
}

export interface ImageResult {
  title?: string;
  url: string;
  image?: string;
  alt: string;
  source_url?: string;
  resolution?: string; // Original image resolution (e.g., "1920 × 1080")
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
  news?: Array<{
    title: string;
    url: string;
    snippet?: string;
    image?: string;
    extra_snippets?: string[];
  }>;
  provider?: string;
  perspectives?: Perspective[];
  followUpQuestions?: string[];
  citations?: CitationInfo[];
}

export interface SearchState {
  isLoading: boolean;
  error: string | null;
  data: SearchResponse | null;
}

// Agent Types
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
  sources?: Source[];
}

export interface ResearchResult {
  query: string;
  perspectives: Perspective[];
  results: SearchResult[];
  images?: ImageResult[];
  videos?: VideoResult[];
  isReverseImageSearch?: boolean; // Flag to indicate if this was a reverse image search workflow
}

export interface ArticleResult {
  content: string;
  followUpQuestions: string[];
  citations: CitationInfo[];
}

export interface CitationInfo {
  url: string;
  title: string;
  siteName: string;
  snippet?: string;
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

// User Types
export type UserType = 'free' | 'premium';

// Lab Service Types - Artifact orchestration
export interface Citation {
  url: string;
  title?: string;
  start_index?: number;
  end_index?: number;
}

export interface ArtifactStep {
  name: string;
  status: 'pending' | 'in_progress' | 'complete' | 'error';
  result?: string;
  citations?: Citation[];
  agentName?: string; // e.g., 'Manus', 'Researcher'
  agentStatus?: string; // e.g., 'is working', 'Thinking', etc.
  thinkingSince?: number; // timestamp (ms) when agent started working
}

export interface LabArtifact {
  id: string;
  title: string;
  type: string; // allow all types
  content: string;
  status: 'pending' | 'in_progress' | 'complete' | 'error';
  steps: ArtifactStep[];
  imageUrl?: string; // For DALL·E images
  gameCode?: string; // For game React code
  thinkingLog?: string[]; // Agent process log
  planDetails?: { step: string, detail: string }[]; // LLM-generated plan for UI
}

// UI Artifact Types for categories and generation
export interface ArtifactCategory {
  id: string;
  name: string;
  icon: string;
  types: ArtifactType[];
  description: string;
}

export interface ArtifactType {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface UIArtifact {
  id: string;
  title: string;
  description: string;
  type: string;
  category: 'docs' | 'images' | 'games' | 'data' | 'webs';
  content: string;
  createdAt: Date;
  imageUrl?: string;
  gameCode?: string;
}

export interface ArtifactGenerationRequest {
  prompt: string;
  category: 'docs' | 'images' | 'games' | 'data' | 'webs';
  type?: string;
}

// Alias for backward compatibility - Lab services use 'Artifact'
export type Artifact = LabArtifact;

// Artifact Categories for UI
export const ARTIFACT_CATEGORIES: ArtifactCategory[] = [
  {
    id: 'docs',
    name: 'Docs / PDFs / PowerPoints',
    icon: '📄',
    types: [
      { id: 'doc', name: 'Document', description: 'Formatted text documents with rich content' },
      { id: 'slides', name: 'Slides', description: 'Presentation slides with visual layouts' },
      { id: 'pdf', name: 'PDF', description: 'Professional document layouts' }
    ],
    description: 'Documents, presentations, and formatted content'
  },
  {
    id: 'images',
    name: 'Images / Visual Tools',
    icon: '🖼️',
    types: [
      { id: 'diagram', name: 'Diagram', description: 'Technical diagrams and flowcharts' },
      { id: 'sketch', name: 'Sketch', description: 'Hand-drawn style illustrations' },
      { id: 'photo', name: 'Photo', description: 'Realistic image compositions' }
    ],
    description: 'Visual content, graphics, and design tools'
  },
  {
    id: 'games',
    name: 'Mini-games / Interactive',
    icon: '🧩',
    types: [
      { id: 'puzzles', name: 'Puzzles', description: 'Mind-bending puzzle games' },
      { id: 'rpg', name: 'RPG', description: 'Role-playing game experiences' },
      { id: 'flashcards', name: 'Flashcards', description: 'Interactive learning cards' },
      { id: 'arcade', name: 'Arcade', description: 'Classic arcade-style games' },
      { id: 'retro', name: 'Retro', description: 'Nostalgic retro games' }
    ],
    description: 'Simple games and interactive experiences'
  },
  {
    id: 'data',
    name: 'Data / Tables / Visualizations',
    icon: '📊',
    types: [
      { id: 'table', name: 'Table', description: 'Sortable and filterable data tables' },
      { id: 'graph', name: 'Graph', description: 'Charts and statistical visualizations' },
      { id: 'diagram', name: 'Diagram', description: 'Data flow and process diagrams' }
    ],
    description: 'Data visualization and analysis tools'
  },
  {
    id: 'webs',
    name: 'Web Apps / Landing Pages',
    icon: '🌐',
    types: [
      { id: 'spa', name: 'Single Page App', description: 'Interactive web applications' },
      { id: 'landing', name: 'Landing Page', description: 'Marketing and promotional pages' },
      { id: 'personal', name: 'Personal Page', description: 'Portfolio and profile pages' }
    ],
    description: 'Complete web applications and pages'
  }
];