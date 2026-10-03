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
import MosaicCard, { type MosaicShape } from './MosaicCard';

// Pamba-style mosaic, in blocks of 5: two columns that start offset —
//   left:  vertical, then square        right: square, then vertical
// — so both columns end level (V + gap + S = S + gap + V), then one landscape
// card across the full width, and the pattern repeats. Every gap is equal.
export interface MosaicBlock<T> {
  left: Array<{ item: T; shape: MosaicShape }>;
  right: Array<{ item: T; shape: MosaicShape }>;
  wide: T | null;
}

export function buildMosaicBlocks<T>(items: T[]): MosaicBlock<T>[] {
  const blocks: MosaicBlock<T>[] = [];
  for (let i = 0; i < items.length; i += 5) {
    const [a, b, c, d, e] = items.slice(i, i + 5);
    const left: MosaicBlock<T>['left'] = [];
    const right: MosaicBlock<T>['right'] = [];
    if (a !== undefined) left.push({ item: a, shape: 'vertical' });
    if (b !== undefined) right.push({ item: b, shape: 'square' });
    if (c !== undefined) left.push({ item: c, shape: 'square' });
    if (d !== undefined) right.push({ item: d, shape: 'vertical' });
    blocks.push({ left, right, wide: e ?? null });
  }
  return blocks;
}

// Small alternating tilt, like Pamba's cards (stable per position).
const TILTS = [-1.5, 1, 1.25, -1, -0.75];

export default function HomeDiscovery() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    listFeed(Math.max(10, env.home.feedCount) * 3).then((data) => {
      if (active) {
        setItems(data);
        setLoaded(true);
      }
    });
    return () => { active = false; };
  }, []);

  // Whole blocks of 5 keep the columns level (VITE_HOME_FEED_COUNT 9 → 10).
  const count = Math.max(1, Math.round(env.home.feedCount / 5)) * 5;
  const top = useMemo(() => rankFeed(items).slice(0, count), [items, count]);
  const blocks = useMemo(() => buildMosaicBlocks(top), [top]);

  // Nothing to show yet (empty feed) — keep Home clean, render nothing.
  if (loaded && top.length === 0) return null;

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-8 mt-16 mb-24">
      <div className="flex items-center justify-between mb-5">
        <h2 className="label-mono" style={{ color: 'var(--accent-primary)' }}>
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
        <div className="flex flex-col gap-4">
          {blocks.map((block, bi) => (
            <div key={bi} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 items-start">
                <div className="flex flex-col gap-4">
                  {block.left.map((c, i) => (
                    <MosaicCard
                    key={`${c.item.source_table}-${c.item.id}`}
                    to={feedItemHref(c.item)}
                    title={c.item.title}
                    summary={c.item.summary}
                    cover={c.item.cover_image}
                    badge={FEED_TYPE_BADGE[c.item.type] || undefined}
                    shape={c.shape}
                    tilt={TILTS[(bi * 5 + i * 2) % TILTS.length]}
                  />
                  ))}
                </div>
                <div className="flex flex-col gap-4">
                  {block.right.map((c, i) => (
                    <MosaicCard
                    key={`${c.item.source_table}-${c.item.id}`}
                    to={feedItemHref(c.item)}
                    title={c.item.title}
                    summary={c.item.summary}
                    cover={c.item.cover_image}
                    badge={FEED_TYPE_BADGE[c.item.type] || undefined}
                    shape={c.shape}
                    tilt={TILTS[(bi * 5 + i * 2 + 1) % TILTS.length]}
                  />
                  ))}
                </div>
              </div>
              {block.wide && (
                <MosaicCard
                  to={feedItemHref(block.wide)}
                  title={block.wide.title}
                  summary={block.wide.summary}
                  cover={block.wide.cover_image}
                  badge={FEED_TYPE_BADGE[block.wide.type] || undefined}
                  shape="landscape"
                  tilt={TILTS[(bi * 5 + 4) % TILTS.length] / 2}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
