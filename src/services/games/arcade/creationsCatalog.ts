// Made with AI (/arcade) beyond games and songs: finished movies (cover = their core frame)
// and stories people chose to share (public curiosity nodes). Same card shape as the games.
import { supabase } from '../../../lib/supabase.ts';
import type { ArcadeCard } from './arcadeService.ts';

const base = { palette: [], style: '', mode: '2d' as const, genres: [], creatorId: null, creatorName: null };

export async function fetchMovieCatalog(limit = 100): Promise<ArcadeCard[]> {
  const { data, error } = await supabase
    .from('movie_projects')
    .select('id, title, question, thumbnail_url, like_count, view_count, created_at, movie_scenes(image_url, is_core, scene_order)')
    .eq('status', 'complete')
    .not('full_video_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((m) => {
    const scenes = [...(m.movie_scenes ?? [])].sort((a, b) => Number(b.is_core) - Number(a.is_core) || a.scene_order - b.scene_order);
    return {
      ...base, id: m.id, title: m.title || m.question, inspiredBy: m.question ?? '', votesUp: m.like_count ?? 0, plays: m.view_count ?? 0,
      createdAt: m.created_at, bg: m.thumbnail_url || scenes.find((s) => s.image_url)?.image_url || null, kind: 'movie',
    };
  });
}

/** Only stories their authors shared (is_public) — the rest are private history. */
export async function fetchStoryCatalog(limit = 100): Promise<ArcadeCard[]> {
  const { data, error } = await supabase
    .from('discovery_feed')
    .select('id, slug, title, summary, cover_image, like_count, view_count, created_at')
    .eq('type', 'stories')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((n) => ({
    ...base, id: n.slug, title: n.title, inspiredBy: n.summary ?? '', votesUp: n.like_count ?? 0, plays: n.view_count ?? 0,
    createdAt: n.created_at, bg: n.cover_image ?? null, kind: 'story',
  }));
}
