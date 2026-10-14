// Discovery Feed — /feed. Public nodes + movies + cinematic from the
// discovery_feed view, ranked client-side. Not infinite: a "curiosity reset"
// breaks the grid every few items (anti-doomscroll, blueprint §7).

import { useEffect, useMemo, useState } from 'react';
import { listFeed } from '../nodePersistenceService';
import type { FeedItem } from '../types';
import ContentCard from '../components/ContentCard';
import { rankFeed, feedItemHref, FEED_TYPE_BADGE } from '../feedRanking';

const RESET_EVERY = 6;

// The kinds that are saved and shared (also on the Home strip). "All" includes everything.
const TABS: { id: string; label: string; types?: string[] }[] = [
  { id: 'all', label: 'All' },
  { id: 'search', label: 'Search', types: ['fast_search'] },
  { id: 'magazine', label: 'Magazine', types: ['stories'] },
  { id: 'video', label: 'Video', types: ['movie', 'cinematic'] },
];

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const data = await listFeed(60, TABS.find((t) => t.id === tab)?.types);
      if (active) {
        setItems(data);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [tab]);

  const ranked = useMemo(() => rankFeed(items), [items]);

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Discover</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Explanations shared across CuriosAI.</p>

      {/* Tabs — same underline style as the results pages. */}
      <div className="flex gap-6 border-b border-gray-200 dark:border-gray-800 mb-6" role="tablist">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className="pb-3 -mb-px border-b-2 text-sm font-medium transition-colors"
              style={active
                ? { color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }
                : { color: 'var(--ui-text-secondary)', borderColor: 'transparent' }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

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
                    to={feedItemHref(item)}
                    title={item.title}
                    summary={item.summary}
                    cover={item.cover_image}
                    badge={FEED_TYPE_BADGE[item.type] || undefined}
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
