// Movie 🍿 page (Home routes here with movie=1): a film fact sheet instead of a
// generated video. Title + certification/year/genres/runtime, official trailer (or a
// searched trailer, else the cover), side cards (ratings, where to watch, sources,
// director, awards, Oscars), a cast carousel linking to new searches, then a short
// explanation written by ONE LLM call grounded on TMDB's synopsis + web sources.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Award, ChevronDown, Film, Headphones, Link2, Loader2, Pause, Play, Trophy, Video, type LucideIcon } from 'lucide-react';
import { useProCredits } from '../../../providers/ProCreditsProvider.tsx';
import { ParagraphNarrator, toParagraphs, type NarratorState } from '../audio/paragraphNarrator.ts';
import { loadNarratorVoice, narratorGender } from '../audio/narratorPrefs.ts';
import { useSession } from '../../../hooks/useSession.ts';
import TopBar from '../../../components/results/TopBar.tsx';
import LightMarkdown from '../../../components/LightMarkdown';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useLanguage } from '../../../contexts/LanguageContext.tsx';
import { useAnswerModel } from '../../../hooks/useAnswerModel.ts';
import { executeWebSearch, type WebSearchResult } from '../../search/providers/webSearchProvider.ts';
import { buildSourcesText, streamLLMText } from '../../search/providers/llmProvider.ts';
import { fetchExploreList, fetchMovieInfo, formatRuntime, type ExploreItem, type ExploreList, type MovieInfo } from '../movieInfo.ts';
import { findMovieTrailer, youTubeId, type MovieTrailer } from '../trailer.ts';
import { searchVideos } from '../../search/providers/mediaSearchProvider.ts';

type Tab = 'movie' | 'videos' | 'sources';


interface VideoItem { url: string; title: string; thumbnail: string; source: string }

const domain = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
};

// Compact card (Perplexity-style): gray label over a primary value, visuals on the right.
function Card({ label, value, right, onClick }: { label: string; value?: ReactNode; right?: ReactNode; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className="w-full text-left rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
      style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-subtle)' }}
    >
      <div className="min-w-0">
        <p
          className={value ? 'text-[11px] text-gray-500 dark:text-gray-400' : 'text-sm font-medium'}
          style={value ? undefined : { color: 'var(--ui-text-primary)' }}
        >
          {label}
        </p>
        {value && <p className="text-sm font-medium line-clamp-2" style={{ color: 'var(--ui-text-primary)' }}>{value}</p>}
      </div>
      {right && <div className="flex items-center gap-2 flex-shrink-0">{right}</div>}
    </Tag>
  );
}

const favicon = (site: string) => `https://www.google.com/s2/favicons?domain=${site}&sz=64`;
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
  const [searchedVideos, setSearchedVideos] = useState<VideoItem[]>([]);
  const [watchOpen, setWatchOpen] = useState(false);
  // "More to explore" dropdown: TMDB lists fetched on demand and cached per list.
  const [exploreList, setExploreList] = useState<ExploreList>('related');
  const [exploreOpen, setExploreOpen] = useState(false);
  const exploreMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!exploreOpen) return;
    const close = (e: MouseEvent) => {
      if (exploreMenuRef.current && !exploreMenuRef.current.contains(e.target as Node)) setExploreOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [exploreOpen]);
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
  const [explanationDone, setExplanationDone] = useState(false);
  // Listen (ElevenLabs, OpenAI TTS fallback), paragraph by paragraph in the user's
  // narrator voice. First play costs 1 Pro Credit; replays reuse the generated audio.
  const { requestProAccess } = useProCredits();
  const { session } = useSession();
  const narratorRef = useRef<ParagraphNarrator | null>(null);
  const [narration, setNarration] = useState<NarratorState | 'idle'>('idle');
  // Leaving the page cancels any pending generation and stops playback.
  useEffect(() => () => narratorRef.current?.stop(), []);

  // Listening time at ~155 spoken words per minute.
  const listenSeconds = Math.round((toParagraphs(explanation).join(' ').split(/\s+/).filter(Boolean).length / 155) * 60);
  const listenTime = listenSeconds < 60 ? `${Math.max(listenSeconds, 5)} s` : `${Math.round(listenSeconds / 60)} min`;

  const handleListen = async () => {
    const current = narratorRef.current;
    if (current && narration === 'playing') { current.pause(); return; }
    if (current && narration === 'paused') { current.resume(); return; }
    if (current && (narration === 'ended' || narration === 'error')) { void current.start(0); return; }
    if (current) return; // still loading

    // Created synchronously in the tap (unlocks audio on mobile), before any await.
    const voiceId = loadNarratorVoice(session?.user);
    const narrator = new ParagraphNarrator(toParagraphs(explanation), voiceId, narratorGender(voiceId), setNarration);
    narratorRef.current = narrator;
    setNarration('loading');
    if (!(await requestProAccess())) {
      narrator.stop();
      narratorRef.current = null;
      setNarration('idle');
      return;
    }
    void narrator.start(0);
  };

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

  const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: 'movie', label: t('movieTab'), icon: Film },
    // Only when there is something to show.
    ...(allVideos.length > 0 ? [{ id: 'videos' as const, label: t('movieVideos'), icon: Video }] : []),
    { id: 'sources', label: t('movieSources'), icon: Link2 },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--ui-bg-primary)', color: 'var(--ui-text-primary)' }}>
      <TopBar query={query} timeAgo="" />

      <div className="border-b" style={{ borderColor: 'var(--ui-bg-elevated)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
                style={tab === id
                  ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }
                  : { borderColor: 'transparent', color: 'var(--ui-text-muted)' }}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

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

                  {info.watch.providers.length > 0 && (
                    <div>
                      <Card
                        label={t('movieWatchOn')}
                        value={info.watch.providers.length > 1
                          ? `${info.watch.providers[0].name}, +${info.watch.providers.length - 1}`
                          : info.watch.providers[0].name}
                        onClick={() => setWatchOpen((o) => !o)}
                        right={
                          <>
                            <span className="flex items-center">
                              {info.watch.providers.slice(0, 3).map((p, i) => (
                                <img
                                  key={p.name}
                                  src={p.logoUrl}
                                  alt={p.name}
                                  className="w-6 h-6 rounded-full border-2"
                                  style={{ marginLeft: i > 0 ? '-6px' : 0, zIndex: 3 - i, borderColor: 'var(--ui-bg-elevated)' }}
                                />
                              ))}
                            </span>
                            <ChevronDown size={14} className={`transition-transform text-gray-500 dark:text-gray-400 ${watchOpen ? 'rotate-180' : ''}`} />
                          </>
                        }
                      />
                      {watchOpen && (
                        <ul className="mt-1 rounded-xl border py-1" style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-subtle)' }}>
                          {info.watch.providers.map((p) => (
                            <li key={p.name}>
                              <a
                                href={info.watch.link ?? '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 px-4 py-2 text-sm hover:opacity-80"
                              >
                                <img src={p.logoUrl} alt="" className="w-6 h-6 rounded-full" />
                                {p.name}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

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
                {/* Same dropdown style as the Home input's mode menu */}
                <div className="relative inline-block mb-3" ref={exploreMenuRef}>
                  <button
                    type="button"
                    onClick={() => setExploreOpen((o) => !o)}
                    className="flex items-center gap-1.5 text-base font-semibold"
                    style={{ color: 'var(--ui-text-primary)' }}
                  >
                    {EXPLORE_OPTIONS.find((o) => o.id === exploreList)?.label}
                    <ChevronDown size={16} className={`transition-transform text-gray-500 dark:text-gray-400 ${exploreOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {exploreOpen && (
                    <div
                      className="absolute top-full mt-2 left-0 rounded-lg shadow-lg border overflow-hidden min-w-[220px] z-50"
                      style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)', boxShadow: '0 14px 28px var(--ui-shadow-elevated)' }}
                    >
                      {EXPLORE_OPTIONS.map((o) => {
                        const active = o.id === exploreList;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => { pickExplore(o.id); setExploreOpen(false); }}
                            className="w-full flex items-center justify-between gap-3 px-4 py-3 transition-colors text-left"
                            style={{ color: active ? 'var(--accent-primary)' : 'var(--ui-text-primary)', fontWeight: active ? 500 : 400 }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <span className="text-sm">{o.label}</span>
                            {active && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
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

            {/* Explanation */}
            <section className="mt-8 max-w-3xl">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-base font-semibold">{info ? t('movieAboutTitle').replace('{title}', info.title) : t('movieAbout')}</h2>
                {explanationDone && (
                  <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">≈ {listenTime}</span>
                  <button
                    type="button"
                    onClick={() => void handleListen()}
                    disabled={narration === 'loading'}
                    title={t('movieListen')}
                    aria-label={t('movieListen')}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                    style={{ backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--accent-primary)' }}
                  >
                    {narration === 'loading' ? <Loader2 size={16} className="animate-spin" /> : narration === 'playing' ? <Pause size={16} /> : <Headphones size={16} />}
                  </button>
                  </div>
                )}
              </div>
              {explanation ? (
                <LightMarkdown>{explanation}</LightMarkdown>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              )}
            </section>
          </>
        )}

        {tab === 'videos' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allVideos.map((v) => (
              <a
                key={v.url}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl overflow-hidden border transition-colors"
                style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-subtle)' }}
              >
                <div className="relative aspect-video bg-black">
                  {v.thumbnail && <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" loading="lazy" />}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
                      <Play size={20} className="text-white ml-0.5" />
                    </span>
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium leading-tight line-clamp-2">{v.title}</p>
                  <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">{v.source}</p>
                </div>
              </a>
            ))}
          </div>
        )}

        {tab === 'sources' && (
          // Same source cards as Search; IMDb and TMDB (the fact-sheet data) are listed too.
          <div className="grid gap-3 max-w-3xl">
            {[
              ...sources,
              ...(info?.imdbUrl ? [{ title: `${info.title} — IMDb`, url: info.imdbUrl, snippet: '' }] : []),
              ...(info ? [{ title: `${info.title} — TMDB`, url: info.tmdbUrl, snippet: '' }] : []),
            ].map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors bg-white dark:bg-[#0a0a0a]"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                  <img src={`https://www.google.com/s2/favicons?domain=${domain(s.url)}&sz=32`} alt="" className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">{s.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{domain(s.url)}</p>
                  {s.snippet && <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{s.snippet}</p>}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
