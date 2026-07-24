// History — /history. The signed-in user's own search, stories, avatar and
// movies in one place, filterable by type. Mirrors SpacePage's layout.

import { useEffect, useMemo, useState } from 'react';
import { useSession } from '../../../hooks/useSession';
import { useTranslation } from '../../../hooks/useTranslation';
import { listMyHistory, type HistoryItem, type HistoryType } from '../historyService';
import ContentCard from '../components/ContentCard';

const BADGE: Record<HistoryType, string> = {
  fast_search: 'Search',
  stories: 'Story',
  explore: 'Article',
  avatar: 'Avatar',
  movie: 'Movie',
};

type TabKey = 'all' | HistoryType;

export default function HistoryPage() {
  const { session, isLoading } = useSession();
  const { t } = useTranslation();
  const userId = session?.user?.id;
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('all');

  useEffect(() => {
    let active = true;
    (async () => {
      if (!userId) { setLoading(false); return; }
      const data = await listMyHistory(userId);
      if (active) { setItems(data); setLoading(false); }
    })();
    return () => { active = false; };
  }, [userId]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: t('all') || 'All' },
    { key: 'fast_search', label: t('search') || 'Search' },
    { key: 'stories', label: t('stories') || 'Stories' },
    { key: 'avatar', label: t('avatar') || 'Avatar' },
    { key: 'movie', label: t('movies') || 'Movies' },
  ];

  const filtered = useMemo(
    () => (tab === 'all' ? items : items.filter((i) => i.type === tab)),
    [items, tab],
  );

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">{t('history') || 'History'}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('historySubtitle') || 'Everything you have created, in one place.'}</p>

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(({ key, label }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors"
              style={active
                ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)', borderColor: 'var(--accent-primary)' }
                : { backgroundColor: 'transparent', color: 'var(--ui-text-secondary)', borderColor: 'var(--ui-border-default)' }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {(loading || isLoading) ? (
        <div className="py-20 flex justify-center">
          <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : !userId ? (
        <p className="text-gray-500 dark:text-gray-400">{t('historySignedOut') || 'Sign in to see your history.'}</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">{t('historyEmpty') || 'Nothing here yet.'}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((it) => (
            <ContentCard
              key={`${it.type}-${it.id}`}
              to={it.href}
              title={it.title}
              summary={it.summary}
              cover={it.cover}
              badge={BADGE[it.type]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
