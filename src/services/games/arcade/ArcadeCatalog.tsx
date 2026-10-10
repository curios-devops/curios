// "Made with AI" (/arcade, in the sidebar after Discover): the community's Curios Arcade games,
// on the Discover page template. Sort (relevance / popular / new / top rated) and filter by
// genre, 2D/3D and style; each card shows the inspiration, the creator (tap → their games),
// the date and the votes. Generated games have no cover, so the card art is drawn with each
// game's own palette.
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Play, ThumbsUp, X } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useLanguage } from '../../../contexts/LanguageContext.tsx';
import { MenuSelect } from '../../../components/factSheet/FactSheet.tsx';
import { safePalette } from './arcadeRuntime.ts';
import { CATEGORIES, lookOf } from './arcadeStyles.ts';
import { fetchArcadeCatalog, sortCatalog, type ArcadeCard, type CatalogSort } from './arcadeService.ts';

const ALL = 'all';
// Old rows stored 'retro' / 'cyberpunk' before the categories existed.
const categoryOf = (style: string) => (style === 'retro' ? 'retro_arcade' : style);

// Card art in the game's palette: ground, hero, enemy; neon looks get glowing outlines.
function GameArt({ game }: { game: ArcadeCard }) {
  const [bg, ground, enemy, hero] = safePalette(game.palette);
  const neon = lookOf(game.style) === 'cyberpunk';
  const shape = (color: string) => (neon ? { fill: 'none', stroke: color, strokeWidth: 1.2 } : { fill: color });
  return (
    <svg viewBox="0 0 64 36" className="w-full h-full" preserveAspectRatio="xMidYMid slice" shapeRendering={neon ? undefined : 'crispEdges'}>
      <rect width="64" height="36" fill={bg} />
      {neon
        ? <path d="M0 29 H64 M0 33 H64 M8 29 L2 36 M24 29 L21 36 M40 29 L43 36 M56 29 L62 36" stroke={ground} strokeWidth="1" />
        : [0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} x={i * 8} y="29" width="7" height="7" fill={ground} />)}
      <rect x="12" y="17" width="5" height="11" {...shape(hero)} />
      <rect x="40" y="19" width="9" height="9" {...shape(enemy)} />
      <rect x="42" y="22" width="2" height="2" fill={neon ? enemy : bg} /><rect x="45" y="22" width="2" height="2" fill={neon ? enemy : bg} />
    </svg>
  );
}

export default function ArcadeCatalog() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const author = params.get('author');
  const [games, setGames] = useState<ArcadeCard[] | null>(null);
  const [sort, setSort] = useState<CatalogSort>('relevance');
  const [genre, setGenre] = useState(ALL);
  const [mode, setMode] = useState(ALL);
  const [style, setStyle] = useState(ALL);

  useEffect(() => { void fetchArcadeCatalog().then(setGames); }, []);

  const styleName = (id: string) => t(`arcadeCat_${categoryOf(id)}` as never);
  const authorKey = (g: ArcadeCard) => g.creatorId ?? g.creatorName ?? '';
  const authorName = (g: ArcadeCard) => g.creatorName ?? t('arcadeAnonymous');

  // Filter options come from the games that exist.
  const genres = useMemo(() => [...new Set((games ?? []).flatMap((g) => g.genres))].sort(), [games]);
  const styles = useMemo(() => CATEGORIES.map((c) => c.id).filter((id) => (games ?? []).some((g) => categoryOf(g.style) === id)), [games]);

  const shown = useMemo(() => sortCatalog((games ?? []).filter((g) =>
    (!author || authorKey(g) === author)
    && (genre === ALL || g.genres.includes(genre))
    && (mode === ALL || g.mode === mode)
    && (style === ALL || categoryOf(g.style) === style)), sort), [games, author, genre, mode, style, sort]);
  const authorLabel = author ? (games ?? []).find((g) => authorKey(g) === author) : undefined;

  const filterByAuthor = (e: MouseEvent, g: ArcadeCard) => {
    e.stopPropagation();
    if (authorKey(g)) setParams({ author: authorKey(g) });
  };
  const date = (iso: string) => new Date(iso).toLocaleDateString(currentLanguage.code, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">{t('arcadeCatalogTitle')}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('arcadeCatalogSubtitle')}</p>

      {/* Sort + filters */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6 text-sm">
        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          {t('arcadeSortBy')}
          <MenuSelect
            variant="small"
            value={sort}
            onChange={setSort}
            options={[
              { id: 'relevance', label: t('arcadeSortRelevance') },
              { id: 'popular', label: t('explorePopular') },
              { id: 'new', label: t('arcadeSortNew') },
              { id: 'top_rated', label: t('exploreTopRated') },
            ]}
          />
        </span>
        {genres.length > 0 && (
          <MenuSelect variant="small" value={genre} onChange={setGenre}
            options={[{ id: ALL, label: t('arcadeFilterGenre') }, ...genres.map((g) => ({ id: g, label: g }))]} />
        )}
        <MenuSelect variant="small" value={mode} onChange={setMode}
          options={[{ id: ALL, label: t('arcadeFilterType') }, { id: '2d', label: '2D' }, { id: '3d', label: '3D' }]} />
        {styles.length > 0 && (
          <MenuSelect variant="small" value={style} onChange={setStyle}
            options={[{ id: ALL, label: t('arcadeFilterStyle') }, ...styles.map((id) => ({ id, label: styleName(id) }))]} />
        )}
        {author && (
          <button
            type="button"
            onClick={() => setParams({})}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs"
            style={{ backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--ui-text-primary)' }}
          >
            {t('arcadeByAuthor').replace('{name}', authorLabel ? authorName(authorLabel) : '')} <X size={12} />
          </button>
        )}
      </div>

      {!games ? (
        <div className="py-20 flex justify-center">
          <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : shown.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">{t('arcadeCatalogEmpty')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((g) => (
            <div
              key={g.id}
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/arcade/${g.id}`)}
              onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/arcade/${g.id}`); }}
              className="group cursor-pointer flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md transition-all overflow-hidden bg-white dark:bg-[#0a0a0a]"
            >
              <div className="relative aspect-video overflow-hidden">
                <GameArt game={g} />
                <span className="absolute right-2 top-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/60 text-white">{g.mode === '3d' ? '3D' : '2D'}</span>
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="w-11 h-11 rounded-full flex items-center justify-center bg-black/55"><Play size={20} className="text-white ml-0.5" /></span>
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
                  {styleName(g.style)}
                </span>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-[var(--accent-primary)] transition-colors">
                  {g.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t('arcadeInspiredBy').replace('{name}', g.inspiredBy)}</p>
                <div className="mt-auto pt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <button
                    type="button"
                    onClick={(e) => filterByAuthor(e, g)}
                    disabled={!authorKey(g)}
                    className="font-medium truncate max-w-[45%] hover:underline disabled:no-underline"
                    style={{ color: 'var(--ui-text-primary)' }}
                  >
                    {authorName(g)}
                  </button>
                  <span>·</span>
                  <span className="truncate">{date(g.createdAt)}</span>
                  <span className="ml-auto inline-flex items-center gap-1"><ThumbsUp size={12} /> {g.votesUp}</span>
                  <span className="inline-flex items-center gap-1"><Play size={12} /> {g.plays}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
