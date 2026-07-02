// Client access to the enhanced_videos table + the enhance-swipe background job.
// Enhance kicks a server-owned job (survives navigation/reload); Home reads the user's
// ready-but-unseen rows for the top carousel and marks them seen once viewed.

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

/** A user's finished-but-unseen enhanced videos, newest first — the Home top carousel. */
export async function listUnseenEnhanced(userId: string): Promise<EnhancedVideo[]> {
  const { data, error } = await supabase
    .from('enhanced_videos')
    .select('id, project_id, swipe_order, title, image_url, video_url, status, seen_at, created_at')
    .eq('user_id', userId)
    .eq('status', 'ready')
    .is('seen_at', null)
    .order('created_at', { ascending: false });
  if (error) {
    logger.warn('[enhancedVideos] listUnseen failed', { error: error.message });
    return [];
  }
  return (data ?? []) as EnhancedVideo[];
}

/** Mark an enhanced video seen → it leaves the top carousel; its movie stays in the Discover feed. */
export async function markEnhancedSeen(id: string): Promise<void> {
  const { error } = await supabase
    .from('enhanced_videos')
    .update({ seen_at: new Date().toISOString() })
    .eq('id', id);
  if (error) logger.warn('[enhancedVideos] markSeen failed', { error: error.message });
}
