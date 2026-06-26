// Finite "Discover" strip for the Home page — sits under the search box.
// Anti-doomscroll by design: shows env.home.feedCount cards (no infinite scroll)
// with a "See all" link into the full /feed.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { env } from '../../../config/env';
import { listFeed } from '../nodePersistenceService';
import { rankFeed, feedItemHref, FEED_TYPE_BADGE } from '../feedRanking';
import type { FeedItem } from '../types';
import ContentCard from './ContentCard';

export default function HomeDiscovery() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    listFeed(env.home.feedCount * 3).then((data) => {
      if (active) {
        setItems(data);
        setLoaded(true);
      }
    });
    return () => { active = false; };
  }, []);

  const top = useMemo(() => rankFeed(items).slice(0, env.home.feedCount), [items]);

  // Nothing to show yet (empty feed) — keep Home clean, render nothing.
  if (loaded && top.length === 0) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-8 mt-16 mb-24">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--ui-text-tertiary)' }}>
          Discover
        </h2>
        <Link
          to="/feed"
          className="inline-flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity"
          style={{ color: 'var(--accent-primary)' }}
        >
          See all <ArrowRight size={14} />
        </Link>
      </div>

      {!loaded ? (
        <div className="py-10 flex justify-center">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {top.map((item) => (
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
      )}
    </div>
  );
}
