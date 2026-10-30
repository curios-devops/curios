// Private Space — /spaces. The user's personal history of curiosity nodes, and the animations they saved.

import { useEffect, useState } from 'react';
import { useSession } from '../../../hooks/useSession';
import { listMyNodes } from '../nodePersistenceService';
import { listMySavedAnimations, type HistoryItem } from '../historyService';
import type { NodeRecord } from '../types';
import ContentCard from '../components/ContentCard';

const MODE_LABEL: Record<string, string> = {
  fast_search: 'Search',
  stories: 'Magazine',
  explore: 'Article',
};

export default function SpacePage() {
  const { session, isLoading } = useSession();
  const userId = session?.user?.id;
  const [nodes, setNodes] = useState<NodeRecord[]>([]);
  const [animations, setAnimations] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      const [data, saved] = await Promise.all([listMyNodes(userId), listMySavedAnimations(userId)]);
      if (active) {
        setNodes(data);
        setAnimations(saved);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]);

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Your Space</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Everything you've asked, saved as you go.</p>

      {(loading || isLoading) ? (
        <div className="py-20 flex justify-center">
          <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : !userId ? (
        <p className="text-gray-500 dark:text-gray-400">Sign in to build your Space.</p>
      ) : nodes.length === 0 && animations.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No questions yet. Ask something to start your Space.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {animations.map((a) => (
            <ContentCard key={a.id} to={a.href} title={a.title} summary={a.summary} cover={a.cover} badge="Animation" />
          ))}
          {nodes.map((n) => (
            <ContentCard
              key={n.id}
              to={`/s/${n.share_slug}`}
              title={n.query}
              summary={n.short_summary || n.answer.slice(0, 140)}
              cover={n.cover_image || n.images[0]?.url}
              badge={MODE_LABEL[n.mode] || 'Search'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
