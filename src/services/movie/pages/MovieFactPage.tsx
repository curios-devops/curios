// Movie 🍿 page (Home routes here with movie=1): a film fact sheet instead of a
// generated video. Title + certification/year/genres/runtime, official trailer (or a
// searched trailer, else the cover), side cards (ratings, where to watch, sources,
// director, awards, Oscars), a cast carousel linking to new searches, then a short
// explanation written by ONE LLM call grounded on TMDB's synopsis + web sources.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Award, Clapperboard, Film, Link2, Loader2, Play, Star, Trophy, Tv, Video, type LucideIcon } from 'lucide-react';
import TopBar from '../../../components/results/TopBar.tsx';
import LightMarkdown from '../../../components/LightMarkdown';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useLanguage } from '../../../contexts/LanguageContext.tsx';
import { useAnswerModel } from '../../../hooks/useAnswerModel.ts';
import { executeWebSearch, type WebSearchResult } from '../../search/providers/webSearchProvider.ts';
import { buildSourcesText, streamLLMText } from '../../search/providers/llmProvider.ts';
import { fetchMovieInfo, formatRuntime, type MovieInfo } from '../movieInfo.ts';
import { findMovieTrailer, youTubeId, type MovieTrailer } from '../trailer.ts';
import { searchVideos } from '../../search/providers/mediaSearchProvider.ts';

type Tab = 'movie' | 'videos' | 'sources';

interface VideoItem { url: string; title: string; thumbnail: string; source: string }

const domain = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
};

function Card({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-subtle)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} style={{ color: 'var(--accent-primary)' }} />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="text-sm" style={{ color: 'var(--ui-text-secondary)' }}>{children}</div>
    </div>
  );
}

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

Write in language "${currentLanguage.code}", 150–250 words, markdown with short paragraphs: what the film is about, its main themes, and why it matters or how it was received. Ground every claim in the synopsis and sources. Do not reveal the ending unless the user asked about it. No title heading, no URLs.`;
      await streamLLMText(prompt, 900, (chunk) => { if (!cancelled) setExplanation((prev) => prev + chunk); }, 60000, model.model);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, currentLanguage.code]);

  const youtubeId = info?.trailerYoutubeId;
  const embedUrl = youtubeId
    ? `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0`
    : trailer?.embedUrl ?? null;
  const coverUrl = info?.backdropUrl ?? info?.posterUrl ?? trailer?.coverUrl ?? null;
  const meta = info ? [info.certification, info.year, info.genres.join(', '), formatRuntime(info.runtimeMinutes)].filter(Boolean) : [];
  const oscars = info?.awards?.oscars;

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
            {/* Title + meta line */}
            <div className="mb-4">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em]">{info?.title ?? query}</h1>
              {meta.length > 0 && (
                <p className="text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>{meta.join(' · ')}</p>
              )}
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Trailer (or cover) */}
              <div className="flex-1 min-w-0">
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
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

              {/* Side cards (below on mobile) */}
              {info && (
                <div className="lg:w-80 flex flex-col gap-3">
                  {info.ratings.length > 0 && (
                    <Card icon={Star} title={t('movieRating')}>
                      <ul className="space-y-1">
                        {info.ratings.map((r) => (
                          <li key={r.source} className="flex justify-between gap-2">
                            <span>{r.source}</span>
                            <span className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>{r.value}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {info.watch.providers.length > 0 && (
                    <Card icon={Tv} title={t('movieWatchOn')}>
                      <a href={info.watch.link ?? '#'} target="_blank" rel="noopener noreferrer" className="flex flex-wrap gap-2">
                        {info.watch.providers.slice(0, 8).map((p) => (
                          <img key={p.name} src={p.logoUrl} alt={p.name} title={p.name} className="w-9 h-9 rounded-lg" />
                        ))}
                      </a>
                    </Card>
                  )}

                  {sources.length > 0 && (
                    <Card icon={Link2} title={t('movieSources')}>
                      {/* Same look as Search: first 3 favicons stacked + total count */}
                      <button type="button" onClick={() => setTab('sources')} className="flex items-center gap-2">
                        <span className="flex items-center">
                          {sources.slice(0, 3).map((s, i) => (
                            <span
                              key={s.url}
                              className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center overflow-hidden"
                              style={{ marginLeft: i > 0 ? '-8px' : '0', zIndex: 3 - i }}
                            >
                              <img src={`https://www.google.com/s2/favicons?domain=${domain(s.url)}&sz=32`} alt="" className="w-4 h-4" />
                            </span>
                          ))}
                        </span>
                        <span className="text-sm font-medium">+{sources.length}</span>
                      </button>
                    </Card>
                  )}

                  {info.directors.length > 0 && (
                    <Card icon={Clapperboard} title={t('movieDirectedBy')}>
                      {info.directors.join(', ')}
                    </Card>
                  )}

                  {oscars && (oscars.wins > 0 || oscars.nominations > 0) && (
                    <Card icon={Trophy} title={t('movieOscars')}>
                      {oscars.wins > 0
                        ? t('movieOscarWins').replace('{n}', String(oscars.wins))
                        : t('movieOscarNominations').replace('{n}', String(oscars.nominations))}
                    </Card>
                  )}

                  {info.awards && (info.awards.wins > 0 || info.awards.nominations > 0) && (
                    <Card icon={Award} title={t('movieAwards')}>
                      {t('movieAwardTotals')
                        .replace('{wins}', String(info.awards.wins))
                        .replace('{nominations}', String(info.awards.nominations))}
                    </Card>
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
                      <p className="text-xs leading-tight" style={{ color: 'var(--ui-text-muted)' }}>{c.character}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* More to explore: related films, each opens its own fact sheet */}
            {info && info.related.length > 0 && (
              <section className="mt-8">
                <h2 className="text-base font-semibold mb-3">{t('movieMoreToExplore')}</h2>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {info.related.map((r) => (
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
                        <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>{r.year}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Explanation */}
            <section className="mt-8 max-w-3xl">
              <h2 className="text-base font-semibold mb-3">{t('movieAbout')}</h2>
              {explanation ? (
                <LightMarkdown>{explanation}</LightMarkdown>
              ) : (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--ui-text-muted)' }}>
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
                  <p className="text-xs mt-1" style={{ color: 'var(--ui-text-muted)' }}>{v.source}</p>
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
