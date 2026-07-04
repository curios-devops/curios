// Client access to the enhanced_videos table + the enhance-swipe background job.
// Enhance kicks a server-owned job (survives navigation/reload). While the user stays on
// the movie page, the page polls the row and replaces the swipe in place when ready; if
// they left, Home shows the latest ready-but-unseen render as a card that reopens the movie.

import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

export interface EnhancedVideo {
  id: string;
  project_id: string | null;
  swipe_order: number;
  title: string;
  image_url: string | null;
  video_url: string | null;
  status: 'processing' | 'ready' | 'error';
  seen_at: string | null;
  created_at: string;
}

export interface CreateEnhanceJobParams {
  userId: string;
  projectId?: string;
  swipeOrder: number;
  /** The user's question — used to source-ground the enhanced frame via image search. */
  question: string;
  title: string;
  imagePrompt: string;
  videoPrompt: string;
  aspectRatio?: string;
}

/** Kick the server-owned enhance job. Returns the job id; the video finishes in the background. */
export async function createEnhanceJob(params: CreateEnhanceJobParams): Promise<string> {
  const { data, error } = await supabase.functions.invoke('enhance-swipe', { body: params });
  if (error) throw new Error(`enhance-swipe error: ${error.message}`);
  const payload = data as { jobId?: string; error?: string };
  if (payload?.error) throw new Error(payload.error);
  if (!payload?.jobId) throw new Error('enhance-swipe returned no jobId');
  return payload.jobId;
}

/** Poll target: the current state of one enhance job's row. */
export async function getEnhancedVideo(id: string): Promise<EnhancedVideo | null> {
  const { data, error } = await supabase
    .from('enhanced_videos')
    .select('id, project_id, swipe_order, title, image_url, video_url, status, seen_at, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    logger.warn('[enhancedVideos] getEnhancedVideo failed', { error: error.message });
    return null;
  }
  return (data as EnhancedVideo) ?? null;
}

/**
 * Enhance can be kicked before the movie persists. Once the movie saves, attach its
 * project id to the pending job rows so the server can replace the right movie_scenes row.
 */
export async function attachEnhancedToProject(jobIds: string[], projectId: string): Promise<void> {
  if (jobIds.length === 0) return;
  const { error } = await supabase
    .from('enhanced_videos')
    .update({ project_id: projectId })
    .in('id', jobIds)
    .is('project_id', null);
  if (error) logger.warn('[enhancedVideos] attachToProject failed', { error: error.message });
}

export interface LatestEnhancedVideo extends EnhancedVideo {
  /** The parent movie's description — the Home card's snippet. */
  description: string | null;
}

/** The user's newest finished-but-unseen enhanced video — the Home card. */
export async function latestUnseenEnhanced(userId: string): Promise<LatestEnhancedVideo | null> {
  const { data, error } = await supabase
    .from('enhanced_videos')
    .select('id, project_id, swipe_order, title, image_url, video_url, status, seen_at, created_at, movie_projects(description)')
    .eq('user_id', userId)
    .eq('status', 'ready')
    .is('seen_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    logger.warn('[enhancedVideos] latestUnseen failed', { error: error.message });
    return null;
  }
  if (!data) return null;
  const { movie_projects, ...row } = data as EnhancedVideo & { movie_projects: { description: string | null } | null };
  return { ...row, description: movie_projects?.description ?? null };
}

/** Mark an enhanced video seen → it leaves the top carousel; its movie stays in the Discover feed. */
export async function markEnhancedSeen(id: string): Promise<void> {
  const { error } = await supabase
    .from('enhanced_videos')
    .update({ seen_at: new Date().toISOString() })
    .eq('id', id);
  if (error) logger.warn('[enhancedVideos] markSeen failed', { error: error.message });
}
