/**
 * Cinematic Orchestrator
 * Main coordinator for cinematic video generation workflow
 */

import { AnswerLLMAgent } from './AnswerLLMAgent';
import { SceneDirectorAgent } from './SceneDirectorAgent';
import { SceneGenerator } from './SoraSceneGenerator';
import { CinematicVideo, CinematicProgress, SceneProgress } from '../types';

export class CinematicOrchestrator {
  private answerAgent: AnswerLLMAgent;
  private directorAgent: SceneDirectorAgent;
  private sceneGenerator: SceneGenerator;

  constructor() {
    this.answerAgent = new AnswerLLMAgent();
    this.directorAgent = new SceneDirectorAgent();
    this.sceneGenerator = new SceneGenerator();
  }

  /**
   * Main orchestration method
   * Generates a complete cinematic video from a user query
   */
  async generateCinematicVideo(
    query: string,
    format: 'vertical' | 'horizontal',
    onProgress?: (progress: CinematicProgress) => void
  ): Promise<CinematicVideo> {
    const startTime = Date.now();

    console.log(`[CinematicOrchestrator] Starting generation for query: "${query}"`);
    console.log(`[CinematicOrchestrator] Format: ${format}`);

    try {
      // Stage 1: Planning (5%)
      this.updateProgress(onProgress, {
        stage: 'planning',
        progress: 5,
        message: 'Analyzing query and creating explanation...',
      });

      const explanation = await this.answerAgent.generateExplanation(query);

      console.log(`[CinematicOrchestrator] Explanation generated:`, {
        topic: explanation.topic,
        category: explanation.category,
        keyPoints: explanation.keyPoints.length,
      });

      // Stage 2: Scene Direction (15%)
      this.updateProgress(onProgress, {
        stage: 'planning',
        progress: 15,
        message: 'Creating cinematic scene structure...',
      });

      const recipe = await this.directorAgent.directScenes(explanation, format);

      console.log(`[CinematicOrchestrator] Recipe created:`, {
        scenes: recipe.scenes.length,
        totalDuration: recipe.totalDuration,
      });

      // Stage 3: Generate scenes with Sora (20% - 80%)
      this.updateProgress(onProgress, {
        stage: 'generating',
        progress: 20,
        message: `Generating ${recipe.scenes.length} cinematic scenes with Sora AI...`,
      });

      const sceneVideos = await this.sceneGenerator.generateScenes(
        recipe.scenes,
        (sceneProgress: SceneProgress[]) => {
          // Calculate overall progress (20% base + up to 60% for scenes)
          const completedScenes = sceneProgress.filter((s) => s.status === 'completed').length;
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

      console.log(`[CinematicOrchestrator] All scenes generated:`, {
        sceneCount: sceneVideos.size,
      });

      // Stage 4: Composing (80% - 95%)
      // For now, we'll skip composition and use the first scene as final video
      // In full implementation, this would stitch scenes together with text overlays
      this.updateProgress(onProgress, {
        stage: 'composing',
        progress: 85,
        message: 'Composing final cinematic video...',
      });

      // Get first scene as placeholder for final video
      // TODO: Implement full video composition with text overlays
      const firstSceneUrl = sceneVideos.get(recipe.scenes[0].id);

      this.updateProgress(onProgress, {
        stage: 'composing',
        progress: 95,
        message: 'Finalizing video...',
      });

      // Stage 5: Complete (100%)
      this.updateProgress(onProgress, {
        stage: 'complete',
        progress: 100,
        message: 'Cinematic video complete!',
      });

      const generationTime = Date.now() - startTime;

      console.log(`[CinematicOrchestrator] Generation complete in ${generationTime}ms`);

      // Build final result
      const cinematicVideo: CinematicVideo = {
        id: recipe.videoId,
        query,
        recipe,
        status: 'complete',
        progress: 100,
        currentStage: 'Complete',
        sceneVideos,
        finalVideoUrl: firstSceneUrl, // TODO: Replace with composed video URL
        title: explanation.topic,
        description: explanation.hook,
        duration: recipe.totalDuration,
        format,
        generationTimeMs: generationTime,
        createdAt: new Date(),
      };

      return cinematicVideo;
    } catch (error) {
      console.error('[CinematicOrchestrator] Generation failed:', error);

      this.updateProgress(onProgress, {
        stage: 'complete',
        progress: 100,
        message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });

      throw error;
    }
  }

  /**
   * Update progress callback
   */
  private updateProgress(
    callback: ((progress: CinematicProgress) => void) | undefined,
    progress: CinematicProgress
  ): void {
    if (callback) {
      callback(progress);
    }

    // Also log progress
    console.log(
      `[CinematicOrchestrator] Progress: ${progress.stage} - ${progress.progress}% - ${progress.message}`
    );
  }

  /**
   * Check if Sora is available before starting generation
   */
  async checkSoraAvailability(): Promise<boolean> {
    console.log('[CinematicOrchestrator] Checking Sora availability...');
    const available = await this.sceneGenerator.checkAvailability();
    console.log(`[CinematicOrchestrator] Sora available: ${available}`);
    return available;
  }
}
