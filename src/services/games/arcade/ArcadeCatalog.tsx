// "Made with AI": the community's Curios Arcade games — cartridge cards in each game's own
// colors (generated games have no cover), sorted by 👍 and plays (Top) or by date (New).
// ArcadeShelf is the compact row used on Home.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Play, ThumbsUp } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import TopBar from '../../../components/results/TopBar.tsx';
import { safePalette } from './arcadeRuntime.ts';
import { lookOf } from './arcadeStyles.ts';
import { PIXEL_FONT, usePixelFont } from './ArcadeScreen.tsx';
import { fetchArcadeCatalog, type ArcadeCard, type CatalogSort } from './arcadeService.ts';

const NEON_FONT = "'Orbitron', 'Pixelify Sans', ui-monospace, monospace";

export function ArcadeCartridge({ game, className = '' }: { game: ArcadeCard; className?: string }) {
  const { t } = useTranslation();
  const [p0, p1, p2, p3] = safePalette(game.palette);
  const neon = lookOf(game.style) === 'cyberpunk';
  return (
    <Link
      to={`/arcade/${game.id}`}
      className={`block rounded-xl overflow-hidden border-2 ${className}`}
      style={{ backgroundColor: p0, borderColor: neon ? p3 : p1, boxShadow: neon ? `0 0 12px ${p3}55` : undefined }}
    >
      {/* Label art: the game's four colors as pixel stripes */}
      <div className="h-16 relative" style={{ background: `linear-gradient(180deg, ${p1} 0 50%, ${p0} 50%)` }}>
        <span className="absolute left-3 bottom-3 w-4 h-6" style={{ backgroundColor: p3 }} />
        <span className="absolute right-4 bottom-3 w-6 h-6" style={{ backgroundColor: p2 }} />
        <span className="absolute left-0 right-0 bottom-0 h-2" style={{ backgroundColor: p2, opacity: 0.6 }} />
        <span className="absolute right-2 top-2 text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: p0, color: p3, fontFamily: PIXEL_FONT }}>
          {game.mode === '3d' ? '3D' : '2D'}
        </span>
      </div>
      <div className="p-3" style={{ color: p3, fontFamily: neon ? NEON_FONT : PIXEL_FONT }}>
        <p className="text-sm font-semibold leading-tight line-clamp-2 uppercase">{game.title}</p>
        <p className="text-[11px] mt-1 truncate" style={{ opacity: 0.7 }}>
          {t('arcadeInspiredBy').replace('{name}', game.inspiredBy)}
        </p>
        <p className="text-[11px] mt-2 flex items-center gap-3" style={{ opacity: 0.8 }}>
          {/* Numbers in the pixel font: Orbitron's slashed zero reads like a "forbidden" sign */}
          <span className="inline-flex items-center gap-1" style={{ fontFamily: PIXEL_FONT }}><ThumbsUp size={12} /> {game.votesUp}</span>
          <span className="inline-flex items-center gap-1" style={{ fontFamily: PIXEL_FONT }}><Play size={12} /> {game.plays}</span>
        </p>
      </div>
    </Link>
  );
}

/** Home row: the top games, with "See all" → /arcade. Renders nothing until there are games. */
export function ArcadeShelf() {
  usePixelFont();
  const { t } = useTranslation();
  const [games, setGames] = useState<ArcadeCard[]>([]);
  useEffect(() => { void fetchArcadeCatalog('top', 8).then(setGames); }, []);
  if (!games.length) return null;
  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-8 mt-16">
      <div className="flex items-center justify-between mb-5">
        <h2 className="label-mono" style={{ color: 'var(--accent-primary)' }}>{t('arcadeCatalogTitle')}</h2>
        <Link to="/arcade" className="inline-flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: 'var(--accent-primary)' }}>
          {t('homeSeeAll')} <ArrowRight size={14} />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {games.map((g) => <ArcadeCartridge key={g.id} game={g} className="w-40 flex-shrink-0" />)}
      </div>
    </div>
  );
}

export default function ArcadeCatalog() {
  usePixelFont();
  const { t } = useTranslation();
  const [sort, setSort] = useState<CatalogSort>('top');
  const [games, setGames] = useState<ArcadeCard[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setGames(null);
    void fetchArcadeCatalog(sort).then((g) => { if (!cancelled) setGames(g); });
    return () => { cancelled = true; };
  }, [sort]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--ui-bg-primary)', color: 'var(--ui-text-primary)' }}>
      <TopBar query={t('arcadeCatalogTitle')} timeAgo="" />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('arcadeCatalogSubtitle')}</p>
        <div className="flex gap-4 border-b mb-5" style={{ borderColor: 'var(--ui-border-subtle)' }}>
          {(['top', 'new'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSort(s)}
              className="pb-2 text-sm font-medium border-b-2 -mb-px"
              style={sort === s
                ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }
                : { borderColor: 'transparent', color: 'var(--ui-text-muted)' }}
            >
              {s === 'top' ? t('arcadeSortTop') : t('arcadeSortNew')}
            </button>
          ))}
        </div>
        {!games ? (
          <Loader2 size={18} className="animate-spin text-gray-500 dark:text-gray-400" />
        ) : games.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('arcadeCatalogEmpty')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {games.map((g) => <ArcadeCartridge key={g.id} game={g} />)}
          </div>
        )}
      </div>
    </div>
  );
}
