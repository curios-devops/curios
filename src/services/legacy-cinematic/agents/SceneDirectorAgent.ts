/**
 * Scene Director Agent
 * Converts structured explanations into cinematic scenes with video prompts
 */

import {
  StructuredExplanation,
  CinematicScene,
  CinematicRecipe,
  CinematicSceneType,
  CameraMotion,
  ExplanationPoint,
} from '../types';

export class SceneDirectorAgent {
  /**
   * Convert structured explanation into cinematic scenes with video prompts
   * Generates 2-4 scenes max for faster generation with VEO
   */
  async directScenes(
    explanation: StructuredExplanation,
    format: 'vertical' | 'horizontal'
  ): Promise<CinematicRecipe> {
    console.log('[SceneDirector] Creating cinematic recipe for:', explanation.topic);

    const videoId = this.generateVideoId();
    const aspectRatio = format === 'vertical' ? '9:16' as const : '16:9' as const;

    const scenes: CinematicScene[] = [];
    let currentTime = 0;

    // Determine scene count: 2-4 scenes based on keyPoints (max 4 total)
    // 1. Hook scene (8s - VEO duration)
    const hookScene = this.createHookScene(explanation, currentTime, aspectRatio);
    scenes.push(hookScene);
    currentTime += hookScene.duration;

    // 2. Select best 1-2 key points for explanation (8s each)
    const selectedPoints = explanation.keyPoints.slice(0, 2); // Max 2 keyPoints
    for (let i = 0; i < selectedPoints.length; i++) {
      const point = selectedPoints[i];
      const explanationScene = this.createExplanationScene(
        point,
        scenes.length,
        currentTime,
        aspectRatio
      );
      scenes.push(explanationScene);
      currentTime += explanationScene.duration;
    }

    // 3. Conclusion scene (8s)
    // Only add if we have room (max 4 scenes)
    if (scenes.length < 4) {
      const conclusionScene = this.createConclusionScene(
        explanation,
        scenes.length,
        currentTime,
        aspectRatio
      );
      scenes.push(conclusionScene);
      currentTime += conclusionScene.duration;
    }

    // Generate related queries
    const relatedQueries = this.generateRelatedQueries(explanation);

    const recipe: CinematicRecipe = {
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

    console.log(`[SceneDirector] Recipe created: ${scenes.length} scenes (2-4 max), ${currentTime}s total`);
    return recipe;
  }

  /**
   * Create hook scene (opening)
   */
  private createHookScene(
    explanation: StructuredExplanation,
    startTime: number,
    aspectRatio: '9:16' | '16:9'
  ): CinematicScene {
    const duration = 8; // 8s for VEO generation
    const sceneId = this.generateSceneId();

    const videoPrompt = this.buildVideoPrompt({
      type: 'hook',
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
      videoPrompt,
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

  /**
   * Create explanation scene
   */
  private createExplanationScene(
    point: ExplanationPoint,
    index: number,
    startTime: number,
    aspectRatio: '9:16' | '16:9'
  ): CinematicScene {
    const duration = 8; // 8s for VEO generation
    const sceneId = this.generateSceneId();

    const videoPrompt = this.buildVideoPrompt({
      type: 'explanation',
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
      videoPrompt,
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

  /**
   * Create conclusion scene (closing)
   */
  private createConclusionScene(
    explanation: StructuredExplanation,
    index: number,
    startTime: number,
    aspectRatio: '9:16' | '16:9'
  ): CinematicScene {
    const duration = 8; // 8s for VEO generation
    const sceneId = this.generateSceneId();

    const videoPrompt = this.buildVideoPrompt({
      type: 'conclusion',
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
      videoPrompt,
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
   * Build engineered video prompt with cinematic qualities
   */
  private buildVideoPrompt(params: {
    type: CinematicSceneType;
    emotion: string;
    visualHint: string;
    aspectRatio: string;
  }): string {
    const { type, emotion, visualHint, aspectRatio } = params;

    // Base cinematic qualities
    const quality = 'Cinematic 4K quality, professional cinematography';
    const resolution = aspectRatio === '9:16' ? '1080x1920 vertical format' : '1920x1080 horizontal format';

    switch (type) {
      case 'hook':
        return `
Opening cinematic shot: ${visualHint}
Camera: Slow zoom in, dramatic entrance, establishing shot
Lighting: Dramatic shadows, high contrast, ${emotion} atmosphere
Mood: Attention-grabbing, ${emotion}, mysterious and intriguing
Subject: Clear focus on main element, visually striking
${quality}
Duration: 4 seconds
${resolution}
Style: Documentary-style realism
        `.trim();

      case 'explanation':
        return `
${visualHint}
Camera: Smooth pan or gentle movement, medium shot, stable framing
Lighting: Clear, even lighting, naturally lit scene for clarity
Mood: ${emotion}, educational, clear and focused, informative
Subject: Well-framed, easy to understand, visually appealing
${quality}
Duration: 5 seconds
${resolution}
Style: Clean, professional documentary
        `.trim();

      case 'insight':
        return `
Mind-blowing reveal: ${visualHint}
Camera: Dramatic zoom out or slow orbit, revealing shot, epic scale
Lighting: Golden hour glow, cinematic backlighting, magical atmosphere
Mood: Wonder, awe-inspiring, breathtaking, jaw-dropping moment
Subject: Stunning visual moment with "wow" factor, memorable imagery
${quality}
Duration: 6 seconds
${resolution}
Style: Epic cinematic reveal
        `.trim();

      case 'conclusion':
        return `
Closing shot: ${visualHint}
Camera: Static or gentle pull back, conclusive framing, peaceful
Lighting: Soft, warm, calming atmosphere, gentle illumination
Mood: Satisfying, peaceful, clear resolution, contemplative
Subject: Final memorable image, leaves lasting impression
${quality}
Duration: 4 seconds
${resolution}
Style: Reflective documentary ending
        `.trim();

      default:
        return visualHint;
    }
  }

  /**
   * Select appropriate camera motion based on emotion
   */
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

  /**
   * Generate related query suggestions
   */
  private generateRelatedQueries(explanation: StructuredExplanation): string[] {
    const topic = explanation.topic;

    return [
      `How does ${topic} work in detail?`,
      `The science behind ${topic}`,
      `Why is ${topic} important?`,
      `The future of ${topic}`,
    ];
  }

  /**
   * Generate unique video ID
   */
  private generateVideoId(): string {
    return `cinematic_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Generate unique scene ID
   */
  private generateSceneId(): string {
    return `scene_${Math.random().toString(36).substring(2, 10)}`;
  }
}
