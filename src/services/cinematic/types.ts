/**
 * CinematicAI Type Definitions
 * Cinematic video generation using Google Veo 3.1
 */

/**
 * Cinematic Scene Types
 */
export type CinematicSceneType = 'hook' | 'explanation' | 'insight' | 'conclusion';

export type CinematicEmotion =
  | 'mystery'
  | 'wonder'
  | 'calm'
  | 'excitement'
  | 'clarity'
  | 'curiosity';

export type CameraMotion =
  | 'static'
  | 'slow_zoom_in'
  | 'slow_zoom_out'
  | 'pan_left'
  | 'pan_right'
  | 'orbit'
  | 'dolly_in'
  | 'dolly_out';

export type LightingStyle =
  | 'dramatic'
  | 'natural'
  | 'golden_hour'
  | 'soft'
  | 'high_contrast'
  | 'low_key';

export type TransitionType =
  | 'fade'
  | 'dissolve'
  | 'wipe'
  | 'zoom_through'
  | 'none';

/**
 * Structured Explanation (from LLM)
 */
export interface StructuredExplanation {
  topic: string;
  category: VideoCategory;
  hook: string;
  keyPoints: ExplanationPoint[];
  mindBlowMoment: string;
  conclusion: string;
  estimatedDuration: number; // 20-30 seconds
}

export interface ExplanationPoint {
  concept: string;
  explanation: string;
  visualHint: string; // Hint for video generation prompt
  emotion: CinematicEmotion;
}

export type VideoCategory =
  | 'science'
  | 'nature'
  | 'history'
  | 'culture'
  | 'technology'
  | 'space';

/**
 * Cinematic Scene (for video generation)
 */
export interface CinematicScene {
  id: string;
  index: number;
  type: CinematicSceneType;

  // Content
  text: string; // On-screen text overlay
  narration?: string; // For future TTS integration

  // Timing
  startTime: number; // seconds
  endTime: number;
  duration: number; // 4-6 seconds

  // Visual Direction
  visualHint: string; // Description for video generator
  emotion: CinematicEmotion;
  cameraMotion: CameraMotion;
  lighting: LightingStyle;

  // Video Generation (Veo)
  videoPrompt: string; // Engineered prompt for video generation
  videoUrl?: string; // URL after generation
  generationId?: string;

  // Composition
  transition: TransitionType;
  textPosition: 'top' | 'center' | 'bottom';
  textStyle: TextStyle;
}

export interface TextStyle {
  fontSize: number;
  fontWeight: number;
  color: string;
  shadowIntensity: 'low' | 'medium' | 'high';
}

/**
 * Cinematic Recipe (complete video plan)
 */
export interface CinematicRecipe {
  videoId: string;
  query: string;
  category: VideoCategory;

  // Scenes
  scenes: CinematicScene[];
  totalDuration: number;

  // Format
  format: 'vertical' | 'horizontal';
  aspectRatio: '9:16' | '16:9';

  // Visual Thread
  relatedQueries?: string[];

  // Metadata
  createdAt: Date;
  userId?: string;
}

/**
 * Cinematic Video (final output)
 */
export interface CinematicVideo {
  id: string;
  query: string;
  recipe: CinematicRecipe;

  // Status
  status: 'generating' | 'composing' | 'complete' | 'failed';
  progress: number; // 0-100
  currentStage: string;

  // Assets
  sceneVideos: Map<string, string>; // sceneId -> video URL
  finalVideoUrl?: string;

  // Metadata
  title: string;
  description: string;
  duration: number;
  format: 'vertical' | 'horizontal';

  // Analytics
  viewCount?: number;
  shareCount?: number;
  generationTimeMs?: number;

  createdAt: Date;
  userId?: string;
}

/**
 * Progress Callback
 */
export interface CinematicProgress {
  stage: 'planning' | 'generating' | 'composing' | 'complete';
  progress: number; // 0-100
  message: string;
  sceneProgress?: SceneProgress[];
}

export interface SceneProgress {
  sceneId: string;
  sceneIndex: number;
  status: 'pending' | 'created' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  generationId?: string;
  error?: string;
  provider?: 'veo' | 'pexels'; // Track which provider was used
  retryCount?: number; // Track retry attempts
}

/**
 * Video Generation API Types (Generic, used by Veo)
 */
export interface VideoGenerationRequest {
  prompt: string;
  duration?: number; // seconds (optional, Veo determines best duration)
  aspectRatio?: '9:16' | '16:9' | '1:1';
  quality?: 'standard' | 'hd';
  style?: 'cinematic' | 'documentary' | 'photorealistic' | 'stylized';
}

export interface VideoGenerationResult {
  videoUrl: string; // Can be local path or remote URL
  duration: number;
  width: number;
  height: number;
  generationId: string;
}

// ============================================
// DIRECTOR REFACTOR v3 - New Types
// ============================================

/**
 * Scene scoring components (Critic Agent)
 */
export interface SceneScore {
  relevance: number;        // 0-1: Match entre stock clip y prompt
  specificity: number;      // 0-1: Qué tan específico es el prompt
  visualComplexity: number; // 0-1: Complejidad visual requerida
  narrativeWeight: number;  // 0-1: Importancia en la historia
}

/**
 * Generation result with engine info
 */
export interface GenerationResult {
  clip: VideoGenerationResult;
  engine: 'STOCK' | 'LTX' | 'WAN' | 'VEO';
  state: 'Preview' | 'Draft' | 'Enhanced' | 'Quality';
  score?: number;
  stockScore?: number;
}
