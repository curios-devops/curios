// History — the signed-in user's own activity (search, stories, avatar, movies)
// in one chronological list. Reuses the Space layer's curiosity_nodes plus the
// user's own movie_projects. (Avatar isn't persisted yet — see AvatarSearchResults.)

import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';
import { listMyNodes } from './nodePersistenceService';

export type HistoryType = 'fast_search' | 'stories' | 'explore' | 'avatar' | 'movie';

export interface HistoryItem {
  id: string;
  type: HistoryType;
  title: string;
  summary: string | null;
  cover: string | null;
  href: string;
  created_at: string;
}

interface MovieRow {
  id: string;
  title: string | null;
  question: string;
  description: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

/** The user's own completed movies (newest first). */
async function listMyMovies(userId: string): Promise<HistoryItem[]> {
  const { data, error } = await supabase
    .from('movie_projects')
    .select('id, title, question, description, thumbnail_url, created_at')
    .eq('user_id', userId)
    .eq('status', 'complete')
    .order('created_at', { ascending: false });
  if (error) {
    logger.warn('[History] listMyMovies failed', { error: error.message });
    return [];
  }
  return (data ?? []).map((m: MovieRow) => ({
    id: m.id,
    type: 'movie' as const,
    title: (m.title && m.title.trim()) || m.question,
    summary: m.description,
    cover: m.thumbnail_url,
    href: `/movie/share/${m.id}`,
    created_at: m.created_at,
  }));
}

/** Everything the user has made, merged and sorted newest-first. */
export async function listMyHistory(userId: string): Promise<HistoryItem[]> {
  const [nodes, movies] = await Promise.all([listMyNodes(userId), listMyMovies(userId)]);

  const nodeItems: HistoryItem[] = nodes.map((n) => ({
    id: n.id,
    type: (n.mode as HistoryType) ?? 'fast_search',
    title: n.query,
    summary: n.short_summary || n.answer.slice(0, 140),
    cover: n.cover_image || n.images[0]?.url || null,
    href: `/s/${n.share_slug}`,
    created_at: n.created_at,
  }));

  return [...nodeItems, ...movies].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
