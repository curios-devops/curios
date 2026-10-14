// "Made with AI" (/arcade, in the sidebar after Discover): what the community made with Curios —
// movies, songs, arcade games and shared stories — in tabs (All · Movies · Music · Games ·
// Stories), on the Discover page template. Sort (relevance / popular / new / top rated) and filter
// by genre (2D/3D and style on Games); each card shows the inspiration, the creator (tap → their
// work), the date and the votes. Games without a painted cover get art drawn in their palette.
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Film, Music, Play, ThumbsUp, X, type LucideIcon } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useLanguage } from '../../../contexts/LanguageContext.tsx';
import { MenuSelect } from '../../../components/factSheet/FactSheet.tsx';
import { paletteRoles } from './arcadeRuntime.ts';
import { CATEGORIES, lookOf } from './arcadeStyles.ts';
import { fetchArcadeCatalog, sortCatalog, type ArcadeCard, type CatalogSort } from './arcadeService.ts';
import { fetchSongCatalog } from '../../music/song/songService.ts';
import { FALLBACK_PALETTE } from '../../music/song/songRuntime.ts';
import { fetchMovieCatalog, fetchStoryCatalog } from './creationsCatalog.ts';

const ALL = 'all';
const TABS = ['all', 'movies', 'music', 'games', 'stories'] as const;
type Tab = typeof TABS[number];
const inTab = (g: ArcadeCard, tab: Tab) => tab === 'all'
  || (tab === 'movies' && g.kind === 'movie') || (tab === 'music' && g.kind === 'song')
  || (tab === 'games' && !g.kind) || (tab === 'stories' && g.kind === 'story');
// Old rows stored 'retro' / 'cyberpunk' before the categories existed.
const categoryOf = (style: string) => (style === 'retro' ? 'retro_arcade' : style);

// Card art: the painted background when the game has one, else a scene in the game's palette
// (ground, hero, enemy; neon looks get glowing outlines).
function GameArt({ game }: { game: ArcadeCard }) {
  const [broken, setBroken] = useState(false);
  // Movies and stories: their cover (core frame / story image), else their icon.
  if (game.kind === 'movie' || game.kind === 'story') {
    const Icon: LucideIcon = game.kind === 'movie' ? Film : BookOpen;
    return game.bg && !broken
      ? <img src={game.bg} alt="" loading="lazy" onError={() => setBroken(true)} className="w-full h-full object-cover" />
      : <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900"><Icon size={32} className="text-gray-400" /></div>;
  }
  // Songs: sound bars in the song's palette.
  if (game.kind === 'song') {
    const P = game.palette.length === 5 ? game.palette : FALLBACK_PALETTE;
    return (
      <svg viewBox="0 0 64 36" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <rect width="64" height="36" fill={P[0]} />
        {Array.from({ length: 16 }, (_, i) => {
          const h = 6 + 22 * Math.abs(Math.sin(i * 1.7 + game.title.length));
          return <rect key={i} x={4 + i * 3.6} y={(36 - h) / 2} width="2.2" height={h} rx="1.1" fill={P[1 + (i % 4)]} />;
        })}
      </svg>
    );
  }
  if (game.bg) return <img src={game.bg} alt="" loading="lazy" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />;
  const r = paletteRoles(game.palette);
  const [bg, ground, enemy, hero] = [r.bg, r.line, r.accent2, r.accent];
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
  const tab: Tab = TABS.find((x) => x === params.get('tab')) ?? 'all';
  const setTab = (next: Tab) => setParams((p) => { const n = new URLSearchParams(p); if (next === 'all') n.delete('tab'); else n.set('tab', next); return n; });

  // Everything in one list (each card knows what it opens).
  useEffect(() => {
    void Promise.all([fetchArcadeCatalog(), fetchSongCatalog(), fetchMovieCatalog(), fetchStoryCatalog()]).then(([g, s, movies, stories]) => setGames([
      ...g, ...movies, ...stories,
      ...s.map((r): ArcadeCard => ({
        id: r.id, title: r.title, inspiredBy: r.inspired_by ?? '', palette: r.palette ?? [], style: 'song', mode: '2d',
        genres: r.genres ?? [], votesUp: r.votes_up ?? 0, plays: r.plays ?? 0, creatorId: r.creator_id, creatorName: r.creator_name,
        createdAt: r.created_at, bg: null, kind: 'song',
      })),
    ]));
  }, []);
  const open = (g: ArcadeCard) => navigate(
    g.kind === 'song' ? `/song/${g.id}` : g.kind === 'movie' ? `/movie/share/${g.id}` : g.kind === 'story' ? `/s/${g.id}` : `/arcade/${g.id}`,
  );

  const KIND_LABEL = { song: 'songCardStyle', movie: 'madeKindMovie', story: 'madeKindStory' } as const;
  const styleName = (g: ArcadeCard | string) => (typeof g !== 'string' && g.kind ? t(KIND_LABEL[g.kind]) : t(`arcadeCat_${categoryOf(typeof g === 'string' ? g : g.style)}` as never));
  const authorKey = (g: ArcadeCard) => g.creatorId ?? g.creatorName ?? '';
  const authorName = (g: ArcadeCard) => g.creatorName ?? t('arcadeAnonymous');

  // Filter options come from the games that exist.
  const genres = useMemo(() => [...new Set((games ?? []).filter((g) => inTab(g, tab)).flatMap((g) => g.genres))].sort(), [games, tab]);
  const styles = useMemo(() => CATEGORIES.map((c) => c.id).filter((id) => (games ?? []).some((g) => !g.kind && categoryOf(g.style) === id)), [games]);

  // 2D/3D and style only exist on the Games tab.
  const shown = useMemo(() => sortCatalog((games ?? []).filter((g) =>
    inTab(g, tab)
    && (!author || authorKey(g) === author)
    && (genre === ALL || g.genres.includes(genre))
    && (tab !== 'games' || mode === ALL || g.mode === mode)
    && (tab !== 'games' || style === ALL || categoryOf(g.style) === style)), sort), [games, tab, author, genre, mode, style, sort]);
  const authorLabel = author ? (games ?? []).find((g) => authorKey(g) === author) : undefined;

  const filterByAuthor = (e: MouseEvent, g: ArcadeCard) => {
    e.stopPropagation();
    if (authorKey(g)) setParams((p) => { const n = new URLSearchParams(p); n.set('author', authorKey(g)); return n; });
  };
  const date = (iso: string) => new Date(iso).toLocaleDateString(currentLanguage.code, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">{t('arcadeCatalogTitle')}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('arcadeCatalogSubtitle')}</p>

      <div role="tablist" className="flex gap-5 mb-4 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`py-3 px-1 border-b-2 -mb-px font-medium text-sm whitespace-nowrap transition-colors ${tab === id ? '' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
            style={tab === id ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' } : undefined}
          >
            {t(`madeTab_${id}` as never)}
          </button>
        ))}
      </div>

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
        {tab === 'games' && (
          <MenuSelect variant="small" value={mode} onChange={setMode}
            options={[{ id: ALL, label: t('arcadeFilterType') }, { id: '2d', label: '2D' }, { id: '3d', label: '3D' }]} />
        )}
        {tab === 'games' && styles.length > 0 && (
          <MenuSelect variant="small" value={style} onChange={setStyle}
            options={[{ id: ALL, label: t('arcadeFilterStyle') }, ...styles.map((id) => ({ id, label: styleName(id) }))]} />
        )}
        {author && (
          <button
            type="button"
            onClick={() => setParams((p) => { const n = new URLSearchParams(p); n.delete('author'); return n; })}
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
        <p className="text-gray-500 dark:text-gray-400">{t(tab === 'games' ? 'arcadeCatalogEmpty' : 'madeEmpty')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map((g) => (
            <div
              key={g.id}
              role="link"
              tabIndex={0}
              onClick={() => open(g)}
              onKeyDown={(e) => { if (e.key === 'Enter') open(g); }}
              className="group cursor-pointer flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md transition-all overflow-hidden bg-white dark:bg-night-950"
            >
              <div className="relative aspect-video overflow-hidden">
                <GameArt game={g} />
                <span className="absolute right-2 top-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/60 text-white">{g.kind === 'song' ? <Music size={10} className="my-0.5" /> : g.kind === 'movie' ? <Film size={10} className="my-0.5" /> : g.kind === 'story' ? <BookOpen size={10} className="my-0.5" /> : g.mode === '3d' ? '3D' : '2D'}</span>
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="w-11 h-11 rounded-full flex items-center justify-center bg-black/55"><Play size={20} className="text-white ml-0.5" /></span>
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
                  {styleName(g)}
                </span>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-[var(--accent-primary)] transition-colors">
                  {g.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {g.kind === 'movie' || g.kind === 'story' ? g.inspiredBy : t(g.kind === 'song' ? 'songInspiredBy' : 'arcadeInspiredBy').replace('{name}', g.inspiredBy)}
                </p>
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
