# 🎬 CinematicAI Implementation Plan

## Executive Summary

This document provides a comprehensive implementation plan for **Curios Visual Answer (Cinematic AI)** - a feature that transforms user queries into short, cinematic video explanations (20-30s) composed of multiple micro-scenes (4-6s each).

**Vision:** "Netflix for knowledge" - delivering cinematic explanations instead of text answers.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Phase Breakdown](#2-phase-breakdown)
3. [Core Components](#3-core-components)
4. [Data Models & Schemas](#4-data-models--schemas)
5. [Agent System Design](#5-agent-system-design)
6. [Visual Asset Strategy](#6-visual-asset-strategy)
7. [Video Rendering Pipeline](#7-video-rendering-pipeline)
8. [UI/UX Implementation](#8-uiux-implementation)
9. [API Integration Requirements](#9-api-integration-requirements)
10. [Performance Optimization](#10-performance-optimization)
11. [Testing Strategy](#11-testing-strategy)
12. [Deployment Plan](#12-deployment-plan)
13. [Future Enhancements](#13-future-enhancements)

---

## 1. Architecture Overview

### 1.1 High-Level Flow

```
User Query (Homepage)
    ↓
[1] Answer LLM (generates structured explanation)
    ↓
[2] Scene Director Agent (converts to cinematic structure)
    ↓
[3] Visual Asset Manager (fetches/generates visuals)
    ↓
[4] Video Composer (assembles final video)
    ↓
Cinematic Video Output (20-30s)
```

### 1.2 System Components

```
Frontend Layer
├── QueryInput Component
├── CinematicPlayer Component
├── ScenePreview Component
└── VisualThread Component (related videos)

Service Layer
├── /services/cinematic/
│   ├── AnswerLLMService.ts
│   ├── SceneDirectorAgent.ts
│   ├── VisualAssetManager.ts
│   └── VideoComposer.ts

Rendering Layer
├── /remotion/compositions/cinematic/
│   ├── CinematicVideo.tsx
│   ├── SceneTransition.tsx
│   ├── TextOverlay.tsx
│   └── VisualLayer.tsx

Asset Layer
├── Pexels API (real-world footage)
├── Runway/Luma API (knowledge visualizations)
├── Brave Image Search (diagrams/infographics)
└── Asset Cache (CDN)
```

### 1.3 Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Video Rendering** | Remotion | Programmatic video generation |
| **LLM Processing** | OpenAI GPT-4 | Answer generation + scene direction |
| **Real Footage** | Pexels API | Cinematic stock videos |
| **AI Visuals** | Runway ML / Luma Dream Machine | Generated animations |
| **Diagrams** | Brave Image Search | Scientific visualizations |
| **Storage** | Supabase Storage | Video chunk caching |
| **CDN** | Netlify CDN | Fast video delivery |

---

## 2. Phase Breakdown

### Phase 1: Core Infrastructure (Week 1-2)
**Goal:** Build foundational services and data models

#### Tasks:
- [ ] Create `/services/cinematic/` directory structure
- [ ] Implement `CinematicVideoRecipe` data models
- [ ] Build `AnswerLLMService` (structured explanation generator)
- [ ] Create `SceneDirectorAgent` (scene planning logic)
- [ ] Set up Supabase storage for cinematic videos
- [ ] Create database schema for cinematic sessions

**Deliverable:** Working service layer that can generate scene plans from queries

---

### Phase 2: Visual Asset Integration (Week 3)
**Goal:** Connect visual asset providers

#### Tasks:
- [ ] Implement `VisualAssetManager` service
- [ ] Integrate Pexels API for real-world footage
- [ ] Integrate Runway/Luma for AI-generated visuals
- [ ] Add Brave Image Search for diagrams
- [ ] Build asset categorization logic (cinematic/visualization/real-world)
- [ ] Implement query engineering for each visual type
- [ ] Create asset caching system
- [ ] Add fallback strategies for missing assets

**Deliverable:** System can fetch appropriate visuals for any scene type

---

### Phase 3: Video Rendering Engine (Week 4-5)
**Goal:** Build Remotion-based rendering pipeline

#### Tasks:
- [ ] Create `CinematicVideo.tsx` Remotion composition
- [ ] Implement scene transition effects (fade, wipe, zoom)
- [ ] Build `TextOverlay` component with animations
- [ ] Create `VisualLayer` component (handles all asset types)
- [ ] Implement scene timing synchronization
- [ ] Add camera motion effects (pan, zoom, ken-burns)
- [ ] Build emotion-based color grading system
- [ ] Create Netlify function for video rendering
- [ ] Implement chunked rendering (4-6s per chunk)

**Deliverable:** Can render cinematic videos from scene plans

---

### Phase 4: Frontend Experience (Week 6)
**Goal:** Build user-facing UI

#### Tasks:
- [ ] Create `CinematicPlayer` component
- [ ] Build scene preview UI
- [ ] Implement progressive playback
- [ ] Add loading states with scene-by-scene progress
- [ ] Create share functionality (TikTok/Reels format)
- [ ] Build "Visual Thread" suggestion UI
- [ ] Add regeneration controls
- [ ] Implement vertical (9:16) and horizontal (16:9) formats

**Deliverable:** Complete user experience for cinematic search

---

### Phase 5: Optimization & Polish (Week 7)
**Goal:** Performance, quality, and user experience refinements

#### Tasks:
- [ ] Optimize asset fetching (parallel requests)
- [ ] Implement asset preloading for faster playback
- [ ] Add quality selection (fast/balanced/cinematic)
- [ ] Build analytics tracking
- [ ] Optimize chunk sizes for serverless limits
- [ ] Add error recovery mechanisms
- [ ] Implement rate limiting
- [ ] Create admin dashboard for monitoring

**Deliverable:** Production-ready, optimized system

---

### Phase 6: Launch & Iteration (Week 8)
**Goal:** Deploy and gather feedback

#### Tasks:
- [ ] Deploy to production
- [ ] A/B test cinematic vs traditional results
- [ ] Gather user feedback
- [ ] Monitor performance metrics
- [ ] Iterate based on usage patterns
- [ ] Document best practices

**Deliverable:** Live feature with metrics and feedback loop

---

## 3. Core Components

### 3.1 Answer LLM Service

**Location:** `/src/services/cinematic/AnswerLLMService.ts`

**Purpose:** Generate structured explanations from user queries

```typescript
interface AnswerLLMService {
  generateExplanation(query: string): Promise<StructuredExplanation>;
}

interface StructuredExplanation {
  topic: string;
  category: 'science' | 'history' | 'nature' | 'culture' | 'technology';
  mainConcepts: string[];
  hook: string;
  keyPoints: ExplanationPoint[];
  mindBlowMoment: string;
  conclusion: string;
  estimatedDuration: number; // seconds
}

interface ExplanationPoint {
  concept: string;
  explanation: string;
  visualHint: string; // hint for scene director
  emotion: 'curious' | 'surprising' | 'calm' | 'exciting';
}
```

**LLM Prompt Structure:**

```typescript
const ANSWER_LLM_PROMPT = `
You are an expert at creating structured, cinematic explanations.

Given a query, generate a JSON response with:
1. A hook - attention-grabbing opening statement
2. 2-3 key points - clear explanations
3. A mind-blow moment - surprising insight
4. A conclusion

Guidelines:
- Use conversational language (not academic)
- Each point should be 1-2 sentences max
- Include visual hints for each concept
- Assign emotional tone to each point
- Total explanation should be 20-30 seconds spoken

Query: {query}

Return JSON in this format:
{
  "topic": "...",
  "category": "...",
  "hook": "...",
  "keyPoints": [...],
  "mindBlowMoment": "...",
  "conclusion": "..."
}
`;
```

---

### 3.2 Scene Director Agent

**Location:** `/src/services/cinematic/SceneDirectorAgent.ts`

**Purpose:** Convert structured explanation into cinematic scenes

```typescript
interface SceneDirectorAgent {
  directScenes(explanation: StructuredExplanation): Promise<CinematicRecipe>;
}

interface CinematicRecipe {
  videoId: string;
  totalDuration: number; // 20-30 seconds
  format: 'vertical' | 'horizontal';
  scenes: CinematicScene[];
  visualThread?: RelatedVideo[]; // suggested follow-ups
}

interface CinematicScene {
  id: string;
  index: number;
  type: 'hook' | 'explanation' | 'insight' | 'conclusion';

  // Timing
  startTime: number; // seconds
  endTime: number;
  duration: number; // 4-6 seconds

  // Content
  text: string;
  spokenText?: string; // for future TTS

  // Visual Direction
  visualStyle: VisualStyle;
  assetType: 'real_world' | 'ai_generated' | 'diagram' | 'hybrid';
  cameraMotion: CameraMotion;
  emotion: Emotion;

  // Assets
  primaryAsset?: VisualAsset;
  overlayAssets?: VisualAsset[];

  // Effects
  transition: TransitionType;
  colorGrading: ColorGrade;
}

type VisualStyle =
  | 'cinematic_nature'
  | 'cinematic_space'
  | 'scientific_visualization'
  | 'historical_recreation'
  | 'abstract_concept'
  | 'documentary_footage';

type CameraMotion =
  | 'static'
  | 'slow_pan'
  | 'zoom_in'
  | 'zoom_out'
  | 'ken_burns'
  | 'orbit'
  | 'dolly';

type Emotion =
  | 'mystery'
  | 'wonder'
  | 'calm'
  | 'tension'
  | 'excitement'
  | 'clarity';

type TransitionType =
  | 'fade'
  | 'dissolve'
  | 'wipe'
  | 'zoom_through'
  | 'morph'
  | 'none';

type ColorGrade =
  | 'warm_cinematic'
  | 'cool_scientific'
  | 'natural'
  | 'high_contrast'
  | 'desaturated';
```

**Scene Direction Rules:**

```typescript
const SCENE_DIRECTION_RULES = {
  sceneDuration: {
    hook: [3, 5],        // 3-5 seconds
    explanation: [4, 6],  // 4-6 seconds
    insight: [5, 7],      // 5-7 seconds
    conclusion: [3, 4],   // 3-4 seconds
  },

  visualAssetMapping: {
    science: 'ai_generated',      // black holes, atoms, etc.
    nature: 'real_world',         // animals, ecosystems
    history: 'ai_generated',      // ancient civilizations
    culture: 'hybrid',            // mix of real + generated
    technology: 'diagram',        // infographics
  },

  emotionToCameraMotion: {
    mystery: 'slow_pan',
    wonder: 'zoom_in',
    calm: 'static',
    tension: 'orbit',
    excitement: 'dolly',
    clarity: 'ken_burns',
  },

  transitionRules: {
    hookToExplanation: 'fade',
    explanationToExplanation: 'dissolve',
    explanationToInsight: 'zoom_through',
    insightToConclusion: 'fade',
  }
};
```

---

### 3.3 Visual Asset Manager

**Location:** `/src/services/cinematic/VisualAssetManager.ts`

**Purpose:** Fetch and categorize visual assets for scenes

```typescript
interface VisualAssetManager {
  fetchAssets(scenes: CinematicScene[]): Promise<AssetManifest>;
  categorizeQuery(scene: CinematicScene): VisualQueryCategory;
}

interface AssetManifest {
  assets: Map<string, VisualAsset>; // sceneId -> asset
  fallbacks: Map<string, VisualAsset>;
  preloadUrls: string[];
}

interface VisualAsset {
  id: string;
  type: 'video' | 'image' | 'animation';
  url: string;
  source: 'pexels' | 'runway' | 'luma' | 'brave' | 'cache';
  metadata: {
    width: number;
    height: number;
    duration?: number;
    format: string;
  };
  keywords: string[];
  quality: 'low' | 'medium' | 'high' | 'cinematic';
}

type VisualQueryCategory =
  | 'cinematic_scenes'       // storytelling footage
  | 'knowledge_visualization' // scientific animations
  | 'real_world_footage';     // nature, animals, etc.
```

**Asset Fetching Strategy:**

```typescript
class VisualAssetManager {
  async fetchAssets(scenes: CinematicScene[]): Promise<AssetManifest> {
    // Parallel fetching for all scenes
    const assetPromises = scenes.map(scene =>
      this.fetchAssetForScene(scene)
    );

    const assets = await Promise.all(assetPromises);

    return {
      assets: new Map(assets.map((asset, i) => [scenes[i].id, asset])),
      fallbacks: await this.getFallbackAssets(scenes),
      preloadUrls: assets.map(a => a.url),
    };
  }

  async fetchAssetForScene(scene: CinematicScene): Promise<VisualAsset> {
    const category = this.categorizeQuery(scene);

    switch (category) {
      case 'cinematic_scenes':
        return this.fetchPexelsVideo(scene);

      case 'knowledge_visualization':
        return this.generateAIVisual(scene);

      case 'real_world_footage':
        return this.fetchRealWorldVideo(scene);
    }
  }

  // Query Engineering for Pexels
  private engineerPexelsQuery(scene: CinematicScene): string {
    const { emotion, visualStyle } = scene;

    // Extract metaphor from text
    const metaphor = this.extractVisualMetaphor(scene.text);

    // Emotion to mood keywords
    const moodKeywords = {
      mystery: 'dark dramatic atmospheric',
      wonder: 'bright inspiring uplifting',
      calm: 'peaceful serene natural',
      tension: 'intense urgent dynamic',
      excitement: 'energetic vibrant fast',
      clarity: 'clean focused simple',
    };

    return `${metaphor} ${moodKeywords[emotion]} cinematic high quality`;
  }

  // Query Engineering for Runway/Luma
  private engineerAIVisualPrompt(scene: CinematicScene): string {
    // For knowledge visualization (black holes, atoms, etc.)
    return `
Cinematic ${scene.visualStyle} visualization of ${scene.text}.
Style: Educational, clear, visually stunning
Motion: ${scene.cameraMotion}
Duration: ${scene.duration}s
Quality: Ultra HD, smooth animation
`.trim();
  }
}
```

---

### 3.4 Video Composer

**Location:** `/src/services/cinematic/VideoComposer.ts`

**Purpose:** Orchestrate video rendering with Remotion

```typescript
interface VideoComposer {
  compose(recipe: CinematicRecipe, assets: AssetManifest): Promise<ComposedVideo>;
  renderChunk(chunk: SceneChunk): Promise<VideoChunk>;
}

interface ComposedVideo {
  videoId: string;
  status: 'rendering' | 'complete' | 'failed';
  chunks: VideoChunk[];
  finalVideoUrl?: string;
  previewUrl: string;
  format: 'vertical' | 'horizontal';
  duration: number;
}

interface VideoChunk {
  chunkId: string;
  sceneIds: string[];
  startTime: number;
  endTime: number;
  url: string;
  status: 'pending' | 'rendering' | 'complete';
}
```

**Composition Strategy:**

```typescript
class VideoComposer {
  async compose(recipe: CinematicRecipe, assets: AssetManifest): Promise<ComposedVideo> {
    // 1. Plan chunks (respect scene boundaries)
    const chunks = this.planChunks(recipe.scenes);

    // 2. Render chunks in parallel (3 at a time)
    const renderedChunks = await this.renderChunksInParallel(chunks, assets);

    // 3. Upload chunks to storage
    const uploadedChunks = await this.uploadChunks(renderedChunks);

    // 4. Return composed video metadata
    return {
      videoId: recipe.videoId,
      status: 'complete',
      chunks: uploadedChunks,
      previewUrl: uploadedChunks[0].url, // first chunk for instant preview
      format: recipe.format,
      duration: recipe.totalDuration,
    };
  }

  private planChunks(scenes: CinematicScene[]): SceneChunk[] {
    // Group scenes into 4-6 second chunks
    const chunks: SceneChunk[] = [];
    let currentChunk: CinematicScene[] = [];
    let currentDuration = 0;

    for (const scene of scenes) {
      currentChunk.push(scene);
      currentDuration += scene.duration;

      // Create chunk if duration >= 4s or this is last scene
      if (currentDuration >= 4 || scene === scenes[scenes.length - 1]) {
        chunks.push({
          chunkId: `chunk_${chunks.length}`,
          scenes: currentChunk,
          startTime: chunks.reduce((sum, c) => sum + c.duration, 0),
          endTime: currentDuration,
        });

        currentChunk = [];
        currentDuration = 0;
      }
    }

    return chunks;
  }
}
```

---

## 4. Data Models & Schemas

### 4.1 Database Schema

```sql
-- Cinematic video sessions
CREATE TABLE cinematic_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  query TEXT NOT NULL,
  category TEXT NOT NULL,
  recipe JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  format TEXT NOT NULL DEFAULT 'vertical',
  total_duration INTEGER NOT NULL,

  -- Video URLs
  preview_url TEXT,
  final_video_url TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,

  -- Analytics
  render_time_ms INTEGER,
  asset_fetch_time_ms INTEGER
);

CREATE INDEX idx_cinematic_videos_user ON cinematic_videos(user_id);
CREATE INDEX idx_cinematic_videos_status ON cinematic_videos(status);
CREATE INDEX idx_cinematic_videos_created ON cinematic_videos(created_at DESC);

-- Cinematic scenes
CREATE TABLE cinematic_scenes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES cinematic_videos(id) ON DELETE CASCADE,
  scene_index INTEGER NOT NULL,
  scene_type TEXT NOT NULL,

  -- Content
  text TEXT NOT NULL,
  spoken_text TEXT,

  -- Timing
  start_time DECIMAL NOT NULL,
  end_time DECIMAL NOT NULL,
  duration DECIMAL NOT NULL,

  -- Visual direction
  visual_style TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  camera_motion TEXT NOT NULL,
  emotion TEXT NOT NULL,
  transition TEXT NOT NULL,
  color_grading TEXT NOT NULL,

  -- Assets
  primary_asset_url TEXT,
  primary_asset_source TEXT,
  overlay_assets JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cinematic_scenes_video ON cinematic_scenes(video_id, scene_index);

-- Visual threads (related videos)
CREATE TABLE cinematic_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_video_id UUID REFERENCES cinematic_videos(id) ON DELETE CASCADE,
  suggested_query TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  clicked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Asset cache
CREATE TABLE cinematic_asset_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_hash TEXT UNIQUE NOT NULL,
  asset_type TEXT NOT NULL,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  metadata JSONB,
  keywords TEXT[],

  -- Cache management
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX idx_asset_cache_hash ON cinematic_asset_cache(query_hash);
CREATE INDEX idx_asset_cache_expires ON cinematic_asset_cache(expires_at);
```

### 4.2 TypeScript Types Export

**Location:** `/src/types/cinematic.ts`

```typescript
export interface CinematicVideo {
  id: string;
  userId: string;
  query: string;
  category: VideoCategory;
  recipe: CinematicRecipe;
  status: 'pending' | 'rendering' | 'complete' | 'failed';
  format: 'vertical' | 'horizontal';
  totalDuration: number;

  previewUrl?: string;
  finalVideoUrl?: string;

  createdAt: Date;
  completedAt?: Date;
  viewCount: number;
  shareCount: number;

  renderTimeMs?: number;
  assetFetchTimeMs?: number;
}

export type VideoCategory =
  | 'science'
  | 'history'
  | 'nature'
  | 'culture'
  | 'technology'
  | 'space'
  | 'biology';

// ... (rest of types from previous sections)
```

---

## 5. Agent System Design

### 5.1 Answer LLM Implementation

**File:** `/src/services/cinematic/AnswerLLMService.ts`

```typescript
import OpenAI from 'openai';

export class AnswerLLMService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    });
  }

  async generateExplanation(query: string): Promise<StructuredExplanation> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(query);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const explanation = JSON.parse(response.choices[0].message.content);

    return this.validateAndNormalize(explanation);
  }

  private buildSystemPrompt(): string {
    return `You are a world-class educator who creates cinematic, engaging explanations.

Your goal: Transform any question into a compelling visual narrative with:
1. A strong hook (attention-grabbing opening)
2. Clear key points (2-3 main concepts)
3. A mind-blow moment (surprising insight)
4. A satisfying conclusion

Guidelines:
- Use conversational, accessible language (8th grade reading level)
- Each point should be concise (1-2 sentences max)
- Include visual hints to guide cinematography
- Assign emotional tone to each point
- Total spoken duration: 20-30 seconds
- Focus on ONE clear narrative arc
- End with something shareable/memorable

Return JSON only, no additional text.`;
  }

  private buildUserPrompt(query: string): string {
    return `Create a cinematic explanation for: "${query}"

Return JSON with this exact structure:
{
  "topic": "Clear topic name",
  "category": "science|history|nature|culture|technology",
  "hook": "Attention-grabbing opening statement",
  "keyPoints": [
    {
      "concept": "First main idea",
      "explanation": "1-2 sentence explanation",
      "visualHint": "What to show visually",
      "emotion": "curious|surprising|calm|exciting"
    },
    {
      "concept": "Second main idea",
      "explanation": "1-2 sentence explanation",
      "visualHint": "What to show visually",
      "emotion": "curious|surprising|calm|exciting"
    }
  ],
  "mindBlowMoment": "Surprising insight or fact",
  "conclusion": "Satisfying closing statement",
  "estimatedDuration": 25
}`;
  }

  private validateAndNormalize(explanation: any): StructuredExplanation {
    // Validation and normalization logic
    if (!explanation.topic || !explanation.category) {
      throw new Error('Invalid explanation structure');
    }

    // Ensure duration is reasonable (20-30s)
    if (explanation.estimatedDuration < 20 || explanation.estimatedDuration > 30) {
      explanation.estimatedDuration = 25;
    }

    return explanation as StructuredExplanation;
  }
}
```

---

### 5.2 Scene Director Implementation

**File:** `/src/services/cinematic/SceneDirectorAgent.ts`

```typescript
export class SceneDirectorAgent {
  async directScenes(explanation: StructuredExplanation): Promise<CinematicRecipe> {
    const videoId = this.generateVideoId();
    const format = 'vertical'; // default for social

    // Build scenes
    const scenes: CinematicScene[] = [];
    let currentTime = 0;

    // 1. Hook scene (3-5s)
    scenes.push(this.createHookScene(explanation, currentTime));
    currentTime += scenes[scenes.length - 1].duration;

    // 2. Explanation scenes (4-6s each)
    for (const point of explanation.keyPoints) {
      scenes.push(this.createExplanationScene(point, currentTime, scenes.length));
      currentTime += scenes[scenes.length - 1].duration;
    }

    // 3. Mind-blow insight scene (5-7s)
    scenes.push(this.createInsightScene(explanation, currentTime));
    currentTime += scenes[scenes.length - 1].duration;

    // 4. Conclusion scene (3-4s)
    scenes.push(this.createConclusionScene(explanation, currentTime));
    currentTime += scenes[scenes.length - 1].duration;

    // Generate visual thread suggestions
    const visualThread = await this.generateVisualThread(explanation);

    return {
      videoId,
      totalDuration: currentTime,
      format,
      scenes,
      visualThread,
    };
  }

  private createHookScene(explanation: StructuredExplanation, startTime: number): CinematicScene {
    const duration = 4; // seconds

    return {
      id: this.generateSceneId(),
      index: 0,
      type: 'hook',
      startTime,
      endTime: startTime + duration,
      duration,

      text: explanation.hook,

      visualStyle: this.selectVisualStyle(explanation.category, 'hook'),
      assetType: this.selectAssetType(explanation.category),
      cameraMotion: 'slow_pan',
      emotion: 'mystery',

      transition: 'none',
      colorGrading: 'high_contrast',
    };
  }

  private createExplanationScene(
    point: ExplanationPoint,
    startTime: number,
    index: number
  ): CinematicScene {
    const duration = 5; // seconds

    return {
      id: this.generateSceneId(),
      index,
      type: 'explanation',
      startTime,
      endTime: startTime + duration,
      duration,

      text: point.explanation,

      visualStyle: this.mapVisualHintToStyle(point.visualHint),
      assetType: this.inferAssetType(point.visualHint),
      cameraMotion: this.emotionToCameraMotion(point.emotion),
      emotion: point.emotion,

      transition: 'dissolve',
      colorGrading: 'natural',
    };
  }

  private createInsightScene(explanation: StructuredExplanation, startTime: number): CinematicScene {
    const duration = 6;

    return {
      id: this.generateSceneId(),
      index: explanation.keyPoints.length + 1,
      type: 'insight',
      startTime,
      endTime: startTime + duration,
      duration,

      text: explanation.mindBlowMoment,

      visualStyle: 'cinematic_space', // dramatic visuals
      assetType: 'ai_generated',
      cameraMotion: 'zoom_in',
      emotion: 'wonder',

      transition: 'zoom_through',
      colorGrading: 'warm_cinematic',
    };
  }

  private createConclusionScene(explanation: StructuredExplanation, startTime: number): CinematicScene {
    const duration = 4;

    return {
      id: this.generateSceneId(),
      index: explanation.keyPoints.length + 2,
      type: 'conclusion',
      startTime,
      endTime: startTime + duration,
      duration,

      text: explanation.conclusion,

      visualStyle: 'abstract_concept',
      assetType: 'real_world',
      cameraMotion: 'static',
      emotion: 'clarity',

      transition: 'fade',
      colorGrading: 'natural',
    };
  }

  private selectVisualStyle(category: string, sceneType: string): VisualStyle {
    const styleMap: Record<string, VisualStyle> = {
      science: 'scientific_visualization',
      nature: 'cinematic_nature',
      space: 'cinematic_space',
      history: 'historical_recreation',
      culture: 'documentary_footage',
      technology: 'abstract_concept',
    };

    return styleMap[category] || 'documentary_footage';
  }

  private emotionToCameraMotion(emotion: string): CameraMotion {
    const motionMap: Record<string, CameraMotion> = {
      curious: 'slow_pan',
      surprising: 'zoom_in',
      calm: 'static',
      exciting: 'dolly',
    };

    return motionMap[emotion] || 'static';
  }

  private async generateVisualThread(explanation: StructuredExplanation): Promise<RelatedVideo[]> {
    // Generate 3-4 related video suggestions
    return [
      {
        query: `How ${explanation.topic} works`,
        reason: 'deeper_dive',
      },
      {
        query: `${explanation.topic} history`,
        reason: 'context',
      },
      {
        query: `${explanation.topic} future implications`,
        reason: 'what_next',
      },
    ];
  }

  private generateVideoId(): string {
    return `cinematic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSceneId(): string {
    return `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface RelatedVideo {
  query: string;
  reason: 'deeper_dive' | 'context' | 'what_next';
}
```

---

## 6. Visual Asset Strategy

### 6.1 Asset Provider Integration

#### Pexels API (Real-World Footage)

**File:** `/src/services/cinematic/providers/PexelsProvider.ts`

```typescript
import axios from 'axios';

export class PexelsProvider {
  private apiKey: string;
  private baseUrl = 'https://api.pexels.com/videos';

  constructor() {
    this.apiKey = import.meta.env.VITE_PEXELS_API_KEY;
  }

  async searchVideo(query: string, options?: SearchOptions): Promise<VisualAsset> {
    const engineeredQuery = this.engineerQuery(query, options);

    const response = await axios.get(`${this.baseUrl}/search`, {
      headers: { Authorization: this.apiKey },
      params: {
        query: engineeredQuery,
        orientation: options?.orientation || 'portrait',
        size: 'large',
        per_page: 5,
      },
    });

    // Select best video based on quality and relevance
    const bestVideo = this.selectBestVideo(response.data.videos, options);

    return this.convertToVisualAsset(bestVideo);
  }

  private engineerQuery(query: string, options?: SearchOptions): string {
    // Add cinematic quality modifiers
    const qualityModifiers = ['cinematic', 'high quality', 'professional'];
    const moodModifier = options?.emotion ? this.emotionToMood(options.emotion) : '';

    return `${query} ${moodModifier} ${qualityModifiers.join(' ')}`.trim();
  }

  private emotionToMood(emotion: Emotion): string {
    const moodMap = {
      mystery: 'dark atmospheric dramatic',
      wonder: 'bright inspiring uplifting',
      calm: 'peaceful serene natural',
      tension: 'intense dynamic urgent',
      excitement: 'energetic vibrant fast',
      clarity: 'clean focused simple',
    };

    return moodMap[emotion] || '';
  }

  private selectBestVideo(videos: any[], options?: SearchOptions): any {
    // Prioritize by:
    // 1. Duration match (prefer videos close to scene duration)
    // 2. Quality (prefer HD+)
    // 3. File size (prefer <50MB for faster loading)

    return videos[0]; // Simplified - implement scoring logic
  }

  private convertToVisualAsset(video: any): VisualAsset {
    return {
      id: video.id.toString(),
      type: 'video',
      url: video.video_files[0].link,
      source: 'pexels',
      metadata: {
        width: video.width,
        height: video.height,
        duration: video.duration,
        format: 'mp4',
      },
      keywords: [],
      quality: 'cinematic',
    };
  }
}

interface SearchOptions {
  orientation?: 'portrait' | 'landscape';
  emotion?: Emotion;
  duration?: number;
}
```

#### Runway ML / Luma Dream Machine (AI Visualizations)

**File:** `/src/services/cinematic/providers/AIVisualProvider.ts`

```typescript
import axios from 'axios';

export class AIVisualProvider {
  private runwayApiKey: string;
  private lumaApiKey: string;

  constructor() {
    this.runwayApiKey = import.meta.env.VITE_RUNWAY_API_KEY;
    this.lumaApiKey = import.meta.env.VITE_LUMA_API_KEY;
  }

  async generateVisualization(scene: CinematicScene): Promise<VisualAsset> {
    const prompt = this.buildGenerationPrompt(scene);

    // Try Runway first (faster), fallback to Luma
    try {
      return await this.generateWithRunway(prompt, scene.duration);
    } catch (error) {
      console.warn('Runway generation failed, trying Luma:', error);
      return await this.generateWithLuma(prompt, scene.duration);
    }
  }

  private async generateWithRunway(prompt: string, duration: number): Promise<VisualAsset> {
    // Runway Gen-2 API
    const response = await axios.post(
      'https://api.runwayml.com/v1/generate',
      {
        prompt,
        duration,
        style: 'cinematic',
        resolution: '1080x1920', // vertical
      },
      {
        headers: { Authorization: `Bearer ${this.runwayApiKey}` },
      }
    );

    // Poll for completion
    const videoUrl = await this.pollForCompletion(response.data.id, 'runway');

    return {
      id: response.data.id,
      type: 'animation',
      url: videoUrl,
      source: 'runway',
      metadata: {
        width: 1080,
        height: 1920,
        duration,
        format: 'mp4',
      },
      keywords: [prompt],
      quality: 'high',
    };
  }

  private async generateWithLuma(prompt: string, duration: number): Promise<VisualAsset> {
    // Luma Dream Machine API
    const response = await axios.post(
      'https://api.lumalabs.ai/dream-machine/v1/generations',
      {
        prompt,
        duration,
        aspect_ratio: '9:16',
      },
      {
        headers: { Authorization: `Bearer ${this.lumaApiKey}` },
      }
    );

    const videoUrl = await this.pollForCompletion(response.data.id, 'luma');

    return {
      id: response.data.id,
      type: 'animation',
      url: videoUrl,
      source: 'luma',
      metadata: {
        width: 1080,
        height: 1920,
        duration,
        format: 'mp4',
      },
      keywords: [prompt],
      quality: 'cinematic',
    };
  }

  private buildGenerationPrompt(scene: CinematicScene): string {
    return `
Ultra-high quality cinematic visualization: ${scene.text}

Style: ${scene.visualStyle}
Camera motion: ${scene.cameraMotion}
Mood: ${scene.emotion}
Duration: ${scene.duration}s

Requirements:
- Scientifically accurate if applicable
- Smooth, professional animation
- Rich colors and lighting
- Educational and clear
- 1080x1920 resolution (vertical)
`.trim();
  }

  private async pollForCompletion(jobId: string, provider: 'runway' | 'luma'): Promise<string> {
    // Poll every 2 seconds until complete or timeout (60s)
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const status = await this.checkStatus(jobId, provider);

      if (status.status === 'complete') {
        return status.videoUrl;
      }

      if (status.status === 'failed') {
        throw new Error(`Generation failed: ${status.error}`);
      }

      await this.sleep(2000);
      attempts++;
    }

    throw new Error('Generation timeout');
  }

  private async checkStatus(jobId: string, provider: string): Promise<any> {
    // Implementation depends on provider API
    return { status: 'complete', videoUrl: '' };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 6.2 Asset Caching Strategy

**File:** `/src/services/cinematic/AssetCache.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export class AssetCache {
  private supabase;

  constructor() {
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
  }

  async get(query: string, assetType: string): Promise<VisualAsset | null> {
    const hash = this.hashQuery(query, assetType);

    const { data, error } = await this.supabase
      .from('cinematic_asset_cache')
      .select('*')
      .eq('query_hash', hash)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) return null;

    // Update access stats
    await this.incrementAccessCount(hash);

    return {
      id: data.id,
      type: data.asset_type,
      url: data.url,
      source: data.source,
      metadata: data.metadata,
      keywords: data.keywords,
      quality: data.metadata.quality,
    };
  }

  async set(query: string, asset: VisualAsset, ttlDays: number = 30): Promise<void> {
    const hash = this.hashQuery(query, asset.type);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    await this.supabase
      .from('cinematic_asset_cache')
      .upsert({
        query_hash: hash,
        asset_type: asset.type,
        source: asset.source,
        url: asset.url,
        metadata: asset.metadata,
        keywords: asset.keywords,
        expires_at: expiresAt.toISOString(),
      });
  }

  private hashQuery(query: string, assetType: string): string {
    return crypto
      .createHash('sha256')
      .update(`${query}:${assetType}`)
      .digest('hex');
  }

  private async incrementAccessCount(hash: string): Promise<void> {
    await this.supabase.rpc('increment_asset_access', { hash });
  }

  async cleanup(): Promise<void> {
    // Remove expired assets
    await this.supabase
      .from('cinematic_asset_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());
  }
}
```

---

## 7. Video Rendering Pipeline

### 7.1 Remotion Composition

**File:** `/src/remotion/compositions/cinematic/CinematicVideo.tsx`

```tsx
import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { CinematicScene as SceneType } from '../../../types/cinematic';
import { SceneRenderer } from './SceneRenderer';
import { SceneTransition } from './SceneTransition';

interface CinematicVideoProps {
  scenes: SceneType[];
  format: 'vertical' | 'horizontal';
}

export const CinematicVideo: React.FC<CinematicVideoProps> = ({ scenes, format }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {scenes.map((scene, index) => {
        const startFrame = scene.startTime * fps;
        const durationInFrames = scene.duration * fps;
        const nextScene = scenes[index + 1];

        return (
          <React.Fragment key={scene.id}>
            {/* Render scene */}
            <Sequence from={startFrame} durationInFrames={durationInFrames}>
              <SceneRenderer scene={scene} format={format} />
            </Sequence>

            {/* Render transition to next scene */}
            {nextScene && (
              <Sequence
                from={startFrame + durationInFrames - (fps * 0.5)}
                durationInFrames={fps * 0.5}
              >
                <SceneTransition
                  type={nextScene.transition}
                  fromScene={scene}
                  toScene={nextScene}
                />
              </Sequence>
            )}
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
```

**File:** `/src/remotion/compositions/cinematic/SceneRenderer.tsx`

```tsx
import React from 'react';
import { AbsoluteFill, Video, Img, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { CinematicScene } from '../../../types/cinematic';
import { TextOverlay } from './TextOverlay';
import { VisualLayer } from './VisualLayer';

interface SceneRendererProps {
  scene: CinematicScene;
  format: 'vertical' | 'horizontal';
}

export const SceneRenderer: React.FC<SceneRendererProps> = ({ scene, format }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate scene-relative frame
  const sceneFrame = frame;
  const totalFrames = scene.duration * fps;

  // Apply color grading
  const colorGradeFilter = getColorGradeFilter(scene.colorGrading);

  return (
    <AbsoluteFill style={{ filter: colorGradeFilter }}>
      {/* Visual layer (video or image) */}
      <VisualLayer
        asset={scene.primaryAsset}
        cameraMotion={scene.cameraMotion}
        sceneFrame={sceneFrame}
        totalFrames={totalFrames}
      />

      {/* Overlay assets (if any) */}
      {scene.overlayAssets?.map((overlay, index) => (
        <VisualLayer
          key={index}
          asset={overlay}
          cameraMotion="static"
          sceneFrame={sceneFrame}
          totalFrames={totalFrames}
          style={{ opacity: 0.7, mixBlendMode: 'overlay' }}
        />
      ))}

      {/* Text overlay */}
      <TextOverlay
        text={scene.text}
        sceneType={scene.type}
        emotion={scene.emotion}
        frame={sceneFrame}
        totalFrames={totalFrames}
      />
    </AbsoluteFill>
  );
};

function getColorGradeFilter(grading: string): string {
  const grades: Record<string, string> = {
    warm_cinematic: 'saturate(1.2) contrast(1.1) brightness(1.05) sepia(0.1)',
    cool_scientific: 'saturate(0.9) contrast(1.15) brightness(0.95) hue-rotate(10deg)',
    natural: 'saturate(1.05) contrast(1.05)',
    high_contrast: 'saturate(1.3) contrast(1.3) brightness(0.9)',
    desaturated: 'saturate(0.6) contrast(1.1)',
  };

  return grades[grading] || 'none';
}
```

**File:** `/src/remotion/compositions/cinematic/VisualLayer.tsx`

```tsx
import React from 'react';
import { AbsoluteFill, Video, Img, useCurrentFrame, interpolate } from 'remotion';
import { VisualAsset } from '../../../types/cinematic';

interface VisualLayerProps {
  asset?: VisualAsset;
  cameraMotion: string;
  sceneFrame: number;
  totalFrames: number;
  style?: React.CSSProperties;
}

export const VisualLayer: React.FC<VisualLayerProps> = ({
  asset,
  cameraMotion,
  sceneFrame,
  totalFrames,
  style = {},
}) => {
  if (!asset) return null;

  // Apply camera motion
  const transform = applyCameraMotion(cameraMotion, sceneFrame, totalFrames);

  return (
    <AbsoluteFill style={{ ...style, overflow: 'hidden' }}>
      <div style={{
        width: '100%',
        height: '100%',
        transform,
        transition: 'transform 0.1s linear',
      }}>
        {asset.type === 'video' ? (
          <Video
            src={asset.url}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Img
            src={asset.url}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};

function applyCameraMotion(motion: string, frame: number, totalFrames: number): string {
  const progress = frame / totalFrames;

  switch (motion) {
    case 'slow_pan':
      const panX = interpolate(progress, [0, 1], [0, -10]); // pan left
      return `translateX(${panX}%)`;

    case 'zoom_in':
      const scaleIn = interpolate(progress, [0, 1], [1, 1.2]);
      return `scale(${scaleIn})`;

    case 'zoom_out':
      const scaleOut = interpolate(progress, [0, 1], [1.2, 1]);
      return `scale(${scaleOut})`;

    case 'ken_burns':
      const kbScale = interpolate(progress, [0, 1], [1, 1.15]);
      const kbX = interpolate(progress, [0, 1], [0, -5]);
      return `scale(${kbScale}) translateX(${kbX}%)`;

    case 'orbit':
      const angle = interpolate(progress, [0, 1], [0, 10]);
      return `rotate(${angle}deg) scale(1.1)`;

    case 'dolly':
      const dollyZ = interpolate(progress, [0, 1], [1, 1.3]);
      const dollyY = interpolate(progress, [0, 1], [0, -10]);
      return `scale(${dollyZ}) translateY(${dollyY}%)`;

    case 'static':
    default:
      return 'none';
  }
}
```

**File:** `/src/remotion/compositions/cinematic/TextOverlay.tsx`

```tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

interface TextOverlayProps {
  text: string;
  sceneType: string;
  emotion: string;
  frame: number;
  totalFrames: number;
}

export const TextOverlay: React.FC<TextOverlayProps> = ({
  text,
  sceneType,
  emotion,
  frame,
  totalFrames,
}) => {
  // Fade in animation (first 10 frames)
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Scale animation
  const scale = interpolate(frame, [0, 15], [0.95, 1], {
    extrapolateRight: 'clamp',
  });

  // Get text style based on scene type
  const textStyle = getTextStyle(sceneType, emotion);

  return (
    <AbsoluteFill>
      <div style={{
        position: 'absolute',
        bottom: '15%',
        left: '5%',
        right: '5%',
        textAlign: 'center',
        opacity,
        transform: `scale(${scale})`,
      }}>
        <div style={{
          ...textStyle,
          textShadow: '0 4px 12px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6)',
          lineHeight: 1.3,
        }}>
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

function getTextStyle(sceneType: string, emotion: string): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 700,
    color: '#ffffff',
  };

  if (sceneType === 'hook') {
    return {
      ...baseStyle,
      fontSize: 80,
      letterSpacing: '-0.02em',
    };
  }

  if (sceneType === 'insight') {
    return {
      ...baseStyle,
      fontSize: 72,
      color: '#FFD700', // gold for mind-blow moments
      letterSpacing: '-0.01em',
    };
  }

  return {
    ...baseStyle,
    fontSize: 60,
    letterSpacing: '-0.01em',
  };
}
```

**File:** `/src/remotion/compositions/cinematic/SceneTransition.tsx`

```tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { CinematicScene } from '../../../types/cinematic';

interface SceneTransitionProps {
  type: string;
  fromScene: CinematicScene;
  toScene: CinematicScene;
}

export const SceneTransition: React.FC<SceneTransitionProps> = ({ type }) => {
  const frame = useCurrentFrame();
  const transitionFrames = 15; // 0.5s at 30fps

  const progress = frame / transitionFrames;

  switch (type) {
    case 'fade':
      return <FadeTransition progress={progress} />;

    case 'dissolve':
      return <DissolveTransition progress={progress} />;

    case 'wipe':
      return <WipeTransition progress={progress} />;

    case 'zoom_through':
      return <ZoomThroughTransition progress={progress} />;

    default:
      return null;
  }
};

const FadeTransition: React.FC<{ progress: number }> = ({ progress }) => {
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{
      backgroundColor: '#000',
      opacity,
      pointerEvents: 'none',
    }} />
  );
};

const DissolveTransition: React.FC<{ progress: number }> = ({ progress }) => {
  return null; // Handled by scene opacity
};

const WipeTransition: React.FC<{ progress: number }> = ({ progress }) => {
  const translateX = interpolate(progress, [0, 1], [-100, 0]);

  return (
    <AbsoluteFill style={{
      backgroundColor: '#000',
      transform: `translateX(${translateX}%)`,
      pointerEvents: 'none',
    }} />
  );
};

const ZoomThroughTransition: React.FC<{ progress: number }> = ({ progress }) => {
  const scale = interpolate(progress, [0, 1], [1, 3]);
  const opacity = interpolate(progress, [0.5, 1], [1, 0]);

  return (
    <AbsoluteFill style={{
      backgroundColor: '#000',
      transform: `scale(${scale})`,
      opacity,
      pointerEvents: 'none',
    }} />
  );
};
```

### 7.2 Rendering Function (Netlify/Supabase)

**File:** `/supabase/functions/render-cinematic-chunk/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { bundle } from '@remotion/bundler';
import { renderMedia } from '@remotion/renderer';

serve(async (req) => {
  try {
    const { chunk, assets, format } = await req.json();

    // Bundle Remotion project
    const bundled = await bundle({
      entryPoint: '/remotion/index.ts',
      webpackOverride: (config) => config,
    });

    // Render chunk
    const outputPath = `/tmp/chunk_${chunk.chunkId}.mp4`;

    await renderMedia({
      composition: 'CinematicVideo',
      serveUrl: bundled,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: {
        scenes: chunk.scenes,
        format,
        assets,
      },
      frameRange: [chunk.startFrame, chunk.endFrame],
    });

    // Upload to Supabase Storage
    const videoUrl = await uploadChunk(outputPath, chunk.chunkId);

    return new Response(JSON.stringify({
      success: true,
      chunkId: chunk.chunkId,
      url: videoUrl,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Render error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function uploadChunk(filePath: string, chunkId: string): Promise<string> {
  // Upload to Supabase Storage
  const file = await Deno.readFile(filePath);

  const { data, error } = await supabase.storage
    .from('cinematic-videos')
    .upload(`chunks/${chunkId}.mp4`, file, {
      contentType: 'video/mp4',
      cacheControl: '3600',
    });

  if (error) throw error;

  return supabase.storage
    .from('cinematic-videos')
    .getPublicUrl(data.path).data.publicUrl;
}
```

---

## 8. UI/UX Implementation

### 8.1 Cinematic Player Component

**File:** `/src/components/cinematic/CinematicPlayer.tsx`

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { CinematicVideo, VideoChunk } from '../../types/cinematic';

interface CinematicPlayerProps {
  video: CinematicVideo;
  chunks: VideoChunk[];
  onShare?: () => void;
  onRegenerate?: () => void;
}

export const CinematicPlayer: React.FC<CinematicPlayerProps> = ({
  video,
  chunks,
  onShare,
  onRegenerate,
}) => {
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentChunk = chunks[currentChunkIndex];

  // Auto-advance to next chunk
  const handleChunkEnd = () => {
    if (currentChunkIndex < chunks.length - 1) {
      setCurrentChunkIndex(currentChunkIndex + 1);
    } else {
      setIsPlaying(false);
    }
  };

  // Preload next chunk
  useEffect(() => {
    if (currentChunkIndex < chunks.length - 1) {
      const nextChunk = chunks[currentChunkIndex + 1];
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = nextChunk.url;
      document.head.appendChild(link);
    }
  }, [currentChunkIndex, chunks]);

  return (
    <div className="cinematic-player">
      {/* Video container */}
      <div className="video-container" style={{
        position: 'relative',
        width: video.format === 'vertical' ? '360px' : '640px',
        height: video.format === 'vertical' ? '640px' : '360px',
        backgroundColor: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <video
          ref={videoRef}
          src={currentChunk?.url}
          onEnded={handleChunkEnd}
          autoPlay={isPlaying}
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Play/Pause overlay */}
        {!isPlaying && (
          <div
            className="play-button-overlay"
            onClick={() => setIsPlaying(true)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.3)',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#000">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: 'rgba(255,255,255,0.2)',
        }}>
          <div style={{
            height: '100%',
            backgroundColor: '#fff',
            width: `${((currentChunkIndex + 1) / chunks.length) * 100}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Controls */}
      <div className="player-controls" style={{
        marginTop: '20px',
        display: 'flex',
        gap: '12px',
        justifyContent: 'center',
      }}>
        <button onClick={onShare} className="btn-share">
          Share
        </button>
        <button onClick={onRegenerate} className="btn-regenerate">
          Regenerate
        </button>
      </div>

      {/* Scene preview */}
      <ScenePreview
        scenes={video.recipe.scenes}
        currentTime={currentChunkIndex * 5} // approximate
      />
    </div>
  );
};

interface ScenePreviewProps {
  scenes: any[];
  currentTime: number;
}

const ScenePreview: React.FC<ScenePreviewProps> = ({ scenes, currentTime }) => {
  return (
    <div style={{
      marginTop: '20px',
      display: 'flex',
      gap: '8px',
      overflowX: 'auto',
      padding: '10px',
    }}>
      {scenes.map((scene, index) => (
        <div
          key={scene.id}
          style={{
            minWidth: '80px',
            height: '80px',
            borderRadius: '8px',
            backgroundColor: '#222',
            border: currentTime >= scene.startTime && currentTime < scene.endTime
              ? '3px solid #fff'
              : '1px solid #444',
            padding: '8px',
            fontSize: '10px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          {scene.type}
        </div>
      ))}
    </div>
  );
};
```

### 8.2 Visual Thread Component

**File:** `/src/components/cinematic/VisualThread.tsx`

```tsx
import React from 'react';
import { RelatedVideo } from '../../types/cinematic';

interface VisualThreadProps {
  currentQuery: string;
  relatedVideos: RelatedVideo[];
  onSelect: (query: string) => void;
}

export const VisualThread: React.FC<VisualThreadProps> = ({
  currentQuery,
  relatedVideos,
  onSelect,
}) => {
  return (
    <div className="visual-thread" style={{
      marginTop: '40px',
      padding: '24px',
      backgroundColor: '#0a0a0a',
      borderRadius: '16px',
    }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: 600,
        color: '#fff',
        marginBottom: '16px',
      }}>
        Continue exploring
      </h3>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {relatedVideos.map((video, index) => (
          <button
            key={index}
            onClick={() => onSelect(video.query)}
            className="thread-item"
            style={{
              padding: '16px',
              backgroundColor: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '12px',
              textAlign: 'left',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '4px',
            }}>
              {video.query}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#888',
            }}>
              {getReasonLabel(video.reason)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

function getReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    deeper_dive: 'Learn more details',
    context: 'Understand the background',
    what_next: 'Explore future implications',
  };

  return labels[reason] || 'Related topic';
}
```

### 8.3 Integration with Existing Studio UI

**File:** `/src/components/studio/StudioResults.tsx` (modified)

```tsx
import React from 'react';
import { CinematicPlayer } from '../cinematic/CinematicPlayer';
import { VisualThread } from '../cinematic/VisualThread';
import { useCinematicVideo } from '../../hooks/useCinematicVideo';

export const StudioResults: React.FC = () => {
  const { video, chunks, isLoading, error } = useCinematicVideo();

  if (isLoading) {
    return <CinematicLoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (!video) {
    return null;
  }

  return (
    <div className="studio-results" style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
    }}>
      {/* Cinematic player */}
      <CinematicPlayer
        video={video}
        chunks={chunks}
        onShare={() => handleShare(video)}
        onRegenerate={() => handleRegenerate()}
      />

      {/* Visual thread */}
      {video.recipe.visualThread && (
        <VisualThread
          currentQuery={video.query}
          relatedVideos={video.recipe.visualThread}
          onSelect={(query) => handleNewQuery(query)}
        />
      )}
    </div>
  );
};

const CinematicLoadingState: React.FC = () => {
  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
    }}>
      <div className="spinner" />
      <h3 style={{ marginTop: '20px', color: '#fff' }}>
        Generating your cinematic explanation...
      </h3>
      <p style={{ color: '#888', marginTop: '8px' }}>
        This will take about 15-20 seconds
      </p>
    </div>
  );
};
```

---

## 9. API Integration Requirements

### 9.1 Required API Keys

```bash
# .env.local

# Core LLM
VITE_OPENAI_API_KEY=sk-...

# Visual Assets
VITE_PEXELS_API_KEY=...
VITE_RUNWAY_API_KEY=...  # or VITE_LUMA_API_KEY
BRAVE_API_KEY=...

# Storage
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### 9.2 API Rate Limits & Costs

| Service | Free Tier | Cost per Video | Rate Limit |
|---------|-----------|----------------|------------|
| OpenAI GPT-4 | No | ~$0.02 | 500 RPM |
| Pexels | Yes | $0 | 200 req/hour |
| Runway Gen-2 | Limited | ~$0.50-1.00 | 10 videos/day (free) |
| Luma Dream Machine | Limited | ~$0.30-0.80 | 30 videos/day (free) |
| Brave Image Search | 2000/month | ~$0.01 | 1 req/sec |
| Supabase Storage | 1 GB free | ~$0.02/GB | 50 MB/s |

**Estimated cost per video:** $0.50-1.50 (depending on AI visual usage)

### 9.3 Fallback Strategies

```typescript
const ASSET_FALLBACK_STRATEGY = {
  // If Runway fails, try Luma
  ai_generated: ['runway', 'luma', 'pexels_abstract'],

  // If Pexels has no results, try Brave images with video filter
  real_world: ['pexels', 'brave_video', 'stock_library'],

  // If Brave fails, try generic diagrams or Pexels
  diagram: ['brave_image', 'pexels_infographic', 'placeholder'],
};
```

---

## 10. Performance Optimization

### 10.1 Asset Preloading

```typescript
class AssetPreloader {
  async preloadAssets(recipe: CinematicRecipe): Promise<void> {
    // Preload first 3 scenes' assets in parallel
    const priorityScenes = recipe.scenes.slice(0, 3);

    const preloadPromises = priorityScenes.map(scene => {
      if (scene.primaryAsset) {
        return this.preloadAsset(scene.primaryAsset.url);
      }
    });

    await Promise.all(preloadPromises);
  }

  private preloadAsset(url: string): Promise<void> {
    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = url.endsWith('.mp4') ? 'video' : 'image';
      link.href = url;
      link.onload = () => resolve();
      link.onerror = () => resolve(); // Don't block on errors
      document.head.appendChild(link);
    });
  }
}
```

### 10.2 Chunk Rendering Optimization

```typescript
const RENDERING_CONFIG = {
  // Render first chunk immediately (high priority)
  priorityChunks: [0],

  // Render in batches of 3
  maxParallelChunks: 3,

  // Target 4-6s per chunk (serverless-safe)
  targetChunkDuration: 5,

  // Quality presets
  qualityPresets: {
    fast: {
      codec: 'h264',
      bitrate: '2M',
      preset: 'ultrafast',
    },
    balanced: {
      codec: 'h264',
      bitrate: '4M',
      preset: 'medium',
    },
    cinematic: {
      codec: 'h265',
      bitrate: '8M',
      preset: 'slow',
    },
  },
};
```

### 10.3 Caching Strategy

```typescript
const CACHE_CONFIG = {
  // Cache assets for 30 days
  assetCacheTTL: 30 * 24 * 60 * 60,

  // Cache popular queries indefinitely
  popularQueryCacheTTL: -1, // never expire

  // Preload cache for trending topics
  trendingTopics: [
    'black holes',
    'octopuses',
    'quantum physics',
    'climate change',
  ],
};
```

---

## 11. Testing Strategy

### 11.1 Unit Tests

```typescript
// Test Scene Director
describe('SceneDirectorAgent', () => {
  it('should create 4-6 scenes from explanation', async () => {
    const explanation = mockExplanation();
    const recipe = await sceneDirector.directScenes(explanation);

    expect(recipe.scenes.length).toBeGreaterThanOrEqual(4);
    expect(recipe.scenes.length).toBeLessThanOrEqual(6);
  });

  it('should assign correct asset types', async () => {
    const explanation = { ...mockExplanation(), category: 'science' };
    const recipe = await sceneDirector.directScenes(explanation);

    const hasAIGenerated = recipe.scenes.some(s => s.assetType === 'ai_generated');
    expect(hasAIGenerated).toBe(true);
  });
});

// Test Visual Asset Manager
describe('VisualAssetManager', () => {
  it('should fetch Pexels video for real-world scenes', async () => {
    const scene = mockScene({ visualStyle: 'cinematic_nature' });
    const asset = await assetManager.fetchAssetForScene(scene);

    expect(asset.source).toBe('pexels');
    expect(asset.type).toBe('video');
  });

  it('should use cache for repeated queries', async () => {
    const scene = mockScene();

    await assetManager.fetchAssetForScene(scene);
    const start = Date.now();
    await assetManager.fetchAssetForScene(scene);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100); // cached should be <100ms
  });
});
```

### 11.2 Integration Tests

```typescript
// Test full pipeline
describe('Cinematic Pipeline (E2E)', () => {
  it('should generate video from query in under 30s', async () => {
    const query = 'Why do octopuses have 3 hearts?';

    const start = Date.now();
    const video = await cinematicPipeline.generate(query);
    const duration = Date.now() - start;

    expect(video.status).toBe('complete');
    expect(duration).toBeLessThan(30000);
  });

  it('should handle API failures gracefully', async () => {
    // Mock Pexels failure
    mockPexelsAPI.fail();

    const query = 'Test query';
    const video = await cinematicPipeline.generate(query);

    // Should fallback to Brave images
    expect(video.status).toBe('complete');
    expect(video.recipe.scenes[0].primaryAsset?.source).toBe('brave');
  });
});
```

### 11.3 Manual Testing Checklist

- [ ] Test with science query (black holes)
- [ ] Test with nature query (octopuses)
- [ ] Test with history query (pyramids)
- [ ] Test with culture query (music evolution)
- [ ] Verify all transitions work smoothly
- [ ] Check text readability on mobile
- [ ] Test progressive playback (start at 15s)
- [ ] Verify visual thread suggestions
- [ ] Test share functionality
- [ ] Check video quality (vertical format)

---

## 12. Deployment Plan

### 12.1 Pre-Deployment Checklist

- [ ] All API keys configured in production
- [ ] Database migrations applied
- [ ] Supabase Storage bucket created (`cinematic-videos`)
- [ ] Netlify functions deployed
- [ ] CDN caching configured
- [ ] Analytics tracking added
- [ ] Error monitoring (Sentry) configured
- [ ] Rate limiting implemented
- [ ] Asset cache warmed (trending topics)

### 12.2 Deployment Steps

1. **Deploy database schema**
   ```bash
   supabase db push
   ```

2. **Deploy Netlify functions**
   ```bash
   netlify deploy --prod
   ```

3. **Deploy frontend**
   ```bash
   npm run build
   git push origin main
   ```

4. **Verify production**
   - Test with sample queries
   - Check rendering performance
   - Verify asset fetching
   - Test share functionality

### 12.3 Rollout Strategy

**Phase 1: Beta (Week 1)**
- Enable for 10% of users
- Monitor performance metrics
- Gather feedback

**Phase 2: Gradual Rollout (Week 2-3)**
- 25% of users
- 50% of users
- 100% of users (if metrics are good)

**Phase 3: Optimization (Week 4+)**
- Analyze usage patterns
- Optimize popular queries
- Improve asset selection
- Add personalization

---

## 13. Future Enhancements

### 13.1 Phase 2 Features

**Voice Narration (TTS)**
- Add OpenAI TTS for scene narration
- Sync audio with text overlays
- Support multiple voices/languages

**Music & Sound Effects**
- Background music based on emotion
- Ambient sounds for immersion
- Volume ducking for narration

**Interactive Elements**
- Tap to pause/explore
- Scene bookmarks
- Quiz mode

### 13.2 Phase 3 Features

**Personalization**
- User style preferences (cinematic/educational/documentary)
- Saved topics
- Custom visual threads

**Advanced Visuals**
- 3D animations
- Real-time data visualizations
- User-uploaded images/videos

**Social Features**
- Share to TikTok/Instagram directly
- Video remixing
- Community curated threads

### 13.3 Phase 4 Features

**AI Presenter**
- Virtual host/narrator
- Gesture animations
- Personalized avatars

**Multi-Language Support**
- Automatic translation
- Localized visuals
- Regional preferences

**Monetization**
- Premium visual styles
- Longer videos (up to 90s)
- Watermark removal
- HD downloads

---

## Success Metrics

### Key Performance Indicators (KPIs)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to First Frame | < 15s | 90th percentile |
| Video Generation Success Rate | > 95% | All queries |
| User Engagement (watch completion) | > 70% | Average |
| Share Rate | > 15% | Per video |
| Visual Asset Relevance | > 80% | Manual review |
| Cost per Video | < $1.50 | Average |

### Analytics to Track

- Query categories distribution
- Most popular topics
- Average video duration
- Scene transition preferences
- Asset source usage (Pexels vs Runway vs Brave)
- Chunk rendering times
- Error rates by component
- User retention (return visits)

---

## Conclusion

This implementation plan provides a comprehensive roadmap for building the **Curios Visual Answer (Cinematic AI)** feature. The architecture is designed to be:

✅ **Scalable** - Chunked rendering handles any video length
✅ **Cost-effective** - Smart caching and free tier usage
✅ **Fast** - Progressive playback and parallel asset fetching
✅ **Reliable** - Multiple fallback strategies
✅ **High-quality** - AI-powered visual selection and cinematic rendering

**Estimated Timeline:** 8 weeks to production-ready feature

**Estimated Cost:** $0.50-1.50 per video generated

**Next Steps:**
1. Review and approve this plan
2. Set up API accounts (Runway/Luma, Pexels, Brave)
3. Begin Phase 1 implementation
4. Set up staging environment for testing

---

**Ready to build "Netflix for knowledge"! 🎬✨🚀**
