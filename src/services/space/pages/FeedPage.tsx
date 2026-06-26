// Discovery Feed — /feed. Public nodes + movies + cinematic from the
// discovery_feed view, ranked client-side. Not infinite: a "curiosity reset"
// breaks the grid every few items (anti-doomscroll, blueprint §7).

import { useEffect, useMemo, useState } from 'react';
import { listFeed } from '../nodePersistenceService';
import type { FeedItem } from '../types';
import ContentCard from '../components/ContentCard';

const DAY_MS = 24 * 60 * 60 * 1000;
const RESET_EVERY = 6;

// score = recency*0.5 + engagement*0.3 (clarity deferred). Both normalized 0..1.
function rank(items: FeedItem[]): FeedItem[] {
  if (items.length === 0) return items;
  const now = Date.now();
  const engagement = (i: FeedItem) => i.view_count + i.like_count * 3 + i.share_count * 5;
  const maxEng = Math.max(1, ...items.map(engagement));
  const score = (i: FeedItem) => {
    const ageDays = (now - new Date(i.created_at).getTime()) / DAY_MS;
    const recency = 1 / (1 + ageDays); // 1 today, decays with age
    return recency * 0.5 + (engagement(i) / maxEng) * 0.3;
  };
  return [...items].sort((a, b) => score(b) - score(a));
}

function hrefFor(item: FeedItem): string {
  switch (item.source_table) {
    case 'curiosity_node':
      return `/s/${item.slug}`;
    case 'movie_project':
      return `/movie/share/${item.slug}`;
    case 'cinematic_video':
      return `/cinematic-results?q=${encodeURIComponent(item.title)}`;
  }
}

const TYPE_BADGE: Record<string, string> = {
  fast_search: 'Search',
  stories: 'Story',
  explore: 'Article',
  movie: 'Movie',
  cinematic: 'Cinematic',
};

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await listFeed();
      if (active) {
        setItems(data);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const ranked = useMemo(() => rank(items), [items]);

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Discover</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Explanations shared across CuriosAI.</p>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : ranked.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">Nothing here yet. Share an answer to seed the feed.</p>
      ) : (
        <div className="space-y-8">
          {chunk(ranked, RESET_EVERY).map((group, gi) => (
            <div key={gi} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.map((item) => (
                  <ContentCard
                    key={`${item.source_table}-${item.id}`}
                    to={hrefFor(item)}
                    title={item.title}
                    summary={item.summary}
                    cover={item.cover_image}
                    badge={TYPE_BADGE[item.type] || undefined}
                  />
                ))}
              </div>
              {gi < chunk(ranked, RESET_EVERY).length - 1 && (
                <div className="text-center py-4 text-sm text-gray-400 dark:text-gray-500">
                  Take a breath — keep exploring below.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
