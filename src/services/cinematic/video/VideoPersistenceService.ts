/**
 * Video Persistence Service
 * Handles saving and retrieving cinematic videos from Supabase
 */

import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';
import type { CinematicExperience, CinematicScene } from '../cinematicService';

export interface SavedCinematicVideo {
  id: string;
  userId: string;
  query: string;
  title: string;
  description: string;
  narrative: string;
  fullVideoUrl: string;
  fullVideoPath: string;
  thumbnailUrl?: string;
  sceneCount: number;
  durationSeconds: number;
  aspectRatio: string;
  scenes: CinematicScene[];
  generationTimeMs?: number;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  saveCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserVideoEngagement {
  isLiked: boolean;
  isSaved: boolean;
}

export class VideoPersistenceService {
  private readonly uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private buildLocalVideoId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `local-${crypto.randomUUID()}`;
    }
    return `local-${Date.now()}`;
  }

  private isMissingCinematicVideosTable(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    const maybeError = error as {
      code?: string;
      message?: string;
      details?: string;
      hint?: string;
      status?: number;
    };

    const message = `${maybeError.message || ''} ${maybeError.details || ''} ${maybeError.hint || ''}`.toLowerCase();

    return (
      maybeError.code === 'PGRST205' ||
      message.includes('relation') && message.includes('cinematic_videos') ||
      message.includes('table') && message.includes('cinematic_videos') ||
      message.includes('not found') && message.includes('cinematic_videos') ||
      (maybeError.status === 404 && message.includes('cinematic_videos'))
    );
  }

  private isValidUuid(value: string | null | undefined): value is string {
    if (!value) return false;
    return this.uuidRegex.test(value.trim());
  }

  private isPermissionOrInputError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;

    const maybeError = error as {
      code?: string;
      message?: string;
      details?: string;
      hint?: string;
      status?: number;
    };

    const message = `${maybeError.message || ''} ${maybeError.details || ''} ${maybeError.hint || ''}`.toLowerCase();

    return (
      maybeError.code === '22P02' ||
      maybeError.code === '42501' ||
      maybeError.status === 400 ||
      maybeError.status === 401 ||
      maybeError.status === 403 ||
      message.includes('invalid input syntax for type uuid') ||
      message.includes('new row violates row-level security policy') ||
      message.includes('permission denied')
    );
  }

  /**
   * Save a complete cinematic experience to database
   */
  async saveCinematicVideo(
    experience: CinematicExperience,
    fullVideoUrl: string,
    fullVideoPath: string | null,
    userId: string,
    aspectRatio: string,
    generationTimeMs?: number
  ): Promise<string> {
    try {
      const trimmedUserId = userId?.trim();
      if (!this.isValidUuid(trimmedUserId)) {
        const localId = this.buildLocalVideoId();
        logger.info('[VideoPersistence] Skipping DB persistence for guest/invalid user id', {
          fallbackVideoId: localId,
          userId: trimmedUserId || null,
        });
        return localId;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const sessionUserId = sessionData?.session?.user?.id;

      if (sessionError || !sessionUserId || sessionUserId !== trimmedUserId) {
        const localId = this.buildLocalVideoId();
        logger.info('[VideoPersistence] Skipping DB persistence because no matching auth session was found', {
          fallbackVideoId: localId,
          expectedUserId: trimmedUserId,
          sessionUserId: sessionUserId || null,
          sessionError: sessionError?.message,
        });
        return localId;
      }

      const { data, error } = await supabase
        .from('cinematic_videos')
        .insert({
          user_id: trimmedUserId,
          query: experience.rewrittenQuery,
          title: experience.title,
          description: experience.description,
          narrative: experience.narrative,
          full_video_url: fullVideoUrl,
          full_video_path: fullVideoPath, // Can be null
          scene_count: experience.scenes.length,
          duration_seconds: experience.totalDurationSeconds,
          aspect_ratio: aspectRatio,
          scenes: experience.scenes,
          generation_time_ms: generationTimeMs,
          status: 'complete',
        })
        .select('id')
        .single();

      if (error) {
        if (this.isMissingCinematicVideosTable(error)) {
          const localId = this.buildLocalVideoId();
          logger.warn('[VideoPersistence] cinematic_videos table is missing (404). Continuing without DB persistence.', {
            fallbackVideoId: localId,
            error,
          });
          return localId;
        }

        if (this.isPermissionOrInputError(error)) {
          const localId = this.buildLocalVideoId();
          logger.warn('[VideoPersistence] Insert rejected by auth/input constraints. Continuing with local video id.', {
            fallbackVideoId: localId,
            error,
          });
          return localId;
        }

        logger.error('[VideoPersistence] Failed to save video', { error });
        throw new Error(`Failed to save video: ${error.message}`);
      }

      logger.info('[VideoPersistence] Video saved successfully', {
        videoId: data.id,
        userId,
      });

      return data.id;
    } catch (error) {
      if (this.isMissingCinematicVideosTable(error)) {
        const localId = this.buildLocalVideoId();
        logger.warn('[VideoPersistence] Persistence unavailable; returning local video id', {
          fallbackVideoId: localId,
          error: error instanceof Error ? error.message : String(error),
        });
        return localId;
      }

      if (this.isPermissionOrInputError(error)) {
        const localId = this.buildLocalVideoId();
        logger.warn('[VideoPersistence] Persistence blocked by auth/input constraints; returning local video id', {
          fallbackVideoId: localId,
          error: error instanceof Error ? error.message : String(error),
        });
        return localId;
      }

      logger.error('[VideoPersistence] Error saving video', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get a cinematic video by ID
   */
  async getVideo(videoId: string): Promise<SavedCinematicVideo | null> {
    try {
      const { data, error } = await supabase
        .from('cinematic_videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw error;
      }

      return this.mapToSavedVideo(data);
    } catch (error) {
      logger.error('[VideoPersistence] Error fetching video', {
        videoId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get user's cinematic videos
   */
  async getUserVideos(userId: string, limit = 20): Promise<SavedCinematicVideo[]> {
    try {
      const { data, error } = await supabase
        .from('cinematic_videos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data.map((video) => this.mapToSavedVideo(video));
    } catch (error) {
      logger.error('[VideoPersistence] Error fetching user videos', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get user's saved videos
   */
  async getSavedVideos(userId: string, limit = 20): Promise<SavedCinematicVideo[]> {
    try {
      const { data, error } = await supabase
        .from('cinematic_video_saves')
        .select('video_id, cinematic_videos(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data
        .map((save: any) => save.cinematic_videos)
        .filter(Boolean)
        .map((video) => this.mapToSavedVideo(video));
    } catch (error) {
      logger.error('[VideoPersistence] Error fetching saved videos', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Increment view count
   */
  async incrementViewCount(videoId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_video_view_count', {
        video_uuid: videoId,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.warn('[VideoPersistence] Failed to increment view count', {
        videoId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Toggle like on a video
   */
  async toggleLike(videoId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('toggle_video_like', {
        video_uuid: videoId,
        user_uuid: userId,
      });

      if (error) {
        throw error;
      }

      return data as boolean; // Returns true if liked, false if unliked
    } catch (error) {
      logger.error('[VideoPersistence] Failed to toggle like', {
        videoId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Toggle save on a video
   */
  async toggleSave(videoId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('toggle_video_save', {
        video_uuid: videoId,
        user_uuid: userId,
      });

      if (error) {
        throw error;
      }

      return data as boolean; // Returns true if saved, false if unsaved
    } catch (error) {
      logger.error('[VideoPersistence] Failed to toggle save', {
        videoId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Submit feedback for a video
   */
  async submitFeedback(
    videoId: string,
    userId: string,
    feedbackText: string,
    rating?: number
  ): Promise<void> {
    try {
      const { error } = await supabase.from('cinematic_video_feedback').insert({
        video_id: videoId,
        user_id: userId,
        feedback_text: feedbackText,
        rating,
      });

      if (error) {
        throw error;
      }

      logger.info('[VideoPersistence] Feedback submitted', {
        videoId,
        userId,
      });
    } catch (error) {
      logger.error('[VideoPersistence] Failed to submit feedback', {
        videoId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get user engagement for a video
   */
  async getUserEngagement(videoId: string, userId: string): Promise<UserVideoEngagement> {
    try {
      const [likeResult, saveResult] = await Promise.all([
        supabase
          .from('cinematic_video_likes')
          .select('id')
          .eq('video_id', videoId)
          .eq('user_id', userId)
          .single(),
        supabase
          .from('cinematic_video_saves')
          .select('id')
          .eq('video_id', videoId)
          .eq('user_id', userId)
          .single(),
      ]);

      return {
        isLiked: !likeResult.error,
        isSaved: !saveResult.error,
      };
    } catch (error) {
      logger.warn('[VideoPersistence] Error fetching user engagement', {
        videoId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { isLiked: false, isSaved: false };
    }
  }

  /**
   * Increment share count
   */
  async incrementShareCount(videoId: string): Promise<void> {
    try {
      const { data: row, error: readError } = await supabase
        .from('cinematic_videos')
        .select('share_count')
        .eq('id', videoId)
        .single();

      if (readError) {
        throw readError;
      }

      const nextShareCount = (row?.share_count ?? 0) + 1;

      const { error } = await supabase
        .from('cinematic_videos')
        .update({ share_count: nextShareCount })
        .eq('id', videoId);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.warn('[VideoPersistence] Failed to increment share count', {
        videoId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Map database row to SavedCinematicVideo
   */
  private mapToSavedVideo(data: any): SavedCinematicVideo {
    return {
      id: data.id,
      userId: data.user_id,
      query: data.query,
      title: data.title,
      description: data.description,
      narrative: data.narrative,
      fullVideoUrl: data.full_video_url,
      fullVideoPath: data.full_video_path,
      thumbnailUrl: data.thumbnail_url,
      sceneCount: data.scene_count,
      durationSeconds: data.duration_seconds,
      aspectRatio: data.aspect_ratio,
      scenes: data.scenes || [],
      generationTimeMs: data.generation_time_ms,
      viewCount: data.view_count || 0,
      likeCount: data.like_count || 0,
      shareCount: data.share_count || 0,
      saveCount: data.save_count || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
