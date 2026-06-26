// Curiosity node persistence — the heart of the Space + Share + Feed layer.
// Auto-saves a finished Q&A as a curiosity_node (authenticated users only;
// guests are no-ops). Mirrors MoviePersistenceService's guest/invalid-session
// and missing-table graceful fallbacks.

import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';
import type { FeedItem, NodeRecord, NodeSnapshot } from './types';
import { deriveTopics } from './topicService';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function isValidUuid(v: string | null | undefined): v is string {
  return !!v && UUID_RE.test(v.trim());
}

/** Short, URL-safe, collision-resistant public slug (≈11 chars of base62). */
function generateSlug(len = 11): string {
  let out = '';
  const rand = typeof crypto !== 'undefined' && crypto.getRandomValues
    ? crypto.getRandomValues(new Uint8Array(len))
    : null;
  for (let i = 0; i < len; i++) {
    const n = rand ? rand[i] : Math.floor(Math.random() * 256);
    out += BASE62[n % BASE62.length];
  }
  return out;
}

export interface SavedNodeRef {
  id: string;
  shareSlug: string;
}

/**
 * Persist a finished Q&A. Returns the new node ref, or null for guests /
 * when persistence is unavailable (callers must treat null as "ephemeral").
 * The node is created private; sharing flips it public via ensureShared().
 */
export async function saveNode(snapshot: NodeSnapshot): Promise<SavedNodeRef | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!isValidUuid(userId)) {
    logger.info('[NodePersistence] Guest — skipping node persistence');
    return null;
  }

  const shareSlug = generateSlug();

  try {
    const { data, error } = await supabase
      .from('curiosity_nodes')
      .insert({
        user_id: userId,
        mode: snapshot.mode,
        query: snapshot.query,
        answer: snapshot.answer,
        short_summary: snapshot.shortSummary ?? null,
        sources: snapshot.sources ?? [],
        images: snapshot.images ?? [],
        videos: snapshot.videos ?? [],
        follow_ups: snapshot.followUps ?? [],
        cover_image: snapshot.coverImage ?? null,
        topics: snapshot.topics ?? [],
        share_slug: shareSlug,
      })
      .select('id, share_slug')
      .single();

    if (error) throw error;
    logger.info('[NodePersistence] Node saved', { id: data.id });

    // Derive topic tags in the background and patch the row (best-effort). Kept
    // off the critical path so the UI gets its share/save buttons immediately.
    if (!snapshot.topics?.length) {
      void deriveTopics(snapshot.query, snapshot.answer).then((topics) => {
        if (topics.length) {
          supabase.from('curiosity_nodes').update({ topics }).eq('id', data.id).then(({ error: e }) => {
            if (e) logger.warn('[NodePersistence] topic update failed', { error: e.message });
          });
        }
      });
    }

    return { id: data.id as string, shareSlug: data.share_slug as string };
  } catch (error) {
    logger.warn('[NodePersistence] Persistence unavailable; node is ephemeral', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Resolve a public node by its share slug (no auth required). */
export async function getNodeBySlug(slug: string): Promise<NodeRecord | null> {
  const { data, error } = await supabase
    .from('curiosity_nodes')
    .select('*')
    .eq('share_slug', slug)
    .single();
  if (error) {
    if (error.code !== 'PGRST116') {
      logger.error('[NodePersistence] getNodeBySlug failed', { error: error.message });
    }
    return null;
  }
  return data as NodeRecord;
}

/** Make a node public (idempotent) and count the share. */
export async function ensureShared(nodeId: string): Promise<void> {
  if (!isValidUuid(nodeId)) return;
  const { error } = await supabase
    .from('curiosity_nodes')
    .update({ is_public: true })
    .eq('id', nodeId);
  if (error) {
    logger.warn('[NodePersistence] ensureShared failed', { error: error.message });
    return;
  }
  const { error: rpcError } = await supabase.rpc('increment_node_share_count', { node_uuid: nodeId });
  if (rpcError) logger.warn('[NodePersistence] share count rpc failed', { error: rpcError.message });
}

export async function incrementNodeView(nodeId: string): Promise<void> {
  if (!isValidUuid(nodeId)) return;
  const { error } = await supabase.rpc('increment_node_view_count', { node_uuid: nodeId });
  if (error) logger.warn('[NodePersistence] view count rpc failed', { error: error.message });
}

export async function toggleNodeLike(nodeId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_node_like', { node_uuid: nodeId, user_uuid: userId });
  if (error) throw error;
  return data as boolean;
}

export async function toggleNodeSave(nodeId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_node_save', { node_uuid: nodeId, user_uuid: userId });
  if (error) throw error;
  return data as boolean;
}

/** A user's own nodes — the private Space (newest first). */
export async function listMyNodes(userId: string): Promise<NodeRecord[]> {
  const { data, error } = await supabase
    .from('curiosity_nodes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    logger.error('[NodePersistence] listMyNodes failed', { error: error.message });
    return [];
  }
  return (data ?? []) as NodeRecord[];
}

/** Nodes the user has saved/bookmarked — the Library. */
export async function listSavedNodes(userId: string): Promise<NodeRecord[]> {
  const { data, error } = await supabase
    .from('node_saves')
    .select('curiosity_nodes(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    logger.error('[NodePersistence] listSavedNodes failed', { error: error.message });
    return [];
  }
  // Each row is { curiosity_nodes: NodeRecord | null }
  return (data ?? [])
    .map((row: { curiosity_nodes: NodeRecord | null }) => row.curiosity_nodes)
    .filter((n): n is NodeRecord => !!n);
}

/** Public nodes tagged with a topic — powers the /topic/:slug page. */
export async function listNodesByTopic(topic: string, limit = 60): Promise<NodeRecord[]> {
  const { data, error } = await supabase
    .from('curiosity_nodes')
    .select('*')
    .eq('is_public', true)
    .contains('topics', [topic])
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    logger.error('[NodePersistence] listNodesByTopic failed', { error: error.message });
    return [];
  }
  return (data ?? []) as NodeRecord[];
}

/** The discovery feed (public nodes + movies + cinematic), recent first. */
export async function listFeed(limit = 60): Promise<FeedItem[]> {
  const { data, error } = await supabase
    .from('discovery_feed')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    logger.error('[NodePersistence] listFeed failed', { error: error.message });
    return [];
  }
  return (data ?? []) as FeedItem[];
}
