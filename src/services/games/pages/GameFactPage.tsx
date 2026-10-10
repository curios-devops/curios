// Games 🎮 fact sheet — same layout as the Movie 🍿 page (components/factSheet):
// title + ESRB/year/genres, the trailer (RAWG's, else YouTube, else a screenshots
// carousel), cards (rating, platforms, store, developer), "Play in your
// browser" in place of the cast, "More to explore" with a platform filter, then the
// explanation with Listen. Queries that don't name a game get the games list instead.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Code2, Gamepad2, Image as ImageIcon, Link2, Loader2, Video, type LucideIcon } from 'lucide-react';
import TopBar from '../../../components/results/TopBar.tsx';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useLanguage } from '../../../contexts/LanguageContext.tsx';
import { useAnswerModel } from '../../../hooks/useAnswerModel.ts';
import { executeWebSearch, type WebSearchResult } from '../../search/providers/webSearchProvider.ts';
import { buildSourcesText, streamLLMText } from '../../search/providers/llmProvider.ts';
import { searchVideos } from '../../search/providers/mediaSearchProvider.ts';
import { findMovieTrailer, youTubeId, type MovieTrailer } from '../../movie/trailer.ts';
import { AboutSection, FactCard as Card, FactTabs, LinksCard, MenuSelect, SourcesList, VideosGrid, domain, favicon, type VideoItem } from '../../../components/factSheet/FactSheet.tsx';
import { ImagesCarousel, ImagesGrid } from '../../../components/results/ImageGallery.tsx';
import {
  fetchGameInfo, fetchGameList, fetchPlayableGames, fetchSimilarGames,
  type Game, type GameInfo, type GameList, type GamePlatform, type PlayableGame,
} from '../gamesSearch.ts';
import GamesResults from './GamesResults.tsx';
import { useProCredits } from '../../../providers/ProCreditsProvider.tsx';
import { generateArcadeGame, repairArcadeGame, type ArcadeGame } from '../arcade/arcadeService.ts';
import ArcadeScreen from '../arcade/ArcadeScreen.tsx';

type Tab = 'game' | 'videos' | 'images' | 'sources';

// RAWG parent platform names, for filtering the similar games client-side.
const PLATFORM_NAME: Record<Exclude<GamePlatform, 'all'>, string> = { pc: 'PC', playstation: 'PlayStation', xbox: 'Xbox' };

// Dead cover URLs (itch.io removes images) → keep the box, hide the broken-image icon.
const hideBroken = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.visibility = 'hidden'; };

export default function GameFactPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const query = useMemo(() => new URLSearchParams(location.search).get('q') || '', [location.search]);
  const { getModel } = useAnswerModel(query);
  const { requestProAccess, tier } = useProCredits();

  // "Create your own game inspired by X": one Pro credit → a mini arcade game (Curios Arcade).
  const [arcade, setArcade] = useState<{ game: ArcadeGame | null; status: 'creating' | 'ready' | 'error' } | null>(null);
  const repairedRef = useRef(false);

  const [tab, setTab] = useState<Tab>('game');
  const [info, setInfo] = useState<GameInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [trailer, setTrailer] = useState<MovieTrailer | null>(null);
  const [searchingTrailer, setSearchingTrailer] = useState(false);
  const [playable, setPlayable] = useState<PlayableGame[]>([]);
  const [similar, setSimilar] = useState<Game[] | null>(null);
  const [sources, setSources] = useState<WebSearchResult[]>([]);
  const [searchedVideos, setSearchedVideos] = useState<VideoItem[]>([]);
  const [explanation, setExplanation] = useState('');
  const [explanationDone, setExplanationDone] = useState(false);

  // "More to explore": similar games by default, RAWG lists on demand (cached per list + platform).
  const [exploreList, setExploreList] = useState<GameList>('similar');
  const [platform, setPlatform] = useState<GamePlatform>('all');
  const [listCache, setListCache] = useState<Record<string, Game[]>>({});
  const listKey = `${exploreList}:${platform}`;
  const exploreItems = exploreList === 'similar'
    ? similar?.filter((g) => platform === 'all' || g.platforms.includes(PLATFORM_NAME[platform]))
    : listCache[listKey];
  useEffect(() => {
    if (exploreList === 'similar' || listCache[listKey]) return;
    void fetchGameList(exploreList, platform, info?.genreId ?? null)
      .then((items) => setListCache((c) => ({ ...c, [listKey]: items })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey]);
  const EXPLORE_OPTIONS: { id: GameList; label: string }[] = [
    { id: 'similar', label: t('movieMoreToExplore') },
    { id: 'popular', label: t('explorePopular') },
    { id: 'new_releases', label: t('exploreNewReleases') },
    { id: 'top_rated', label: t('exploreTopRated') },
  ];
  const PLATFORM_OPTIONS: { id: GamePlatform; label: string }[] = [
    { id: 'all', label: t('platformAll') },
    { id: 'pc', label: 'PC' },
    { id: 'playstation', label: 'PlayStation' },
    { id: 'xbox', label: 'Xbox' },
  ];

  // 1) Fact sheet (fast) with similar + playable alongside; 2) trailer search only if RAWG
  // has none; 3) sources → explanation.
  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    fetchSimilarGames(query).then((g) => { if (!cancelled) setSimilar(g); });
    fetchPlayableGames(query).then((g) => { if (!cancelled) setPlayable(g); });
    void (async () => {
      const game = await fetchGameInfo(query);
      if (cancelled) return;
      setInfo(game);
      setLoadingInfo(false);
      if (!game) return; // the games list takes over

      const subject = `${game.name} video game`;
      if (!game.trailer) {
        setSearchingTrailer(true);
        findMovieTrailer(subject)
          .then((tr) => { if (!cancelled) setTrailer(tr); })
          .catch(() => {})
          .finally(() => { if (!cancelled) setSearchingTrailer(false); });
      }

      // Videos tab: related videos from the normal video search (SerpAPI → Brave).
      searchVideos(subject)
        .then((vs) => {
          if (cancelled) return;
          setSearchedVideos(vs.map((v) => ({ url: v.url, title: v.title, thumbnail: v.thumbnail, source: v.source || domain(v.url) })));
        })
        .catch(() => {});

      const found = (await executeWebSearch(subject).catch(() => [])).slice(0, 6);
      if (cancelled) return;
      setSources(found);

      const model = await getModel();
      const prompt = `Explain the video game the user asked about: "${query}".
Game: ${game.name} (${game.year}). Developer: ${game.developers.map((d) => d.name).join(', ') || 'unknown'}. Genres: ${game.genres.join(', ')}. Platforms: ${game.platforms.join(', ')}.
Description: ${game.description.slice(0, 2500)}

Search Results:
${buildSourcesText(found)}

Write in language "${currentLanguage.code}", 140–180 words in 2–3 short paragraphs: (1) what the game is and how it plays, in plain words, (2) what makes it worth playing (world, mechanics, style), (3) optionally how it was received or its legacy. Engaging and clear, no filler. Ground every claim in the description and sources. No story spoilers. No title heading, no URLs.`;
      await streamLLMText(prompt, 900, (chunk) => { if (!cancelled) setExplanation((prev) => prev + chunk); }, 60000, model.model);
      if (!cancelled) setExplanationDone(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, currentLanguage.code]);

  // RAWG's trailers first, then searched videos; one entry per URL / YouTube video.
  const allVideos = useMemo<VideoItem[]>(() => {
    const official: VideoItem[] = (info?.videos ?? []).map((v) => ({ url: v.url, title: v.name, thumbnail: v.preview ?? '', source: 'rawg.io' }));
    const seen = new Set<string>();
    return [...official, ...searchedVideos].filter((v) => {
      const k = youTubeId(v.url) ?? v.url;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [info, searchedVideos]);

  const images = (info?.screenshots ?? []).map((url) => ({ url, title: info?.name ?? '', source: 'rawg.io' }));

  const createArcade = async () => {
    if (!info) return;
    const outMessage = tier === 'guest' ? t('creditsOutArcadeGuest') : tier === 'free' ? t('creditsOutArcadeFree') : undefined;
    if (!(await requestProAccess(outMessage))) return;
    repairedRef.current = false;
    setArcade({ game: null, status: 'creating' });
    try {
      const game = await generateArcadeGame({
        inspiredBy: info.name,
        genres: info.genres,
        description: info.description,
        screenshot: info.screenshots[0] ?? info.imageUrl,
        language: currentLanguage.code,
      });
      setArcade((a) => (a ? { game, status: 'ready' } : a));
    } catch {
      setArcade((a) => (a ? { game: null, status: 'error' } : a));
    }
  };

  // The console's smoke test threw → one free fix of the same game, then give up.
  const onArcadeError = useCallback((message: string) => {
    const game = arcade?.game;
    if (!game || !info) return;
    if (repairedRef.current) { setArcade({ game: null, status: 'error' }); return; }
    repairedRef.current = true;
    setArcade({ game, status: 'creating' });
    repairArcadeGame(game.id, message, info.genres, currentLanguage.code)
      .then((fixed) => setArcade((a) => (a ? { game: fixed, status: 'ready' } : a)))
      .catch(() => setArcade((a) => (a ? { game: null, status: 'error' } : a)));
  }, [arcade?.game, info, currentLanguage.code]);

  // Not a specific game ("retro racing games") → the games list.
  if (!loadingInfo && !info) return <GamesResults />;

  const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: 'game', label: t('gameTab'), icon: Gamepad2 },
    ...(allVideos.length > 0 ? [{ id: 'videos' as const, label: t('movieVideos'), icon: Video }] : []),
    ...(images.length > 0 ? [{ id: 'images' as const, label: t('movieImages'), icon: ImageIcon }] : []),
    { id: 'sources', label: t('movieSources'), icon: Link2 },
  ];

  const ratings = [
    ...(info?.rating ? [{ source: 'RAWG', value: `${(info.rating * 2).toFixed(1)}/10`, site: 'rawg.io' }] : []),
    ...(info?.metacritic ? [{ source: 'Metacritic', value: String(info.metacritic), site: 'metacritic.com' }] : []),
  ];
  const cardStyle = { backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-subtle)' };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--ui-bg-primary)', color: 'var(--ui-text-primary)' }}>
      <TopBar query={query} timeAgo="" />
      <FactTabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'game' && (
          <>
            {/* Title + meta line: boxed age rating, details in gray */}
            <div className="mb-3">
              <h1 className="text-lg font-semibold">{info?.name ?? query}</h1>
              {info && (
                <p className="text-sm mt-1 flex items-center flex-wrap gap-x-1.5 text-gray-500 dark:text-gray-400">
                  {info.esrb && (
                    <span title={info.esrb.name} className="text-[10px] leading-none px-1 py-0.5 border rounded-sm border-gray-400 dark:border-gray-500">
                      {info.esrb.short}
                    </span>
                  )}
                  <span>
                    {info.esrb && '· '}
                    {[info.year, info.genres.join(', ')].filter(Boolean).join(' · ')}
                  </span>
                </p>
              )}
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
              {/* Trailer (RAWG, else YouTube); without one, the screenshots carousel */}
              <div className="flex-1 min-w-0">
                {info?.trailer ? (
                  <div className="rounded-xl overflow-hidden bg-black aspect-video">
                    <video
                      src={info.trailer.url}
                      poster={info.trailer.preview ?? undefined}
                      className="w-full h-full"
                      autoPlay
                      muted
                      playsInline
                      controls
                    />
                  </div>
                ) : trailer?.embedUrl ? (
                  <div className="rounded-xl overflow-hidden bg-black aspect-video">
                    <iframe
                      src={trailer.embedUrl}
                      title={t('movieTrailer')}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      // YouTube rejects embeds without a Referer (Error 153), e.g. in webviews.
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                ) : loadingInfo || searchingTrailer ? (
                  <div className="rounded-xl bg-black aspect-video flex items-center justify-center">
                    <Loader2 size={28} className="animate-spin text-white/70" />
                  </div>
                ) : images.length > 0 ? (
                  <ImagesCarousel images={images} />
                ) : info?.imageUrl ? (
                  <img src={info.imageUrl} alt={info.name} className="w-full rounded-xl aspect-video object-cover" />
                ) : null}
              </div>

              {/* Side cards (below on mobile): one or two lines each */}
              {info && (
                <div className="lg:w-80 flex flex-col gap-2">
                  {ratings.length > 0 && (
                    <Card
                      label={t('movieRating')}
                      right={ratings.map((r) => (
                        <span key={r.source} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                          {r.value}
                          <img src={favicon(r.site)} alt={r.source} title={r.source} className="w-5 h-5 rounded-full" />
                        </span>
                      ))}
                    />
                  )}

                  {info.platforms.length > 0 && <Card label={t('gamePlatforms')} value={info.platforms.join(', ')} />}

                  <LinksCard
                    label={t('gameStore')}
                    items={info.stores.map((s) => ({ name: s.name, logoUrl: favicon(s.domain), url: s.url }))}
                  />

                  {info.developers.length > 0 && (
                    <Card
                      label={t('gameDeveloper')}
                      value={info.developers.map((d) => d.name).join(', ')}
                      right={<Code2 size={18} className="text-gray-500 dark:text-gray-400" />}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Play in your browser (in place of the Movie page's cast) */}
            {playable.length > 0 && (
              <section className="mt-8">
                <h2 className="text-base font-semibold mb-3">{t('gamesPlayable')}</h2>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {playable.map((g) => (
                    <a
                      key={g.url}
                      href={g.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-40 flex-shrink-0 rounded-xl overflow-hidden border"
                      style={cardStyle}
                    >
                      {g.imageUrl
                        ? <img src={g.imageUrl} alt={g.title} className="w-full aspect-video object-cover" loading="lazy" onError={hideBroken} />
                        : <div className="w-full aspect-video" style={{ backgroundColor: 'var(--ui-bg-secondary)' }} />}
                      <div className="p-2">
                        <p className="text-sm font-medium leading-tight line-clamp-2">{g.title}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">{g.site}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Create your own mini arcade game inspired by this one (1 Pro credit) */}
            {info && (
              <button
                type="button"
                onClick={() => void createArcade()}
                className="mt-4 w-full rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
              >
                <Gamepad2 size={18} />
                {t('arcadeCreate').replace('{name}', info.name)}
              </button>
            )}

            {/* More to explore: lists dropdown + platform filter; each card opens its own fact sheet */}
            {info && (
              <section className="mt-8">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <MenuSelect options={EXPLORE_OPTIONS} value={exploreList} onChange={setExploreList} />
                  <MenuSelect options={PLATFORM_OPTIONS} value={platform} onChange={setPlatform} variant="small" />
                </div>
                {!exploreItems ? (
                  <Loader2 size={18} className="animate-spin text-gray-500 dark:text-gray-400" />
                ) : (
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                    {exploreItems.map((g) => (
                      <button
                        key={g.slug}
                        type="button"
                        onClick={() => navigate(`/games-results?q=${encodeURIComponent(g.name)}`)}
                        className="w-48 flex-shrink-0 text-left rounded-xl overflow-hidden border"
                        style={cardStyle}
                      >
                        {g.imageUrl && <img src={g.imageUrl} alt={g.name} className="w-full aspect-video object-cover" loading="lazy" onError={hideBroken} />}
                        <div className="p-2">
                          <p className="text-sm font-medium leading-tight line-clamp-2">{g.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                            {[g.year, g.platforms.join(', ')].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            <AboutSection
              title={info ? t('movieAboutTitle').replace('{title}', info.name) : t('movieAbout')}
              text={explanation}
              done={explanationDone}
            />
          </>
        )}

        {tab === 'videos' && <VideosGrid videos={allVideos} />}

        {tab === 'images' && <ImagesGrid images={images} />}

        {tab === 'sources' && (
          <SourcesList
            sources={[
              ...sources,
              ...(info ? [{ title: `${info.name} — RAWG`, url: info.rawgUrl, snippet: '' }] : []),
              ...(info?.website ? [{ title: info.name, url: info.website, snippet: '' }] : []),
            ]}
          />
        )}
      </div>

      {arcade && (
        <ArcadeScreen game={arcade.game} status={arcade.status} onClose={() => setArcade(null)} onError={onArcadeError} />
      )}
    </div>
  );
}
