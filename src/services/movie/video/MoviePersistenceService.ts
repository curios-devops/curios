// Movie persistence — saves a completed MovieExperience to Supabase (movie_projects +
// movie_scenes) and handles engagement. Mirrors cinematic's VideoPersistenceService,
// including its guest/invalid-user and missing-table graceful fallbacks.

import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';
import type { MovieExperience } from '../types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class MoviePersistenceService {
  private localId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `local-${crypto.randomUUID()}`;
    }
    return `local-${Date.now()}`;
  }

  private isValidUuid(v: string | null | undefined): v is string {
    return !!v && UUID_RE.test(v.trim());
  }

  /** Save a finished movie. Returns the new project id (or a local- id for guests). */
  async saveMovie(
    experience: MovieExperience,
    userId: string,
    aspectRatio: string,
    generationTimeMs?: number,
  ): Promise<string> {
    const trimmed = userId?.trim();
    if (!this.isValidUuid(trimmed)) {
      const id = this.localId();
      logger.info('[MoviePersistence] Guest/invalid user — skipping DB persistence', { id });
      return id;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUserId = sessionData?.session?.user?.id;
    if (!sessionUserId || sessionUserId !== trimmed) {
      const id = this.localId();
      logger.info('[MoviePersistence] No matching auth session — skipping DB persistence', { id });
      return id;
    }

    try {
      const { data: project, error } = await supabase
        .from('movie_projects')
        .insert({
          user_id: trimmed,
          question: experience.question,
          research_question: experience.enhanced.researchQuestion,
          visual_story_question: experience.enhanced.visualStoryQuestion,
          title: experience.title,
          description: experience.description,
          narrative: experience.narrative,
          full_video_url: experience.coreVideoUrl ?? experience.fullVideoUrl,
          scene_count: experience.swipes.length,
          duration_seconds: experience.totalDurationSeconds,
          aspect_ratio: aspectRatio,
          sources: experience.sources,
          viral: experience.viral ?? {},
          generation_time_ms: generationTimeMs,
          status: 'complete',
        })
        .select('id')
        .single();

      if (error) throw error;
      const projectId = project.id as string;

      // Persist swipes (best-effort; a swipe failure shouldn't lose the movie).
      const swipeRows = experience.swipes.map((s) => ({
        project_id: projectId,
        scene_order: s.order,
        is_core: s.isCore,
        swipe_role: s.role,
        duration_seconds: s.durationSeconds,
        narration: s.narration,
        image_prompt: s.imagePrompt,
        video_prompt: s.videoPrompt,
        transition_style: s.transitionStyle,
        image_url: s.imageUrl,
        video_url: s.videoUrl,
        narration_audio_url: s.narrationAudioUrl,
        status: s.status,
        error: s.error,
      }));
      const { error: swipesError } = await supabase.from('movie_scenes').insert(swipeRows);
      if (swipesError) {
        logger.warn('[MoviePersistence] Failed to persist swipes', { error: swipesError.message });
      }

      logger.info('[MoviePersistence] Movie saved', { projectId });
      return projectId;
    } catch (error) {
      const id = this.localId();
      logger.warn('[MoviePersistence] Persistence unavailable; returning local id', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      return id;
    }
  }

  async getMovie(projectId: string) {
    const { data, error } = await supabase
      .from('movie_projects')
      .select('*, movie_scenes(*)')
      .eq('id', projectId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      logger.error('[MoviePersistence] getMovie failed', { error: error.message });
      return null;
    }
    return data;
  }

  /** Persist a lazily-generated swipe video back to its row (best-effort). */
  async updateSwipeVideo(projectId: string, swipeOrder: number, videoUrl: string): Promise<void> {
    if (!this.isValidUuid(projectId)) return;
    const { error } = await supabase
      .from('movie_scenes')
      .update({ video_url: videoUrl, status: 'ready' })
      .eq('project_id', projectId)
      .eq('scene_order', swipeOrder);
    if (error) logger.warn('[MoviePersistence] updateSwipeVideo failed', { error: error.message });
  }

  /**
   * Persist an enhanced swipe's new image and/or video back to its row (best-effort).
   * Used by the Enhance path, which replaces the cheap frame with a gpt-image-2 one.
   */
  async updateSwipeMedia(
    projectId: string,
    swipeOrder: number,
    media: { imageUrl?: string; videoUrl?: string },
  ): Promise<void> {
    if (!this.isValidUuid(projectId)) return;
    const patch: Record<string, string> = { status: 'ready' };
    if (media.imageUrl) patch.image_url = media.imageUrl;
    if (media.videoUrl) patch.video_url = media.videoUrl;
    const { error } = await supabase
      .from('movie_scenes')
      .update(patch)
      .eq('project_id', projectId)
      .eq('scene_order', swipeOrder);
    if (error) logger.warn('[MoviePersistence] updateSwipeMedia failed', { error: error.message });
  }

  async incrementShareCount(projectId: string): Promise<void> {
    if (!this.isValidUuid(projectId)) return;
    const { error } = await supabase.rpc('increment_movie_share_count', { project_uuid: projectId });
    if (error) logger.warn('[MoviePersistence] share count rpc failed', { error: error.message });
  }

  async toggleLike(projectId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('toggle_movie_like', { project_uuid: projectId, user_uuid: userId });
    if (error) throw error;
    return data as boolean;
  }

  async toggleSave(projectId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('toggle_movie_save', { project_uuid: projectId, user_uuid: userId });
    if (error) throw error;
    return data as boolean;
  }
}
