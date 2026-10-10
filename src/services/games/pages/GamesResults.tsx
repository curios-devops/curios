// Games 🎮 page: games similar to the query — browser games to play right now
// (itch.io / WASM-4 / Newgrounds), then similar commercial games (RAWG).
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import TopBar from '../../../components/results/TopBar.tsx';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { searchGames, type GamesResult } from '../gamesSearch.ts';

export default function GamesResults() {
  const { search } = useLocation();
  const query = new URLSearchParams(search).get('q') ?? '';
  const { t } = useTranslation();
  const [result, setResult] = useState<GamesResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    if (query) void searchGames(query).then((r) => { if (!cancelled) setResult(r); });
    return () => { cancelled = true; };
  }, [query]);

  const empty = result && !result.playable.length && !result.similar.length;
  const cardStyle = { backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-subtle)' };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--ui-bg-primary)', color: 'var(--ui-text-primary)' }}>
      <TopBar query={query} timeAgo="" />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {!result && <Loader2 size={18} className="animate-spin text-gray-500 dark:text-gray-400" />}

        {empty && <p className="text-sm text-gray-500 dark:text-gray-400">{t('gamesEmpty')}</p>}

        {!!result?.playable.length && (
          <section className="mb-8">
            <h2 className="text-base font-semibold mb-3">{t('gamesPlayable')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {result.playable.map((g) => (
                <a
                  key={g.url}
                  href={g.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl overflow-hidden border flex flex-col"
                  style={cardStyle}
                >
                  {g.imageUrl
                    ? <img src={g.imageUrl} alt={g.title} className="w-full aspect-video object-cover" loading="lazy" />
                    : <div className="w-full aspect-video" style={{ backgroundColor: 'var(--ui-bg-secondary)' }} />}
                  <div className="p-2">
                    <p className="text-sm font-medium leading-tight line-clamp-2">{g.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{g.site}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {!!result?.similar.length && (
          <section>
            <h2 className="text-base font-semibold mb-3">
              {result.anchor ? t('gamesSimilarTo').replace('{name}', result.anchor.name) : t('gamesSimilar')}
            </h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {result.similar.map((g) => (
                <a
                  key={g.slug}
                  href={g.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-48 flex-shrink-0 rounded-xl overflow-hidden border"
                  style={cardStyle}
                >
                  {g.imageUrl && <img src={g.imageUrl} alt={g.name} className="w-full aspect-video object-cover" loading="lazy" />}
                  <div className="p-2">
                    <p className="text-sm font-medium leading-tight line-clamp-2 flex items-center gap-1.5">
                      {g.name}
                      {g.metacritic && (
                        <span className="text-[10px] leading-none px-1 py-0.5 border rounded-sm border-gray-400 dark:border-gray-500 text-gray-500 dark:text-gray-400">
                          {g.metacritic}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                      {[g.year, g.platforms.join(', ')].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
