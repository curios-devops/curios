// Movie Mode types.
// Movie starts from a *question* and produces a set of shareable **swipes** — independent
// knowledge frames (TikTok/Reels-style). Each swipe is a standalone short video unit:
// 1 idea, 1 coherent visual, understandable without context.
//
// Cost rule: only the CORE swipe auto-generates video. Secondary swipes show their image
// as a preview and lazy-generate video on demand when the user selects them.

export type MovieAspectRatio = '16:9';

/** Visual style the whole movie is rendered in ("Watch as…", docs/Movie/moviemode.md). */
export type MovieMode = 'real' | 'cinematic' | 'cartoon' | 'pixar' | 'lego' | 'anime' | 'retro80s' | 'meme';

/** "Continue Exploring" carousel item — a related theme with a small generated image. */
export interface MovieRelatedTopic {
  title: string;
  imageUrl?: string;
}

export interface MovieSource {
  title: string;
  url: string;
  snippet: string;
}

export interface EnhancedQuestion {
  researchQuestion: string;   // for the grounding/search step
  visualStoryQuestion: string; // the human/emotional framing for the visuals
  /** 0 = artistic/abstract, 100 = photojournalistic. ≥50 grounds the swipe frames on a real photo. */
  realismScore?: number;
  /** Visual mode the agent proposes for this query (news→real, science→cinematic, …). */
  proposedMode?: MovieMode;
}

// The core swipe answers the question directly; the rest deepen it.
export type SwipeRole = 'core' | 'why' | 'how' | 'data' | 'insight';

export interface MovieSwipe {
  id: string;
  order: number;
  role: SwipeRole;
  isCore: boolean;
  title: string;
  narration: string;
  imagePrompt: string;   // for gpt-image-2 (the still frame / preview)
  videoPrompt: string;   // motion prompt for LTX image-to-video
  transitionStyle: string;
  durationSeconds: number;
  /** Voice chosen for the whole set (who best carries the topic). Not persisted — set-level. */
  narratorGender?: 'male' | 'female';

  imageUrl?: string;
  videoUrl?: string;
  narrationAudioUrl?: string;

  /** True once the premium Enhance render replaced this swipe's image/video. */
  enhanced?: boolean;

  // pending → image_ready (preview, no video) → rendering → ready → error
  status: 'pending' | 'image_ready' | 'rendering' | 'ready' | 'error';
  error?: string;
}

export interface ViralPackage {
  title: string;
  caption: string;
  hashtags: string[];
  thumbnailText: string;
  viralScore: number; // 0-100
}

export interface MovieExperience {
  id?: string;
  question: string;
  enhanced: EnhancedQuestion;
  title: string;
  description: string;
  narrative: string;
  /** The visual mode this movie was rendered in — Enhance and lazy renders must respect it. */
  mode?: MovieMode;
  swipes: MovieSwipe[];
  sources: MovieSource[];
  /** "Continue Exploring" themes (kept as-is across mode regenerations). */
  relatedTopics?: MovieRelatedTopic[];
  totalDurationSeconds: number;
  /** Shared seed so on-demand swipe videos keep the core's visual style. */
  styleSeed: number;
  /** The narrator voice chosen for this experience (male/female). */
  narratorGender?: 'male' | 'female';
  /** The core swipe's video — the primary shareable asset. */
  coreVideoUrl?: string;
  /** Alias of coreVideoUrl, kept for the public share page / persistence column. */
  fullVideoUrl?: string;
  viral?: ViralPackage;
}

export type MovieStage =
  | 'enhancing'
  | 'research'
  | 'directing'
  | 'storyboard'
  | 'images'
  | 'rendering' // core swipe video only
  | 'viral'
  | 'complete';

export interface MovieProgress {
  stage: MovieStage;
  message: string;
  progress: number; // 0-100
  swipes?: MovieSwipe[];
}

export interface GenerateMovieOptions {
  userId?: string;
  aspectRatio?: MovieAspectRatio;
  enableNarration?: boolean;
  /** Visual mode override (mode dropdown). When absent, the enhancement agent's proposal is used. */
  mode?: MovieMode;
  /** Reuse these Continue Exploring topics instead of generating new ones (mode regeneration). */
  relatedTopics?: MovieRelatedTopic[];
  /** When false, skip even the core video and stop at images (storyboard preview). */
  renderCoreVideo?: boolean;
  /**
   * Checked before each swipe's default image/video API call. Returns true when the
   * user already queued the premium Enhance for that swipe — the default render is
   * skipped and the enhanced result will fill the swipe instead.
   */
  isEnhanceRequested?: (swipe: MovieSwipe) => boolean;
  onProgress?: (progress: MovieProgress) => void;
  onSwipeReady?: (swipe: MovieSwipe) => void;
}

/** Options for lazy, on-demand rendering of a secondary swipe's video. */
export interface RenderSwipeVideoOptions {
  userId?: string;
  projectId?: string;
  styleSeed?: number;
  /** The movie's visual mode — keeps lazy renders in the same style. */
  mode?: MovieMode;
}
