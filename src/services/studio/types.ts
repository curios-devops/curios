/**
 * Studio Service Types
 * Note: These are independent from the old Labs service types
 */

import type { TTSVoice } from './audio/ttsService';

export type StudioOutputType = 'video' | 'short' | 'reel';

export interface StudioCategory {
  id: string;
  name: string;
  types: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

export interface PlanDetail {
  step: string;
  detail: string;
}

export interface StepItem {
  name: string;
  status: 'pending' | 'in_progress' | 'complete';
  agentStatus?: string;
  agentName?: string;
  thinkingSince?: number;
}

/**
 * Scene Types for Video Rendering
 */
export type SceneStyle = 'hook' | 'explain' | 'takeaway' | 'outro';

export interface VideoScene {
  from: number;         // Start frame
  to: number;           // End frame
  text: string;         // On-screen text
  style: SceneStyle;    // Visual style
  chapter?: string;     // Chapter title (from script)
  
  // Phase 4: Video backgrounds (Pexels)
  videoUrl?: string;    // Optional stock video URL for background
  videoKeywords?: string; // Keywords used to search for video
  
  // Phase 5: Audio narration (OpenAI TTS)
  audioUrl?: string;    // Optional TTS audio URL
  audioDuration?: number; // Audio duration in seconds
  audioVoice?: TTSVoice;  // Voice used for TTS
  
  // Phase 6A: Image overlays (Brave Search)
  imageUrl?: string;    // Brave image URL for overlay
  imageKeywords?: string; // Engineered query used to search
  imageEffect?: 'zoom' | 'blur' | 'ken-burns' | 'fade'; // Visual effect
  imageDuration?: number; // How long image shows (seconds)
  imagePosition?: 'center' | 'top' | 'bottom'; // Overlay position
  imageOpacity?: number; // 0-1 (default: 0.8)
}

export interface SceneStructure {
  duration: number;     // Total duration in seconds
  fps: number;          // Frames per second (30 or 60)
  scenes: VideoScene[];
}

export interface StudioVideo {
  id?: string;
  type: StudioOutputType;
  content: string;
  keyIdeas?: string; // Streamed key ideas (bullet points)
  script?: string; // Video script (hook, explanation, takeaway)
  description?: string; // Short plain text summary for YouTube-style description
  scenes?: SceneStructure; // Structured scenes for video rendering
  title?: string;
  planDetails?: PlanDetail[];
  steps?: StepItem[];
  thinkingLog?: string[];
  createdAt?: Date;
  userId?: string;
  duration?: number; // in seconds
  format?: 'vertical' | 'horizontal';
  videoUrl?: string;
  renderProgress?: number; // 0-100 percentage of video rendering progress
}

export const STUDIO_CATEGORIES: StudioCategory[] = [
  {
    id: 'videos',
    name: 'Videos',
    types: [
      { id: 'video', name: 'Explainer Video', description: 'Short curiosity-driven video explainer (10-60s)' },
      { id: 'short', name: 'YouTube Short', description: 'Vertical format for YouTube Shorts' },
      { id: 'reel', name: 'Instagram Reel', description: 'Optimized for Instagram and TikTok' },
    ],
  },
];

// ============================================
// CLIENT-SIDE CHAPTER RENDERING TYPES
// ============================================

/**
 * Chapter Plan - Output del LLM
 */
export interface ChapterPlan {
  chapters: ChapterInfo[];
  totalDuration: number;
  title: string;
  description: string;
  videoId?: string;
}

export interface ChapterInfo {
  id: string;              // "chapter_001"
  order: number;           // 1, 2, 3...
  duration: number;        // 5-10 segundos
  narration: string;       // Texto para TTS
  visualCues: string[];    // Qué mostrar visualmente
  keywords: string[];      // Para búsqueda de imágenes
}

/**
 * Chapter Descriptor - Listo para renderizar
 */
export interface ChapterDescriptor {
  id: string;
  order: number;
  duration: number;
  assets: ChapterAssets;
  timeline: TimelineEntry[];
  text: string;
  free: boolean;           // true por ahora (monetización futura)
}

export interface ChapterAssets {
  images: ImageAsset[];
  audio: Blob;             // Audio TTS
  music?: Blob;            // Música de fondo (opcional)
}

export interface ImageAsset {
  url: string;
  alt?: string;
  position?: 'full' | 'top' | 'center' | 'bottom';
}

/**
 * Timeline - Define qué mostrar y cuándo
 */
export interface TimelineEntry {
  timestamp: number;       // Segundos desde inicio del chapter
  action: TimelineAction;
  data: any;              // Depende del action
  duration?: number;      // Duración de la acción (opcional)
}

export type TimelineAction = 
  | 'show-image' 
  | 'show-text' 
  | 'fade-in' 
  | 'fade-out'
  | 'pan'
  | 'zoom';

/**
 * Rendering Progress
 */
export interface RenderProgress {
  chapterId: string;
  progress: number;        // 0-100
  status: 'pending' | 'rendering' | 'complete' | 'error';
  error?: string;
}

/**
 * Chapter Metadata (para Supabase)
 */
export interface ChapterMetadata {
  id: string;
  videoId: string;
  chapterId: string;
  order: number;
  duration: number;
  storageUrl: string;
  free: boolean;
  renderTime?: number;     // ms
  fileSize?: number;       // bytes
  userId?: string;         // null = 'curios' guest user
  createdAt: Date;
}