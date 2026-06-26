// Shared discovery ranking + routing, used by the /feed page and the Home strip.

import type { FeedItem } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

// score = recency*0.5 + engagement*0.3 (clarity deferred). Both normalized 0..1.
// Also dedups by normalized title so the same explanation never shows twice.
export function rankFeed(items: FeedItem[]): FeedItem[] {
  if (items.length === 0) return items;
  const now = Date.now();
  const engagement = (i: FeedItem) => i.view_count + i.like_count * 3 + i.share_count * 5;
  const maxEng = Math.max(1, ...items.map(engagement));
  const score = (i: FeedItem) => {
    const ageDays = (now - new Date(i.created_at).getTime()) / DAY_MS;
    const recency = 1 / (1 + ageDays);
    return recency * 0.5 + (engagement(i) / maxEng) * 0.3;
  };
  const sorted = [...items].sort((a, b) => score(b) - score(a));
  const seen = new Set<string>();
  return sorted.filter((i) => {
    const key = (i.title || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function feedItemHref(item: FeedItem): string {
  switch (item.source_table) {
    case 'curiosity_node':
      return `/s/${item.slug}`;
    case 'movie_project':
      return `/movie/share/${item.slug}`;
    case 'cinematic_video':
      return `/cinematic-results?q=${encodeURIComponent(item.title)}`;
  }
}

export const FEED_TYPE_BADGE: Record<string, string> = {
  fast_search: 'Search',
  stories: 'Story',
  explore: 'Article',
  movie: 'Movie',
  cinematic: 'Cinematic',
};
