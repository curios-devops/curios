// Movie 🍿 page (Home routes here with movie=1): a film fact sheet instead of a
// generated video. Title + certification/year/genres/runtime, official trailer (or a
// searched trailer, else the cover), side cards (ratings, where to watch, director,
// awards), a cast carousel linking to new searches, then a short explanation written by
// ONE LLM call grounded on TMDB's synopsis + web sources. Layout pieces are shared with
// the Games page (components/factSheet).
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Award, Film, Image as ImageIcon, Link2, Loader2, Trophy, Video, type LucideIcon } from 'lucide-react';
import TopBar from '../../../components/results/TopBar.tsx';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useLanguage } from '../../../contexts/LanguageContext.tsx';
import { useAnswerModel } from '../../../hooks/useAnswerModel.ts';
import { executeWebSearch, type WebSearchResult } from '../../search/providers/webSearchProvider.ts';
import { buildSourcesText, streamLLMText } from '../../search/providers/llmProvider.ts';
import { fetchExploreList, fetchMovieInfo, formatRuntime, type ExploreItem, type ExploreList, type MovieInfo } from '../movieInfo.ts';
import { findMovieTrailer, youTubeId, type MovieTrailer } from '../trailer.ts';
import { searchVideos } from '../../search/providers/mediaSearchProvider.ts';
import { AboutSection, FactCard as Card, FactTabs, LinksCard, MenuSelect, SourcesList, VideosGrid, domain, favicon, type VideoItem } from '../../../components/factSheet/FactSheet.tsx';
import { ImagesGrid } from '../../../components/results/ImageGallery.tsx';

type Tab = 'movie' | 'videos' | 'images' | 'sources';

// Rating sources → the site whose icon we show next to the score.
const RATING_SITE: Record<string, string> = { IMDb: 'imdb.com', 'Rotten Tomatoes': 'rottentomatoes.com', Metacritic: 'metacritic.com', TMDB: 'themoviedb.org' };

export default function MovieFactPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const query = useMemo(() => new URLSearchParams(location.search).get('q') || '', [location.search]);
  const { getModel } = useAnswerModel(query);

  const [tab, setTab] = useState<Tab>('movie');
  const [info, setInfo] = useState<MovieInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [trailer, setTrailer] = useState<MovieTrailer | null>(null);
  const [sources, setSources] = useState<WebSearchResult[]>([]);
  const [explanation, setExplanation] = useState('');
  const [explanationDone, setExplanationDone] = useState(false);
  const [searchedVideos, setSearchedVideos] = useState<VideoItem[]>([]);
  // "More to explore" dropdown: TMDB lists fetched on demand and cached per list.
  const [exploreList, setExploreList] = useState<ExploreList>('related');
  const [exploreCache, setExploreCache] = useState<Partial<Record<ExploreList, ExploreItem[]>>>({});
  const exploreItems = exploreList === 'related' ? info?.related ?? [] : exploreCache[exploreList];
  const pickExplore = (list: ExploreList) => {
    setExploreList(list);
    if (list === 'related' || exploreCache[list]) return;
    void fetchExploreList(list, info?.genreId ?? null, currentLanguage.code)
      .then((items) => setExploreCache((c) => ({ ...c, [list]: items })));
  };
  const EXPLORE_OPTIONS: { id: ExploreList; label: string }[] = [
    { id: 'related', label: t('movieMoreToExplore') },
    { id: 'popular', label: t('explorePopular') },
    { id: 'now_playing', label: t('exploreInTheatres') },
    { id: 'upcoming', label: t('exploreComingSoon') },
    { id: 'free', label: t('exploreFree') },
    { id: 'top_rated', label: t('exploreTopRated') },
    { id: 'hidden_gems', label: t('exploreHiddenGems') },
  ];

  // 1) Fact sheet first; 2) trailer search only if TMDB has none; 3) sources → explanation.
  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    void (async () => {
      const movie = await fetchMovieInfo(query, currentLanguage.code);
      if (cancelled) return;
      setInfo(movie);
      setLoadingInfo(false);

      const subject = movie ? `${movie.title} ${movie.year}` : query;
      if (!movie?.trailerYoutubeId) {
        findMovieTrailer(subject).then((tr) => { if (!cancelled) setTrailer(tr); }).catch(() => {});
      }

      // Videos tab: related videos from the normal video search (SerpAPI → Brave).
      searchVideos(subject)
        .then((vs) => {
          if (cancelled) return;
          setSearchedVideos(vs.map((v) => ({ url: v.url, title: v.title, thumbnail: v.thumbnail, source: v.source || domain(v.url) })));
        })
        .catch(() => {});

      const found = (await executeWebSearch(`${subject} film`).catch(() => [])).slice(0, 6);
      if (cancelled) return;
      setSources(found);

      const model = await getModel();
      const prompt = `Explain the film the user asked about: "${query}".
${movie ? `Film: ${movie.title} (${movie.year}). Directed by ${movie.directors.join(', ') || 'unknown'}. Synopsis: ${movie.overview}` : ''}

Search Results:
${buildSourcesText(found)}

Write in language "${currentLanguage.code}", 140–180 words in 2–3 short paragraphs: (1) the premise in plain words, (2) its main themes and what makes it worth watching, (3) optionally how it was received or its legacy. Engaging and clear, no filler. Ground every claim in the synopsis and sources. Do not reveal the ending unless the user asked about it. No title heading, no URLs.`;
      await streamLLMText(prompt, 900, (chunk) => { if (!cancelled) setExplanation((prev) => prev + chunk); }, 60000, model.model);
      if (!cancelled) setExplanationDone(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, currentLanguage.code]);

  const youtubeId = info?.trailerYoutubeId;
  const embedUrl = youtubeId
    ? `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0`
    : trailer?.embedUrl ?? null;
  const coverUrl = info?.backdropUrl ?? info?.posterUrl ?? trailer?.coverUrl ?? null;
  const oscars = info?.awards?.oscars;
  // One awards card: the Oscars when the film has any (win or nomination), otherwise the other awards.
  const oscarText = !oscars ? ''
    : oscars.wins > 0 ? t('movieOscarWins').replace('{n}', String(oscars.wins))
    : oscars.nominations > 0 ? t('movieOscarNominations').replace('{n}', String(oscars.nominations))
    : '';
  const awardTotals = info?.awards && (info.awards.wins > 0 || info.awards.nominations > 0)
    ? t('movieAwardTotals').replace('{wins}', String(info.awards.wins)).replace('{nominations}', String(info.awards.nominations))
    : '';

  // TMDB's official videos first, then searched ones; one entry per YouTube video / URL.
  const allVideos = useMemo<VideoItem[]>(() => {
    const official: VideoItem[] = (info?.videos ?? []).map((v) => ({
      url: `https://www.youtube.com/watch?v=${v.youtubeId}`,
      title: v.name,
      thumbnail: `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`,
      source: 'youtube.com',
    }));
    const seen = new Set<string>();
    return [...official, ...searchedVideos].filter((v) => {
      const k = youTubeId(v.url) ?? v.url;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [info, searchedVideos]);

  // Images tab: TMDB stills of the film.
  const images = (info?.images ?? []).map((url) => ({ url, title: info?.title ?? '', source: 'themoviedb.org' }));

  // Videos / Images only when there is something to show.
  const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: 'movie', label: t('movieTab'), icon: Film },
    ...(allVideos.length > 0 ? [{ id: 'videos' as const, label: t('movieVideos'), icon: Video }] : []),
    ...(images.length > 0 ? [{ id: 'images' as const, label: t('movieImages'), icon: ImageIcon }] : []),
    { id: 'sources', label: t('movieSources'), icon: Link2 },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--ui-bg-primary)', color: 'var(--ui-text-primary)' }}>
      <TopBar query={query} timeAgo="" />
      <FactTabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'movie' && (
          <>
            {/* Title + meta line: boxed certification, details in gray */}
            <div className="mb-3">
              <h1 className="text-lg font-semibold">{info?.title ?? query}</h1>
              {info && (
                <p className="text-sm mt-1 flex items-center flex-wrap gap-x-1.5 text-gray-500 dark:text-gray-400">
                  {info.certification && (
                    <span className="text-[10px] leading-none px-1 py-0.5 border rounded-sm border-gray-400 dark:border-gray-500">
                      {info.certification}
                    </span>
                  )}
                  <span>
                    {info.certification && '· '}
                    {[info.year, info.genres.join(', '), formatRuntime(info.runtimeMinutes)].filter(Boolean).join(' · ')}
                  </span>
                </p>
              )}
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
              {/* Trailer; the cover only when no trailer was found */}
              <div className="flex-1 min-w-0 flex">
                <div className="flex-1 min-w-0 relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title={t('movieTrailer')}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  ) : coverUrl ? (
                    <img src={coverUrl} alt={info?.title ?? query} className="w-full h-full object-cover" />
                  ) : loadingInfo ? (
                    <Loader2 size={28} className="animate-spin text-white/70" />
                  ) : (
                    <Film size={36} className="text-white/50" />
                  )}
                </div>
              </div>

              {/* Side cards (below on mobile): one or two lines each */}
              {info && (
                <div className="lg:w-80 flex flex-col gap-2">
                  {info.ratings.length > 0 && (
                    <Card
                      label={t('movieRating')}
                      right={info.ratings.slice(0, 2).map((r) => (
                        <span key={r.source} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                          {r.value}
                          <img src={favicon(RATING_SITE[r.source] ?? r.source)} alt={r.source} title={r.source} className="w-5 h-5 rounded-full" />
                        </span>
                      ))}
                    />
                  )}

                  <LinksCard label={t('movieWatchOn')} items={info.watch.providers} link={info.watch.link} />

                  {info.directors.length > 0 && (
                    <Card label={t('movieDirectedBy')} value={info.directors.join(', ')} />
                  )}

                  {(oscarText || awardTotals) && (
                    <Card
                      label={t('movieAwards')}
                      value={oscarText || awardTotals}
                      right={oscarText
                        ? <Trophy size={18} style={{ color: 'var(--accent-primary)' }} />
                        : <Award size={18} className="text-gray-500 dark:text-gray-400" />}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Cast carousel → each actor opens a new search */}
            {info && info.cast.length > 0 && (
              <section className="mt-8">
                <h2 className="text-base font-semibold mb-3">{t('movieCast')}</h2>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                  {info.cast.map((c) => (
                    <button
                      key={`${c.name}-${c.character}`}
                      type="button"
                      onClick={() => navigate(`/fast-search?q=${encodeURIComponent(c.name)}`)}
                      className="w-24 flex-shrink-0 text-left"
                    >
                      <div className="w-24 h-24 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
                        {c.photoUrl && <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" loading="lazy" />}
                      </div>
                      <p className="text-sm font-medium mt-2 leading-tight">{c.name}</p>
                      <p className="text-[11px] leading-tight text-gray-500 dark:text-gray-400">{c.character}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* More to explore: a dropdown of lists (related by default); each card opens its own fact sheet */}
            {info && (
              <section className="mt-8">
                <div className="mb-3">
                  <MenuSelect options={EXPLORE_OPTIONS} value={exploreList} onChange={pickExplore} />
                </div>
                {!exploreItems ? (
                  <Loader2 size={18} className="animate-spin text-gray-500 dark:text-gray-400" />
                ) : (
                  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                    {exploreItems.map((r) => (
                      <button
                        key={`${r.title}-${r.year}`}
                        type="button"
                        onClick={() => navigate(`/movie-results?q=${encodeURIComponent(`${r.title} ${r.year}`.trim())}&movie=1`)}
                        className="w-32 flex-shrink-0 text-left rounded-xl overflow-hidden border"
                        style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-subtle)' }}
                      >
                        <img src={r.posterUrl} alt={r.title} className="w-full aspect-[2/3] object-cover" loading="lazy" />
                        <div className="p-2">
                          <p className="text-sm font-medium leading-tight line-clamp-2">{r.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{r.year}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            <AboutSection
              title={info ? t('movieAboutTitle').replace('{title}', info.title) : t('movieAbout')}
              text={explanation}
              done={explanationDone}
            />
          </>
        )}

        {tab === 'videos' && <VideosGrid videos={allVideos} />}

        {tab === 'images' && <ImagesGrid images={images} />}

        {tab === 'sources' && (
          // Same source cards as Search; IMDb and TMDB (the fact-sheet data) are listed too.
          <SourcesList
            sources={[
              ...sources,
              ...(info?.imdbUrl ? [{ title: `${info.title} — IMDb`, url: info.imdbUrl, snippet: '' }] : []),
              ...(info ? [{ title: `${info.title} — TMDB`, url: info.tmdbUrl, snippet: '' }] : []),
            ]}
          />
        )}
      </div>
    </div>
  );
}
