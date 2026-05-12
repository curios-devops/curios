# 🎬 CinematicAI Implementation with OpenAI Sora

## Executive Summary

This document provides the complete implementation plan for **CinematicAI** - a feature that generates cinematic video explanations (20-30s) using **OpenAI Sora** for scene generation. This implementation leverages the existing Studio infrastructure and extends it with Sora's AI video generation capabilities.

**Key Innovation:** Each scene (4-6s) is generated independently by Sora, then stitched together to create a cohesive cinematic narrative.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [OpenAI Sora Integration](#2-openai-sora-integration)
3. [Service Implementation](#3-service-implementation)
4. [Agent System](#4-agent-system)
5. [Video Pipeline](#5-video-pipeline)
6. [UI/UX Implementation](#6-uiux-implementation)
7. [API Configuration](#7-api-configuration)
8. [Implementation Phases](#8-implementation-phases)
9. [Testing Strategy](#9-testing-strategy)
10. [Deployment](#10-deployment)

---

## 1. Architecture Overview

### 1.1 System Flow

```
User Query (Homepage)
    ↓
AnswerLLM (OpenAI GPT-4)
  → Generates structured explanation
    ↓
SceneDirectorAgent
  → Converts explanation to cinematic scenes
  → Generates Sora prompts for each scene
    ↓
SoraSceneGenerator (Parallel)
  → Scene 1 (Hook) → Sora API → Video URL
  → Scene 2 (Explain) → Sora API → Video URL
  → Scene 3 (Explain) → Sora API → Video URL
  → Scene 4 (Insight) → Sora API → Video URL
  → Scene 5 (Conclusion) → Sora API → Video URL
    ↓
VideoComposer
  → Adds text overlays to each scene
  → Stitches scenes with transitions
    ↓
Final Cinematic Video (20-30s)
```

### 1.2 Directory Structure

```
src/
├── services/
│   └── cinematic/                     # NEW: CinematicAI service
│       ├── agents/
│       │   ├── AnswerLLMAgent.ts      # Structured explanation generator
│       │   ├── SceneDirectorAgent.ts  # Scene planning & Sora prompt engineering
│       │   ├── SoraSceneGenerator.ts  # OpenAI Sora API wrapper
│       │   └── CinematicOrchestrator.ts # Main workflow coordinator
│       ├── composers/
│       │   ├── TextOverlayComposer.ts # Add text overlays to Sora videos
│       │   ├── VideoStitcher.ts       # Stitch multiple scenes together
│       │   └── TransitionEngine.ts    # Scene transitions (fade, dissolve, etc.)
│       ├── providers/
│       │   ├── SoraProvider.ts        # OpenAI Sora API client
│       │   └── FFmpegProvider.ts      # Video processing utility
│       ├── cache/
│       │   └── VideoCache.ts          # Cache Sora-generated videos
│       └── types.ts                   # CinematicAI type definitions
│
├── components/
│   └── cinematic/                     # NEW: CinematicAI UI components
│       ├── CinematicPlayer.tsx        # Video player with scene preview
│       ├── SceneProgressBar.tsx       # Visual timeline of scenes
│       ├── VisualThreadSuggestions.tsx # Related video suggestions
│       └── CinematicLoadingState.tsx  # Scene-by-scene loading UI
│
└── pages/
    └── CinematicResults.tsx           # Main results page (extends StudioResults)
```

### 1.3 Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **AI Video Generation** | OpenAI Sora | Generate cinematic scenes |
| **LLM Processing** | OpenAI GPT-4 Turbo | Scene planning & prompts |
| **Video Processing** | FFmpeg (via fluent-ffmpeg) | Overlay text, stitch scenes |
| **Video Storage** | Supabase Storage | Cache generated videos |
| **UI Framework** | React + TypeScript | Frontend components |
| **State Management** | React Hooks | Real-time progress updates |

---

## 2. OpenAI Sora Integration

### 2.1 Sora API Overview

OpenAI Sora generates high-quality video clips from text prompts. Key capabilities:
- **Duration:** 2-10 seconds per clip
- **Resolution:** Up to 1080p (vertical or horizontal)
- **Quality:** Cinematic, photorealistic, or stylized
- **Prompt-based:** Detailed text descriptions

**API Endpoint:**
```
POST https://api.openai.com/v1/video/generations
```

### 2.2 Sora Provider Implementation

**File:** `/src/services/cinematic/providers/SoraProvider.ts`

```typescript
import OpenAI from 'openai';

export interface SoraGenerationRequest {
  prompt: string;
  duration: number; // seconds (2-10)
  aspectRatio: '9:16' | '16:9' | '1:1';
  quality: 'standard' | 'hd';
  style?: 'cinematic' | 'documentary' | 'photorealistic' | 'stylized';
}

export interface SoraGenerationResult {
  videoUrl: string;
  duration: number;
  width: number;
  height: number;
  generationId: string;
}

export class SoraProvider {
  private client: OpenAI;
  private maxRetries = 3;
  private pollingInterval = 2000; // 2 seconds

  constructor() {
    this.client = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    });
  }

  /**
   * Generate a video clip using Sora
   * Returns a URL to the generated video
   */
  async generate(request: SoraGenerationRequest): Promise<SoraGenerationResult> {
    console.log('[Sora] Generating video:', request.prompt.slice(0, 50) + '...');

    // Start generation
    const generation = await this.client.video.generations.create({
      model: 'sora-1.0',
      prompt: request.prompt,
      duration: request.duration,
      aspect_ratio: request.aspectRatio,
      quality: request.quality,
      style: request.style,
    });

    // Poll for completion
    const result = await this.pollForCompletion(generation.id);

    console.log('[Sora] Video generated:', result.videoUrl);

    return {
      videoUrl: result.url,
      duration: result.duration,
      width: result.width,
      height: result.height,
      generationId: generation.id,
    };
  }

  /**
   * Poll Sora API until video generation is complete
   */
  private async pollForCompletion(generationId: string): Promise<any> {
    const maxAttempts = 60; // 2 minutes max (60 * 2s)
    let attempts = 0;

    while (attempts < maxAttempts) {
      const status = await this.client.video.generations.retrieve(generationId);

      if (status.status === 'completed') {
        return status.output;
      }

      if (status.status === 'failed') {
        throw new Error(`Sora generation failed: ${status.error?.message || 'Unknown error'}`);
      }

      // Wait before next poll
      await this.sleep(this.pollingInterval);
      attempts++;
    }

    throw new Error('Sora generation timeout (exceeded 2 minutes)');
  }

  /**
   * Generate multiple scenes in parallel
   */
  async generateBatch(
    requests: SoraGenerationRequest[],
    maxParallel: number = 3
  ): Promise<SoraGenerationResult[]> {
    const results: SoraGenerationResult[] = [];

    // Process in batches of maxParallel
    for (let i = 0; i < requests.length; i += maxParallel) {
      const batch = requests.slice(i, i + maxParallel);
      const batchResults = await Promise.all(
        batch.map((req) => this.generate(req))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Check if Sora API is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test with minimal generation
      await this.generate({
        prompt: 'A simple test scene',
        duration: 2,
        aspectRatio: '16:9',
        quality: 'standard',
      });
      return true;
    } catch (error) {
      console.error('[Sora] Health check failed:', error);
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### 2.3 Prompt Engineering for Sora

**Key Principles:**
1. **Be specific and detailed** - Sora works best with rich descriptions
2. **Include camera motion** - "slow zoom in", "pan left to right"
3. **Describe lighting** - "golden hour lighting", "dramatic shadows"
4. **Set the mood** - "mysterious atmosphere", "uplifting tone"
5. **Specify subject focus** - What's the main subject in the frame

**Example Prompts:**

```typescript
const SORA_PROMPT_TEMPLATES = {
  hook: (concept: string, emotion: string) => `
Cinematic opening shot: ${concept}
Camera: Slow zoom in, establishing shot
Lighting: ${emotion === 'mystery' ? 'Dramatic, low-key lighting with shadows' : 'Bright, natural lighting'}
Mood: ${emotion}, attention-grabbing
Style: Professional documentary
Duration: 4 seconds
Resolution: 1080x1920 (vertical)
  `.trim(),

  explanation: (visualHint: string, emotion: string) => `
${visualHint}
Camera: Smooth pan, medium shot
Lighting: Clear, even lighting for visibility
Mood: ${emotion}, educational
Style: Clean, professional
Duration: 5 seconds
Resolution: 1080x1920 (vertical)
  `.trim(),

  insight: (mindBlowConcept: string) => `
Mind-blowing reveal: ${mindBlowConcept}
Camera: Dramatic zoom out or orbit
Lighting: Golden hour, cinematic glow
Mood: Wonder, awe-inspiring
Style: Cinematic, high production value
Duration: 6 seconds
Resolution: 1080x1920 (vertical)
  `.trim(),

  conclusion: (closing: string) => `
${closing}
Camera: Static or slow pull back
Lighting: Soft, calming
Mood: Satisfying, conclusive
Style: Polished, professional
Duration: 4 seconds
Resolution: 1080x1920 (vertical)
  `.trim(),
};
```

---

## 3. Service Implementation

### 3.1 Type Definitions

**File:** `/src/services/cinematic/types.ts`

```typescript
import { StudioOutputType } from '../studio/types';

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
  visualHint: string; // Hint for Sora prompt
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
 * Cinematic Scene (for Sora generation)
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
  visualHint: string; // Description for Sora
  emotion: CinematicEmotion;
  cameraMotion: CameraMotion;
  lighting: LightingStyle;

  // Sora Generation
  soraPrompt: string; // Engineered prompt for Sora
  soraVideoUrl?: string; // URL after generation
  soraGenerationId?: string;

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
  status: 'pending' | 'generating' | 'complete' | 'failed';
  progress: number; // 0-100
  soraGenerationId?: string;
  error?: string;
}
```

### 3.2 Answer LLM Agent

**File:** `/src/services/cinematic/agents/AnswerLLMAgent.ts`

```typescript
import OpenAI from 'openai';
import { StructuredExplanation } from '../types';

export class AnswerLLMAgent {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    });
  }

  async generateExplanation(query: string): Promise<StructuredExplanation> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(query);

    const response = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return this.validateExplanation(result);
  }

  private buildSystemPrompt(): string {
    return `You are a world-class educator who creates cinematic video explanations.

Your goal: Transform questions into compelling visual narratives with:
1. A strong hook (attention-grabbing opening)
2. Clear key points (2-3 main concepts)
3. A mind-blow moment (surprising insight)
4. A satisfying conclusion

Guidelines:
- Use conversational, accessible language
- Each point should be 1-2 sentences max
- Include detailed visual hints for AI video generation
- Assign emotional tone to each point
- Total duration: 20-30 seconds
- Focus on ONE clear narrative arc

IMPORTANT: Visual hints should be specific and rich in detail.
Think: "What would look amazing as a cinematic video?"

Return JSON only.`;
  }

  private buildUserPrompt(query: string): string {
    return `Create a cinematic explanation for: "${query}"

Return JSON:
{
  "topic": "Clear topic name",
  "category": "science|nature|history|culture|technology|space",
  "hook": "Attention-grabbing opening statement",
  "keyPoints": [
    {
      "concept": "Main idea",
      "explanation": "1-2 sentence explanation",
      "visualHint": "Detailed description for cinematic video (include camera, lighting, subject, mood)",
      "emotion": "mystery|wonder|calm|excitement|clarity|curiosity"
    }
  ],
  "mindBlowMoment": "Surprising insight or fact",
  "conclusion": "Satisfying closing statement",
  "estimatedDuration": 25
}`;
  }

  private validateExplanation(data: any): StructuredExplanation {
    if (!data.topic || !data.hook || !data.keyPoints) {
      throw new Error('Invalid explanation structure from LLM');
    }

    // Ensure duration is reasonable
    if (data.estimatedDuration < 20 || data.estimatedDuration > 30) {
      data.estimatedDuration = 25;
    }

    return data as StructuredExplanation;
  }
}
```

### 3.3 Scene Director Agent

**File:** `/src/services/cinematic/agents/SceneDirectorAgent.ts`

```typescript
import { v4 as uuidv4 } from 'uuid';
import {
  StructuredExplanation,
  CinematicScene,
  CinematicRecipe,
  CinematicSceneType,
  CameraMotion,
  LightingStyle,
  TransitionType,
} from '../types';

export class SceneDirectorAgent {
  /**
   * Convert structured explanation into cinematic scenes with Sora prompts
   */
  async directScenes(
    explanation: StructuredExplanation,
    format: 'vertical' | 'horizontal'
  ): Promise<CinematicRecipe> {
    const videoId = this.generateVideoId();
    const aspectRatio = format === 'vertical' ? '9:16' : '16:9';

    const scenes: CinematicScene[] = [];
    let currentTime = 0;

    // 1. Hook scene (4s)
    scenes.push(this.createHookScene(explanation, currentTime, aspectRatio));
    currentTime += scenes[scenes.length - 1].duration;

    // 2. Explanation scenes (5s each)
    for (const point of explanation.keyPoints) {
      scenes.push(
        this.createExplanationScene(point, scenes.length, currentTime, aspectRatio)
      );
      currentTime += scenes[scenes.length - 1].duration;
    }

    // 3. Mind-blow insight scene (6s)
    scenes.push(this.createInsightScene(explanation, scenes.length, currentTime, aspectRatio));
    currentTime += scenes[scenes.length - 1].duration;

    // 4. Conclusion scene (4s)
    scenes.push(this.createConclusionScene(explanation, scenes.length, currentTime, aspectRatio));
    currentTime += scenes[scenes.length - 1].duration;

    // Generate related queries
    const relatedQueries = this.generateRelatedQueries(explanation);

    return {
      videoId,
      query: explanation.topic,
      category: explanation.category,
      scenes,
      totalDuration: currentTime,
      format,
      aspectRatio,
      relatedQueries,
      createdAt: new Date(),
    };
  }

  private createHookScene(
    explanation: StructuredExplanation,
    startTime: number,
    aspectRatio: string
  ): CinematicScene {
    const duration = 4;
    const sceneId = this.generateSceneId();

    const soraPrompt = this.buildSoraPrompt({
      type: 'hook',
      content: explanation.hook,
      emotion: 'mystery',
      visualHint: explanation.hook,
      aspectRatio,
    });

    return {
      id: sceneId,
      index: 0,
      type: 'hook',
      text: explanation.hook,
      startTime,
      endTime: startTime + duration,
      duration,
      visualHint: explanation.hook,
      emotion: 'mystery',
      cameraMotion: 'slow_zoom_in',
      lighting: 'dramatic',
      soraPrompt,
      transition: 'none',
      textPosition: 'bottom',
      textStyle: {
        fontSize: 80,
        fontWeight: 700,
        color: '#ffffff',
        shadowIntensity: 'high',
      },
    };
  }

  private createExplanationScene(
    point: any,
    index: number,
    startTime: number,
    aspectRatio: string
  ): CinematicScene {
    const duration = 5;
    const sceneId = this.generateSceneId();

    const soraPrompt = this.buildSoraPrompt({
      type: 'explanation',
      content: point.explanation,
      emotion: point.emotion,
      visualHint: point.visualHint,
      aspectRatio,
    });

    return {
      id: sceneId,
      index,
      type: 'explanation',
      text: point.explanation,
      startTime,
      endTime: startTime + duration,
      duration,
      visualHint: point.visualHint,
      emotion: point.emotion,
      cameraMotion: this.selectCameraMotion(point.emotion),
      lighting: 'natural',
      soraPrompt,
      transition: 'dissolve',
      textPosition: 'bottom',
      textStyle: {
        fontSize: 60,
        fontWeight: 600,
        color: '#ffffff',
        shadowIntensity: 'medium',
      },
    };
  }

  private createInsightScene(
    explanation: StructuredExplanation,
    index: number,
    startTime: number,
    aspectRatio: string
  ): CinematicScene {
    const duration = 6;
    const sceneId = this.generateSceneId();

    const soraPrompt = this.buildSoraPrompt({
      type: 'insight',
      content: explanation.mindBlowMoment,
      emotion: 'wonder',
      visualHint: explanation.mindBlowMoment,
      aspectRatio,
    });

    return {
      id: sceneId,
      index,
      type: 'insight',
      text: explanation.mindBlowMoment,
      startTime,
      endTime: startTime + duration,
      duration,
      visualHint: explanation.mindBlowMoment,
      emotion: 'wonder',
      cameraMotion: 'slow_zoom_out',
      lighting: 'golden_hour',
      soraPrompt,
      transition: 'zoom_through',
      textPosition: 'center',
      textStyle: {
        fontSize: 72,
        fontWeight: 700,
        color: '#FFD700', // Gold for mind-blow
        shadowIntensity: 'high',
      },
    };
  }

  private createConclusionScene(
    explanation: StructuredExplanation,
    index: number,
    startTime: number,
    aspectRatio: string
  ): CinematicScene {
    const duration = 4;
    const sceneId = this.generateSceneId();

    const soraPrompt = this.buildSoraPrompt({
      type: 'conclusion',
      content: explanation.conclusion,
      emotion: 'clarity',
      visualHint: explanation.conclusion,
      aspectRatio,
    });

    return {
      id: sceneId,
      index,
      type: 'conclusion',
      text: explanation.conclusion,
      startTime,
      endTime: startTime + duration,
      duration,
      visualHint: explanation.conclusion,
      emotion: 'clarity',
      cameraMotion: 'static',
      lighting: 'soft',
      soraPrompt,
      transition: 'fade',
      textPosition: 'bottom',
      textStyle: {
        fontSize: 60,
        fontWeight: 600,
        color: '#ffffff',
        shadowIntensity: 'medium',
      },
    };
  }

  /**
   * Build engineered Sora prompt
   */
  private buildSoraPrompt(params: {
    type: CinematicSceneType;
    content: string;
    emotion: string;
    visualHint: string;
    aspectRatio: string;
  }): string {
    const { type, content, emotion, visualHint, aspectRatio } = params;

    // Base cinematic qualities
    const quality = 'Cinematic 4K quality, professional cinematography';
    const resolution = aspectRatio === '9:16' ? '1080x1920 vertical' : '1920x1080 horizontal';

    switch (type) {
      case 'hook':
        return `
Opening cinematic shot: ${visualHint}
Camera: Slow zoom in, dramatic entrance, establishing shot
Lighting: Dramatic shadows, high contrast, ${emotion} atmosphere
Mood: Attention-grabbing, ${emotion}, mysterious
Subject: Clear focus on main element
${quality}
Duration: 4 seconds
${resolution}
        `.trim();

      case 'explanation':
        return `
${visualHint}
Camera: Smooth pan or gentle movement, medium shot
Lighting: Clear, even lighting, naturally lit scene
Mood: ${emotion}, educational, clear and focused
Subject: Well-framed, easy to understand
${quality}
Duration: 5 seconds
${resolution}
        `.trim();

      case 'insight':
        return `
Mind-blowing reveal: ${visualHint}
Camera: Dramatic zoom out or slow orbit, revealing shot
Lighting: Golden hour glow, cinematic backlighting
Mood: Wonder, awe-inspiring, breathtaking
Subject: Stunning visual moment, "wow" factor
${quality}
Duration: 6 seconds
${resolution}
        `.trim();

      case 'conclusion':
        return `
Closing shot: ${visualHint}
Camera: Static or gentle pull back, conclusive framing
Lighting: Soft, warm, calming atmosphere
Mood: Satisfying, peaceful, clear resolution
Subject: Final memorable image
${quality}
Duration: 4 seconds
${resolution}
        `.trim();

      default:
        return visualHint;
    }
  }

  private selectCameraMotion(emotion: string): CameraMotion {
    const motionMap: Record<string, CameraMotion> = {
      mystery: 'slow_zoom_in',
      wonder: 'slow_zoom_out',
      calm: 'static',
      excitement: 'dolly_in',
      clarity: 'pan_right',
      curiosity: 'orbit',
    };

    return motionMap[emotion] || 'static';
  }

  private generateRelatedQueries(explanation: StructuredExplanation): string[] {
    return [
      `How does ${explanation.topic} work?`,
      `${explanation.topic} explained in detail`,
      `The future of ${explanation.topic}`,
      `${explanation.topic} vs alternatives`,
    ];
  }

  private generateVideoId(): string {
    return `cinematic_${Date.now()}_${uuidv4().slice(0, 8)}`;
  }

  private generateSceneId(): string {
    return `scene_${uuidv4().slice(0, 8)}`;
  }
}
```

### 3.4 Sora Scene Generator

**File:** `/src/services/cinematic/agents/SoraSceneGenerator.ts`

```typescript
import { SoraProvider, SoraGenerationRequest } from '../providers/SoraProvider';
import { CinematicScene, SceneProgress } from '../types';

export class SoraSceneGenerator {
  private soraProvider: SoraProvider;

  constructor() {
    this.soraProvider = new SoraProvider();
  }

  /**
   * Generate all scenes in parallel using Sora
   */
  async generateScenes(
    scenes: CinematicScene[],
    onProgress?: (progress: SceneProgress[]) => void
  ): Promise<Map<string, string>> {
    console.log(`[CinematicAI] Generating ${scenes.length} scenes with Sora...`);

    // Initialize progress tracking
    const sceneProgress: SceneProgress[] = scenes.map((scene) => ({
      sceneId: scene.id,
      sceneIndex: scene.index,
      status: 'pending',
      progress: 0,
    }));

    if (onProgress) {
      onProgress([...sceneProgress]);
    }

    // Generate scenes in batches of 3 (to avoid rate limits)
    const sceneVideos = new Map<string, string>();
    const batchSize = 3;

    for (let i = 0; i < scenes.length; i += batchSize) {
      const batch = scenes.slice(i, i + batchSize);
      const batchRequests: SoraGenerationRequest[] = batch.map((scene) => ({
        prompt: scene.soraPrompt,
        duration: scene.duration,
        aspectRatio: scene.id.includes('vertical') ? '9:16' : '16:9',
        quality: 'hd',
        style: 'cinematic',
      }));

      // Mark as generating
      for (const scene of batch) {
        const idx = scenes.findIndex((s) => s.id === scene.id);
        sceneProgress[idx].status = 'generating';
        sceneProgress[idx].progress = 50;
      }

      if (onProgress) {
        onProgress([...sceneProgress]);
      }

      // Generate batch
      try {
        const results = await this.soraProvider.generateBatch(batchRequests);

        // Store results
        for (let j = 0; j < batch.length; j++) {
          const scene = batch[j];
          const result = results[j];

          sceneVideos.set(scene.id, result.videoUrl);

          // Mark as complete
          const idx = scenes.findIndex((s) => s.id === scene.id);
          sceneProgress[idx].status = 'complete';
          sceneProgress[idx].progress = 100;
          sceneProgress[idx].soraGenerationId = result.generationId;

          console.log(`[CinematicAI] Scene ${scene.index} generated: ${result.videoUrl}`);
        }
      } catch (error) {
        console.error('[CinematicAI] Batch generation failed:', error);

        // Mark batch as failed
        for (const scene of batch) {
          const idx = scenes.findIndex((s) => s.id === scene.id);
          sceneProgress[idx].status = 'failed';
          sceneProgress[idx].error = error instanceof Error ? error.message : 'Unknown error';
        }

        throw error;
      }

      if (onProgress) {
        onProgress([...sceneProgress]);
      }
    }

    console.log(`[CinematicAI] All ${scenes.length} scenes generated successfully`);
    return sceneVideos;
  }

  /**
   * Regenerate a single scene
   */
  async regenerateScene(scene: CinematicScene): Promise<string> {
    console.log(`[CinematicAI] Regenerating scene ${scene.index}...`);

    const result = await this.soraProvider.generate({
      prompt: scene.soraPrompt,
      duration: scene.duration,
      aspectRatio: scene.id.includes('vertical') ? '9:16' : '16:9',
      quality: 'hd',
      style: 'cinematic',
    });

    return result.videoUrl;
  }
}
```

---

## 4. Agent System

### 4.1 Cinematic Orchestrator

**File:** `/src/services/cinematic/agents/CinematicOrchestrator.ts`

```typescript
import { AnswerLLMAgent } from './AnswerLLMAgent';
import { SceneDirectorAgent } from './SceneDirectorAgent';
import { SoraSceneGenerator } from './SoraSceneGenerator';
import { VideoComposer } from '../composers/VideoComposer';
import { CinematicVideo, CinematicProgress, SceneProgress } from '../types';

export class CinematicOrchestrator {
  private answerAgent: AnswerLLMAgent;
  private directorAgent: SceneDirectorAgent;
  private sceneGenerator: SoraSceneGenerator;
  private videoComposer: VideoComposer;

  constructor() {
    this.answerAgent = new AnswerLLMAgent();
    this.directorAgent = new SceneDirectorAgent();
    this.sceneGenerator = new SoraSceneGenerator();
    this.videoComposer = new VideoComposer();
  }

  /**
   * Main orchestration method
   */
  async generateCinematicVideo(
    query: string,
    format: 'vertical' | 'horizontal',
    onProgress?: (progress: CinematicProgress) => void
  ): Promise<CinematicVideo> {
    const startTime = Date.now();

    try {
      // Stage 1: Planning (5%)
      this.updateProgress(onProgress, {
        stage: 'planning',
        progress: 5,
        message: 'Analyzing query and planning cinematic structure...',
      });

      const explanation = await this.answerAgent.generateExplanation(query);

      // Stage 2: Scene Direction (15%)
      this.updateProgress(onProgress, {
        stage: 'planning',
        progress: 15,
        message: 'Creating scene structure and Sora prompts...',
      });

      const recipe = await this.directorAgent.directScenes(explanation, format);

      // Stage 3: Generate scenes with Sora (20% - 80%)
      this.updateProgress(onProgress, {
        stage: 'generating',
        progress: 20,
        message: `Generating ${recipe.scenes.length} cinematic scenes with Sora...`,
      });

      const sceneVideos = await this.sceneGenerator.generateScenes(
        recipe.scenes,
        (sceneProgress: SceneProgress[]) => {
          // Calculate overall progress (20% base + up to 60% for scenes)
          const completedScenes = sceneProgress.filter((s) => s.status === 'complete').length;
          const totalScenes = sceneProgress.length;
          const sceneProgressPercent = (completedScenes / totalScenes) * 60;

          this.updateProgress(onProgress, {
            stage: 'generating',
            progress: 20 + sceneProgressPercent,
            message: `Generated ${completedScenes}/${totalScenes} scenes`,
            sceneProgress,
          });
        }
      );

      // Stage 4: Compose final video (80% - 95%)
      this.updateProgress(onProgress, {
        stage: 'composing',
        progress: 85,
        message: 'Adding text overlays and composing final video...',
      });

      const finalVideoUrl = await this.videoComposer.compose(recipe, sceneVideos);

      // Stage 5: Complete (100%)
      this.updateProgress(onProgress, {
        stage: 'complete',
        progress: 100,
        message: 'Cinematic video complete!',
      });

      const generationTime = Date.now() - startTime;

      // Build result
      const cinematicVideo: CinematicVideo = {
        id: recipe.videoId,
        query,
        recipe,
        status: 'complete',
        progress: 100,
        currentStage: 'Complete',
        sceneVideos,
        finalVideoUrl,
        title: explanation.topic,
        description: explanation.hook,
        duration: recipe.totalDuration,
        format,
        generationTimeMs: generationTime,
        createdAt: new Date(),
      };

      return cinematicVideo;
    } catch (error) {
      console.error('[CinematicAI] Generation failed:', error);

      this.updateProgress(onProgress, {
        stage: 'complete',
        progress: 100,
        message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });

      throw error;
    }
  }

  private updateProgress(
    callback: ((progress: CinematicProgress) => void) | undefined,
    progress: CinematicProgress
  ): void {
    if (callback) {
      callback(progress);
    }
  }
}
```

---

## 5. Video Pipeline

### 5.1 Text Overlay Composer

**File:** `/src/services/cinematic/composers/TextOverlayComposer.ts`

```typescript
import ffmpeg from 'fluent-ffmpeg';
import { CinematicScene } from '../types';

export class TextOverlayComposer {
  /**
   * Add text overlay to a Sora-generated video
   */
  async addTextOverlay(
    videoUrl: string,
    scene: CinematicScene,
    outputPath: string
  ): Promise<string> {
    console.log(`[Composer] Adding text overlay to scene ${scene.index}...`);

    return new Promise((resolve, reject) => {
      const { text, textPosition, textStyle } = scene;

      // Calculate text position
      const yPosition = this.calculateTextPosition(textPosition);

      // Build FFmpeg drawtext filter
      const drawtext = [
        `text='${this.escapeText(text)}'`,
        `fontfile=/path/to/font.ttf`,
        `fontsize=${textStyle.fontSize}`,
        `fontcolor=${textStyle.color}`,
        `shadowcolor=black`,
        `shadowx=4`,
        `shadowy=4`,
        `x=(w-text_w)/2`, // Center horizontally
        `y=${yPosition}`,
      ].join(':');

      ffmpeg(videoUrl)
        .videoFilter(`drawtext=${drawtext}`)
        .output(outputPath)
        .on('end', () => {
          console.log(`[Composer] Text overlay complete: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('[Composer] Text overlay failed:', err);
          reject(err);
        })
        .run();
    });
  }

  private calculateTextPosition(position: 'top' | 'center' | 'bottom'): string {
    switch (position) {
      case 'top':
        return '(h*0.15)'; // 15% from top
      case 'center':
        return '(h-text_h)/2'; // Centered
      case 'bottom':
        return '(h*0.85-text_h)'; // 15% from bottom
      default:
        return '(h*0.85-text_h)';
    }
  }

  private escapeText(text: string): string {
    // Escape special characters for FFmpeg
    return text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/:/g, '\\:');
  }
}
```

### 5.2 Video Stitcher

**File:** `/src/services/cinematic/composers/VideoStitcher.ts`

```typescript
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

export class VideoStitcher {
  /**
   * Stitch multiple scene videos into one final video
   */
  async stitchScenes(
    sceneVideoPaths: string[],
    outputPath: string,
    transitions?: string[]
  ): Promise<string> {
    console.log(`[Stitcher] Stitching ${sceneVideoPaths.length} scenes...`);

    // Create concat file for FFmpeg
    const concatFilePath = await this.createConcatFile(sceneVideoPaths);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatFilePath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions([
          '-c copy', // Copy without re-encoding (fast)
          '-movflags +faststart', // Web optimization
        ])
        .output(outputPath)
        .on('end', () => {
          console.log('[Stitcher] Stitching complete:', outputPath);
          fs.unlinkSync(concatFilePath); // Cleanup
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('[Stitcher] Stitching failed:', err);
          fs.unlinkSync(concatFilePath); // Cleanup
          reject(err);
        })
        .run();
    });
  }

  /**
   * Create FFmpeg concat file
   */
  private async createConcatFile(videoPaths: string[]): Promise<string> {
    const concatFilePath = path.join('/tmp', `concat_${Date.now()}.txt`);
    const content = videoPaths.map((p) => `file '${p}'`).join('\n');

    await fs.promises.writeFile(concatFilePath, content);

    return concatFilePath;
  }
}
```

### 5.3 Video Composer (Main)

**File:** `/src/services/cinematic/composers/VideoComposer.ts`

```typescript
import { CinematicRecipe } from '../types';
import { TextOverlayComposer } from './TextOverlayComposer';
import { VideoStitcher } from './VideoStitcher';
import path from 'path';

export class VideoComposer {
  private textOverlayComposer: TextOverlayComposer;
  private videoStitcher: VideoStitcher;

  constructor() {
    this.textOverlayComposer = new TextOverlayComposer();
    this.videoStitcher = new VideoStitcher();
  }

  /**
   * Compose final cinematic video
   * 1. Add text overlays to each Sora scene
   * 2. Stitch all scenes together
   * 3. Upload to storage
   */
  async compose(
    recipe: CinematicRecipe,
    sceneVideos: Map<string, string>
  ): Promise<string> {
    console.log('[Composer] Starting video composition...');

    // Step 1: Add text overlays to each scene
    const overlayedVideos: string[] = [];

    for (const scene of recipe.scenes) {
      const soraVideoUrl = sceneVideos.get(scene.id);
      if (!soraVideoUrl) {
        throw new Error(`Missing Sora video for scene ${scene.id}`);
      }

      const outputPath = path.join('/tmp', `scene_${scene.index}_overlay.mp4`);

      const overlayedVideo = await this.textOverlayComposer.addTextOverlay(
        soraVideoUrl,
        scene,
        outputPath
      );

      overlayedVideos.push(overlayedVideo);
    }

    // Step 2: Stitch all scenes together
    const finalVideoPath = path.join('/tmp', `final_${recipe.videoId}.mp4`);

    await this.videoStitcher.stitchScenes(overlayedVideos, finalVideoPath);

    // Step 3: Upload to Supabase Storage
    const publicUrl = await this.uploadToStorage(finalVideoPath, recipe.videoId);

    console.log('[Composer] Video composition complete:', publicUrl);

    // Cleanup temp files
    this.cleanupTempFiles(overlayedVideos);

    return publicUrl;
  }

  private async uploadToStorage(filePath: string, videoId: string): Promise<string> {
    // TODO: Implement Supabase Storage upload
    // For now, return a placeholder
    return `https://storage.example.com/cinematic/${videoId}.mp4`;
  }

  private cleanupTempFiles(files: string[]): void {
    // TODO: Implement temp file cleanup
  }
}
```

---

## 6. UI/UX Implementation

### 6.1 Cinematic Player

**File:** `/src/components/cinematic/CinematicPlayer.tsx`

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { CinematicVideo } from '../../services/cinematic/types';
import { SceneProgressBar } from './SceneProgressBar';

interface CinematicPlayerProps {
  video: CinematicVideo;
  onRegenerate?: () => void;
}

export const CinematicPlayer: React.FC<CinematicPlayerProps> = ({
  video,
  onRegenerate,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);

  // Update current scene based on video time
  useEffect(() => {
    const scene = video.recipe.scenes.find(
      (s) => currentTime >= s.startTime && currentTime < s.endTime
    );

    if (scene) {
      setCurrentSceneIndex(scene.index);
    }
  }, [currentTime, video.recipe.scenes]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSceneClick = (sceneIndex: number) => {
    const scene = video.recipe.scenes[sceneIndex];
    if (videoRef.current && scene) {
      videoRef.current.currentTime = scene.startTime;
    }
  };

  return (
    <div className="cinematic-player">
      {/* Video Container */}
      <div
        className="relative bg-black rounded-lg overflow-hidden"
        style={{
          aspectRatio: video.format === 'vertical' ? '9/16' : '16/9',
          maxWidth: video.format === 'vertical' ? '400px' : '100%',
          margin: '0 auto',
        }}
      >
        <video
          ref={videoRef}
          src={video.finalVideoUrl}
          className="w-full h-full object-cover"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          playsInline
        />

        {/* Play/Pause Overlay */}
        {!isPlaying && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 cursor-pointer"
            onClick={handlePlayPause}
          >
            <div className="w-20 h-20 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
              <Play size={32} className="text-black ml-1" />
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
          <button
            onClick={handlePlayPause}
            className="text-white hover:text-gray-300 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
        </div>
      </div>

      {/* Scene Progress Bar */}
      <SceneProgressBar
        scenes={video.recipe.scenes}
        currentSceneIndex={currentSceneIndex}
        currentTime={currentTime}
        totalDuration={video.duration}
        onSceneClick={handleSceneClick}
      />

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={onRegenerate}
          className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          <RotateCcw size={18} />
          <span>Regenerate</span>
        </button>
      </div>
    </div>
  );
};
```

### 6.2 Scene Progress Bar

**File:** `/src/components/cinematic/SceneProgressBar.tsx`

```tsx
import React from 'react';
import { CinematicScene } from '../../services/cinematic/types';

interface SceneProgressBarProps {
  scenes: CinematicScene[];
  currentSceneIndex: number;
  currentTime: number;
  totalDuration: number;
  onSceneClick: (sceneIndex: number) => void;
}

export const SceneProgressBar: React.FC<SceneProgressBarProps> = ({
  scenes,
  currentSceneIndex,
  currentTime,
  totalDuration,
  onSceneClick,
}) => {
  return (
    <div className="mt-6 space-y-3">
      {/* Timeline Bar */}
      <div className="relative h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${(currentTime / totalDuration) * 100}%` }}
        />
      </div>

      {/* Scene Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {scenes.map((scene, index) => (
          <button
            key={scene.id}
            onClick={() => onSceneClick(index)}
            className={`
              flex-shrink-0 w-24 h-24 rounded-lg border-2 overflow-hidden
              transition-all duration-200
              ${
                index === currentSceneIndex
                  ? 'border-blue-500 shadow-lg scale-105'
                  : 'border-gray-300 dark:border-gray-700 hover:border-blue-300'
              }
            `}
          >
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col items-center justify-center p-2 text-white">
              <span className="text-xs font-medium mb-1">
                {this.getSceneTypeLabel(scene.type)}
              </span>
              <span className="text-xs text-gray-400">{scene.duration}s</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  function getSceneTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      hook: 'Hook',
      explanation: 'Explain',
      insight: 'Insight!',
      conclusion: 'End',
    };
    return labels[type] || type;
  }
};
```

### 6.3 Loading State

**File:** `/src/components/cinematic/CinematicLoadingState.tsx`

```tsx
import React from 'react';
import { CinematicProgress } from '../../services/cinematic/types';
import { Loader } from 'lucide-react';

interface CinematicLoadingStateProps {
  progress: CinematicProgress;
}

export const CinematicLoadingState: React.FC<CinematicLoadingStateProps> = ({
  progress,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      {/* Progress Circle */}
      <div className="relative w-32 h-32 mb-6">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200 dark:text-gray-800"
          />
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={2 * Math.PI * 56}
            strokeDashoffset={2 * Math.PI * 56 * (1 - progress.progress / 100)}
            className="text-blue-500 transition-all duration-300"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {Math.round(progress.progress)}%
          </span>
        </div>
      </div>

      {/* Status Message */}
      <div className="text-center space-y-2 max-w-md">
        <div className="flex items-center justify-center gap-2">
          <Loader className="animate-spin text-blue-500" size={20} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {this.getStageLabel(progress.stage)}
          </h3>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          {progress.message}
        </p>
      </div>

      {/* Scene Progress (if generating) */}
      {progress.sceneProgress && progress.sceneProgress.length > 0 && (
        <div className="mt-8 w-full max-w-md">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Scene Generation
          </h4>
          <div className="space-y-2">
            {progress.sceneProgress.map((scene) => (
              <div key={scene.sceneId} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-16">
                  Scene {scene.sceneIndex + 1}
                </span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      scene.status === 'complete'
                        ? 'bg-green-500'
                        : scene.status === 'generating'
                        ? 'bg-blue-500 animate-pulse'
                        : scene.status === 'failed'
                        ? 'bg-red-500'
                        : 'bg-gray-400'
                    }`}
                    style={{ width: `${scene.progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-20">
                  {this.getStatusLabel(scene.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  function getStageLabel(stage: string): string {
    const labels: Record<string, string> = {
      planning: 'Planning Video',
      generating: 'Generating Scenes',
      composing: 'Composing Video',
      complete: 'Complete',
    };
    return labels[stage] || stage;
  }

  function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending',
      generating: 'Generating...',
      complete: 'Complete',
      failed: 'Failed',
    };
    return labels[status] || status;
  }
};
```

---

## 7. API Configuration

### 7.1 Environment Variables

```bash
# .env.local

# OpenAI API (for Sora + GPT-4)
VITE_OPENAI_API_KEY=sk-...

# Supabase (for storage)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...

# Optional: FFmpeg path (if not in system PATH)
FFMPEG_PATH=/usr/local/bin/ffmpeg
```

### 7.2 API Costs

| Service | Cost per Video | Details |
|---------|---------------|---------|
| **OpenAI GPT-4 Turbo** | ~$0.02 | Scene planning |
| **OpenAI Sora** | ~$2.00-4.00 | 5 scenes × 5s each @ ~$0.40-0.80/scene |
| **Supabase Storage** | ~$0.02 | Video storage + bandwidth |
| **Total** | **~$2.04-4.04** | Per cinematic video |

**Cost Optimization Strategies:**
1. Cache popular queries (reduce regenerations)
2. Use Sora "standard" quality for preview, "HD" for final
3. Implement user rate limits (e.g., 5 videos per day free tier)

---

## 8. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Set up `/services/cinematic/` directory structure
- [ ] Implement type definitions (`types.ts`)
- [ ] Create `SoraProvider` with basic generation
- [ ] Implement `AnswerLLMAgent`
- [ ] Implement `SceneDirectorAgent`
- [ ] Test end-to-end with mock data

### Phase 2: Sora Integration (Week 2)
- [ ] Integrate OpenAI Sora API
- [ ] Implement `SoraSceneGenerator`
- [ ] Add batch generation with progress tracking
- [ ] Test scene generation with real prompts
- [ ] Implement error handling and retries
- [ ] Add video caching

### Phase 3: Video Composition (Week 3)
- [ ] Implement `TextOverlayComposer` with FFmpeg
- [ ] Implement `VideoStitcher`
- [ ] Create `VideoComposer` orchestrator
- [ ] Test full composition pipeline
- [ ] Add Supabase Storage upload
- [ ] Optimize rendering performance

### Phase 4: UI/UX (Week 4)
- [ ] Create `CinematicPlayer` component
- [ ] Implement `SceneProgressBar`
- [ ] Build `CinematicLoadingState`
- [ ] Create `VisualThreadSuggestions`
- [ ] Integrate with existing Studio UI
- [ ] Add mobile responsiveness

### Phase 5: Orchestration (Week 5)
- [ ] Implement `CinematicOrchestrator`
- [ ] Add progress streaming
- [ ] Integrate with Studio pages
- [ ] Create API routes
- [ ] Add analytics tracking
- [ ] Test full workflow

### Phase 6: Polish & Launch (Week 6)
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Add regeneration feature
- [ ] Implement social sharing
- [ ] Beta testing with users
- [ ] Production deployment

---

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
// Test Sora Provider
describe('SoraProvider', () => {
  it('should generate video from prompt', async () => {
    const provider = new SoraProvider();
    const result = await provider.generate({
      prompt: 'Test scene',
      duration: 4,
      aspectRatio: '9:16',
      quality: 'standard',
    });

    expect(result.videoUrl).toBeDefined();
    expect(result.duration).toBe(4);
  });
});

// Test Scene Director
describe('SceneDirectorAgent', () => {
  it('should create 5 scenes from explanation', async () => {
    const director = new SceneDirectorAgent();
    const recipe = await director.directScenes(mockExplanation, 'vertical');

    expect(recipe.scenes).toHaveLength(5);
    expect(recipe.scenes[0].type).toBe('hook');
    expect(recipe.scenes[recipe.scenes.length - 1].type).toBe('conclusion');
  });
});
```

### 9.2 Integration Tests

```typescript
// Test full pipeline
describe('CinematicOrchestrator', () => {
  it('should generate complete video from query', async () => {
    const orchestrator = new CinematicOrchestrator();

    const video = await orchestrator.generateCinematicVideo(
      'Why do octopuses have 3 hearts?',
      'vertical'
    );

    expect(video.status).toBe('complete');
    expect(video.finalVideoUrl).toBeDefined();
    expect(video.duration).toBeGreaterThan(20);
    expect(video.duration).toBeLessThan(35);
  });
});
```

### 9.3 Manual Testing Checklist

- [ ] Test with science query (e.g., "How do black holes work?")
- [ ] Test with nature query (e.g., "Why do octopuses have 3 hearts?")
- [ ] Test with history query (e.g., "How were the pyramids built?")
- [ ] Verify all 5 scenes generate correctly
- [ ] Check text overlays are readable
- [ ] Test scene transitions
- [ ] Verify vertical (9:16) format
- [ ] Test horizontal (16:9) format
- [ ] Check mobile responsiveness
- [ ] Test share functionality

---

## 10. Deployment

### 10.1 Pre-Deployment Checklist

- [ ] OpenAI API key configured (with Sora access)
- [ ] Supabase Storage bucket created (`cinematic-videos`)
- [ ] FFmpeg installed on server
- [ ] Database migrations applied
- [ ] Environment variables set in production
- [ ] Rate limiting configured
- [ ] Error monitoring (Sentry) enabled
- [ ] Analytics tracking added

### 10.2 Deployment Steps

1. **Deploy Backend Services**
   ```bash
   # Deploy to Supabase Edge Functions or Netlify Functions
   npm run deploy:functions
   ```

2. **Deploy Frontend**
   ```bash
   npm run build
   npm run deploy
   ```

3. **Test Production**
   - Generate test video
   - Verify Sora integration
   - Check video playback
   - Test share links

### 10.3 Monitoring

**Key Metrics to Track:**
- Sora API success rate
- Average generation time
- Scene generation failures
- Video composition errors
- User completion rate
- Share rate per video

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Video Generation Success Rate | > 95% |
| Average Generation Time | < 3 minutes |
| Scene Quality (manual review) | > 85% |
| User Engagement (watch completion) | > 75% |
| Share Rate | > 20% |
| Cost per Video | < $4.00 |

---

## Conclusion

This implementation plan provides a complete roadmap for building **CinematicAI** with **OpenAI Sora**. The system leverages:

✅ **OpenAI Sora** for photorealistic scene generation
✅ **Existing Studio infrastructure** for LLM orchestration
✅ **FFmpeg** for professional video composition
✅ **React** for responsive, real-time UI
✅ **Supabase** for reliable storage and caching

**Estimated Timeline:** 6 weeks to production
**Estimated Cost:** $2-4 per video

**Next Steps:**
1. Obtain OpenAI Sora API access
2. Begin Phase 1 implementation
3. Set up development environment
4. Create first test video

---

**Ready to build Netflix for knowledge with Sora! 🎬✨🚀**
