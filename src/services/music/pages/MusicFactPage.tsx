// Music 🎵 page (Home's Music mode, or Auto when Decisions sees a music question): a fact
// sheet for a song, an artist or an album, built like the Movie page. The song's video
// (YouTube) takes the trailer's place; without one, a carousel of covers and artist photos.
// Side cards (artist, album, 30 s preview, where to listen), top songs / tracklist with
// previews, discography and similar artists (each opens its own sheet), then a short
// explanation written by ONE LLM call grounded on the bio + web sources.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Disc3, ExternalLink, Wand2, Image as ImageIcon, Link2, Loader2, Music, Pause, Play, Quote, Users, Video, type LucideIcon } from 'lucide-react';
import TopBar from '../../../components/results/TopBar.tsx';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useLanguage } from '../../../contexts/LanguageContext.tsx';
import { useAnswerModel } from '../../../hooks/useAnswerModel.ts';
import { executeWebSearch, type WebSearchResult } from '../../search/providers/webSearchProvider.ts';
import { buildSourcesText, streamLLMText } from '../../search/providers/llmProvider.ts';
import { searchVideos } from '../../search/providers/mediaSearchProvider.ts';
import { AboutSection, FactCard as Card, FactTabs, LinksCard, SourcesList, VideosGrid, domain, type VideoItem } from '../../../components/factSheet/FactSheet.tsx';
import { ImagesGrid } from '../../../components/results/ImageGallery.tsx';
import { useProCredits } from '../../../providers/ProCreditsProvider.tsx';
import SongStudio from '../song/SongStudio.tsx';
import { compact, fetchMusicInfo, fetchMusicLineup, findMusicVideo, formatDuration, listenOn, lyricsLink, type MusicInfo, type MusicKind, type MusicLineup, type MusicTarget, type MusicTrack } from '../musicInfo.ts';

type Tab = 'music' | 'lyrics' | 'videos' | 'images' | 'sources';

// No video: covers and artist photos fade one into the next (square covers sit on a blurred copy).
function PhotoCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), 4000);
    return () => clearInterval(id);
  }, [images.length]);
  return (
    <>
      {images.map((src, i) => (
        <div key={src} className="absolute inset-0 transition-opacity duration-1000" style={{ opacity: i === index ? 1 : 0 }}>
          <img src={src} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60" />
          <img src={src} alt={alt} className="relative w-full h-full object-contain" />
        </div>
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function MusicFactPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const query = params.get('q') || '';
  // Links inside the page say exactly what they open (kind + artist + title).
  const target = useMemo<MusicTarget | null>(() => {
    const kind = params.get('kind') as MusicKind | null;
    const artist = params.get('artist');
    return kind && artist ? { kind, artist, title: params.get('title') ?? undefined, album: params.get('album') ?? undefined, year: params.get('year') ?? undefined } : null;
  }, [params]);
  const { getModel } = useAnswerModel(query);
  const { canUseProFeature, requestProAccess, tier } = useProCredits();
  const [studioOpen, setStudioOpen] = useState(false);
  // Out of credits → the sign-up / upgrade modal right away (same as the game studio).
  const openStudio = () => {
    if (canUseProFeature) { setStudioOpen(true); return; }
    void requestProAccess(tier === 'guest' ? t('creditsOutSongGuest') : tier === 'free' ? t('creditsOutSongFree') : undefined);
  };

  const [tab, setTab] = useState<Tab>('music');
  const [info, setInfo] = useState<MusicInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoSearched, setVideoSearched] = useState(false);
  const [sources, setSources] = useState<WebSearchResult[]>([]);
  const [explanation, setExplanation] = useState('');
  const [explanationDone, setExplanationDone] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  // Songs and artists: the band and its members (or the singer and their bands), asked after the sheet.
  const [lineup, setLineup] = useState<MusicLineup | null>(null);
  // Lyrics tab: what the song says, written only when the tab is opened.
  const [meaning, setMeaning] = useState('');
  const [meaningDone, setMeaningDone] = useState(false);
  const meaningAsked = useRef(false);

  // One 30 s preview at a time, from any list on the page.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const togglePreview = (url: string) => {
    audioRef.current?.pause();
    if (playing === url) { setPlaying(null); return; }
    const audio = new Audio(url);
    audio.onended = () => setPlaying(null);
    audioRef.current = audio;
    setPlaying(url);
    void audio.play().catch(() => setPlaying(null));
  };
  useEffect(() => () => audioRef.current?.pause(), []);

  // 1) Fact sheet; 2) the song's video + Videos tab; 3) sources → explanation.
  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    setInfo(null); setLoadingInfo(true); setVideoUrl(null); setVideoSearched(false);
    setSources([]); setExplanation(''); setExplanationDone(false); setVideos([]); setTab('music');
    setMeaning(''); setMeaningDone(false); meaningAsked.current = false; setLineup(null);
    audioRef.current?.pause(); setPlaying(null);
    void (async () => {
      const music = await fetchMusicInfo(query, currentLanguage.code, target);
      if (cancelled) return;
      setInfo(music);
      setLoadingInfo(false);
      if (music && music.kind !== 'album') {
        fetchMusicLineup(music.artist.name, music.artist.pictureUrl).then((l) => { if (!cancelled) setLineup(l); });
      }

      // Artist / album pages show the video of their most popular song.
      const artist = music?.artist.name ?? '';
      const song = music?.kind === 'track' ? music.title : music?.kind === 'album'
        ? music.tracks?.slice().sort((a, b) => b.rank - a.rank)[0]?.title
        : music?.topTracks[0]?.title;
      const subject = music ? (music.kind === 'artist' ? artist : `${music.title} ${artist}`) : query;
      findMusicVideo(artist, song ?? query)
        .then((url) => { if (!cancelled) setVideoUrl(url); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setVideoSearched(true); });
      searchVideos(subject)
        .then((vs) => { if (!cancelled) setVideos(vs.map((v) => ({ url: v.url, title: v.title, thumbnail: v.thumbnail, source: v.source || domain(v.url) }))); })
        .catch(() => {});

      const kindWord = music?.kind === 'artist' ? 'musician' : music?.kind === 'album' ? 'album' : 'song';
      const found = (await executeWebSearch(`${subject} ${kindWord}`).catch(() => [])).slice(0, 6);
      if (cancelled) return;
      setSources(found);

      const facts = music
        ? `${music.kind === 'artist' ? `Artist: ${artist}` : `${music.kind === 'album' ? 'Album' : 'Song'}: "${music.title}" by ${artist}${music.album && music.kind === 'track' ? `, from the album "${music.album.title}"` : ''}${music.year ? ` (${music.year})` : ''}`}. Genres: ${[...(music.genres ?? []), ...music.tags].join(', ') || 'unknown'}.${music.bio ? `\nBio: ${music.bio}` : ''}`
        : '';
      const focus = music?.kind === 'artist'
        ? '(1) who they are and where they come from, (2) their sound and best-known works, (3) their influence or where they are now'
        : music?.kind === 'album'
          ? '(1) the context in which it was made, (2) its sound and standout songs, (3) how it was received and its legacy'
          : '(1) what the song is about, (2) how it was made and how it sounds, (3) its success or legacy';
      const model = await getModel();
      const prompt = `Explain the music the user asked about: "${query}".
${facts}

Search Results:
${buildSourcesText(found)}

Write in language "${currentLanguage.code}", 140–180 words in 2–3 short paragraphs: ${focus}. Engaging and clear, no filler. Ground every claim in the facts and sources. Never quote more than a few words of lyrics. No title heading, no URLs.`;
      await streamLLMText(prompt, 900, (chunk) => { if (!cancelled) setExplanation((prev) => prev + chunk); }, 60000, model.model);
      if (!cancelled) setExplanationDone(true);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, target, currentLanguage.code]);

  const openLyrics = () => {
    setTab('lyrics');
    if (meaningAsked.current || !info?.lyrics) return;
    meaningAsked.current = true;
    const words = info.lyrics;
    void (async () => {
      const model = await getModel();
      const prompt = `Explain what the song "${info.title}" by ${info.artist.name}${info.year ? ` (${info.year})` : ''} says and means.
${words.full ? 'Lyrics' : 'Opening lines'}:
${words.text}

Search Results:
${buildSourcesText(sources)}

Write in language "${currentLanguage.code}", 90–120 words in 1–2 short paragraphs: the story or feeling the lyrics express and the main images they use. Ground it in the lines and sources; where the meaning is debated, say so. Never quote more than a few words of lyrics. No title heading, no URLs.`;
      await streamLLMText(prompt, 600, (chunk) => setMeaning((prev) => prev + chunk), 60000, model.model);
      setMeaningDone(true);
    })();
  };

  const open = (kind: MusicKind, artist: string, title?: string) => {
    const p = new URLSearchParams({ q: kind === 'artist' ? artist : `${title} ${artist}`, kind, artist });
    if (title) p.set('title', title);
    navigate(`/music-results?${p}`);
  };

  const lang = currentLanguage.code;
  // Time in the band: "1970–1991", "1970–today"; founders without dates show none.
  const years = (from: string, to: string) => (from ? `${from}–${to || t('musicPresent')}` : '');
  const people = [
    ...(lineup?.members ?? []).map((m) => ({ ...m, note: years(m.from, m.to) })),
    ...(lineup?.groups ?? []).map((g) => ({ ...g, note: [t('musicGroup'), years(g.from, g.to)].filter(Boolean).join(' · ') })),
  ];
  const kindLabel = info ? t(`musicKind_${info.kind}` as never) : '';
  const meta = info ? [
    kindLabel,
    info.kind !== 'artist' ? info.artist.name : '',
    info.year,
    (info.genres?.length ? info.genres : info.tags).slice(0, 2).join(', '),
    info.kind === 'album' && info.trackCount ? t('musicTrackCount').replace('{n}', String(info.trackCount)) : '',
    formatDuration(info.durationSec),
  ].filter(Boolean) : [];
  const popularity = info?.listeners
    ? [t('musicListeners').replace('{n}', compact(info.listeners, lang)), info.playcount ? t('musicPlays').replace('{n}', compact(info.playcount, lang)) : ''].filter(Boolean).join(' · ')
    : info?.fans ? t('musicFans').replace('{n}', compact(info.fans, lang)) : '';
  const songs: MusicTrack[] = info?.kind === 'album' ? info.tracks ?? [] : info?.topTracks ?? [];
  const images = (info?.images ?? []).map((url) => ({ url, title: info?.title ?? '', source: info?.source === 'deezer' ? 'deezer.com' : 'wikipedia.org' }));

  const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: 'music', label: t('musicTab'), icon: Music },
    ...(info?.lyrics ? [{ id: 'lyrics' as const, label: t('musicLyrics'), icon: Quote }] : []),
    ...(videos.length > 0 ? [{ id: 'videos' as const, label: t('movieVideos'), icon: Video }] : []),
    ...(images.length > 0 ? [{ id: 'images' as const, label: t('movieImages'), icon: ImageIcon }] : []),
    { id: 'sources', label: t('movieSources'), icon: Link2 },
  ];

  const PlayButton = ({ url }: { url: string | null }) => url ? (
    <span
      role="button"
      tabIndex={0}
      aria-label={t('musicPreview')}
      onClick={(e) => { e.stopPropagation(); togglePreview(url); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); togglePreview(url); } }}
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
    >
      {playing === url ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
    </span>
  ) : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--ui-bg-primary)', color: 'var(--ui-text-primary)' }}>
      <TopBar query={query} timeAgo="" />
      <FactTabs tabs={TABS} active={tab} onChange={(id) => (id === 'lyrics' ? openLyrics() : setTab(id))} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'music' && (
          <>
            <div className="mb-3">
              <h1 className="text-2xl font-semibold">{info?.title ?? query}</h1>
              {meta.length > 0 && <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">{meta.join(' · ')}</p>}
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
              {/* The song's video; photos when there is none */}
              <div className="flex-1 min-w-0 flex">
                <div className="flex-1 min-w-0 relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  {videoUrl ? (
                    <iframe
                      src={videoUrl}
                      title={info?.title ?? query}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      // YouTube rejects embeds without a Referer (Error 153), e.g. in webviews.
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  ) : videoSearched && info?.images.length ? (
                    <PhotoCarousel images={info.images} alt={info.title} />
                  ) : loadingInfo || !videoSearched ? (
                    <Loader2 size={28} className="animate-spin text-white/70" />
                  ) : (
                    <Music size={36} className="text-white/50" />
                  )}
                </div>
              </div>

              {info && (
                <div className="lg:w-80 flex flex-col gap-2">
                  {info.kind === 'track' && info.previewUrl && (
                    <Card label={t('musicPreview')} value={t('musicPreviewHint')} onClick={() => togglePreview(info.previewUrl!)} right={<PlayButton url={info.previewUrl} />} />
                  )}
                  {info.kind !== 'artist' && (
                    <Card
                      label={t('musicKind_artist')}
                      value={info.featuring?.length ? `${info.artist.name} ft. ${info.featuring.join(', ')}` : info.artist.name}
                      onClick={() => open('artist', info.artist.name)}
                      right={info.artist.pictureUrl && <img src={info.artist.pictureUrl} alt="" className="w-8 h-8 rounded-full object-cover" />}
                    />
                  )}
                  {info.kind === 'track' && info.album && (
                    <Card
                      label={t('musicKind_album')}
                      value={[info.album.title, info.album.year].filter(Boolean).join(' · ')}
                      onClick={() => open('album', info.artist.name, info.album!.title)}
                      right={info.album.coverUrl && <img src={info.album.coverUrl} alt="" className="w-8 h-8 rounded object-cover" />}
                    />
                  )}
                  {info.kind === 'album' && info.label && <Card label={t('musicLabel')} value={info.label} />}
                  {popularity && <Card label={t('musicPopularity')} value={popularity} right={<Users size={18} className="text-gray-500 dark:text-gray-400" />} />}
                  {info.kind === 'artist' && (info.genres?.length || info.tags.length) ? (
                    <Card label={t('musicGenres')} value={(info.genres?.length ? info.genres : info.tags).slice(0, 4).join(', ')} />
                  ) : null}
                  <LinksCard label={t('musicListenOn')} items={listenOn(info)} />
                </div>
              )}
            </div>

            {/* Create your own song inspired by this one (1 Pro credit when generated) */}
            {info && (
              <button
                type="button"
                onClick={openStudio}
                className="mt-4 w-full rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
              >
                <Wand2 size={18} />
                {t('songCreate').replace('{name}', info.kind === 'artist' ? info.artist.name : info.title)}
              </button>
            )}

            {/* Who made it — a song: the band and its members (or the singer and their bands) plus
                guests; a band's own page: its members; a singer's page: their bands. */}
            {info && info.kind !== 'album' && (info.kind === 'track' || people.length > 0) && (
              <section className="mt-8">
                <h2 className="text-base font-semibold mb-3">
                  {info.kind === 'track' ? t('musicArtists') : lineup?.group ? t('musicMembers') : t('musicBands')}
                </h2>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                  {[
                    ...(info.kind === 'track' ? [lineup?.group
                      ? { name: lineup.group.name, pictureUrl: lineup.group.pictureUrl, note: t('musicGroup') }
                      : { name: info.artist.name, pictureUrl: info.artist.pictureUrl, note: t('musicKind_artist') }] : []),
                    ...people,
                    ...(info.featuringArtists ?? []).map((f) => ({ ...f, note: t('musicGuest') })),
                  ].map((p) => (
                    <button key={p.name} type="button" onClick={() => open('artist', p.name)} className="w-24 flex-shrink-0 text-left">
                      <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
                        {p.pictureUrl ? <img src={p.pictureUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" /> : <Users size={28} className="text-gray-400" />}
                      </div>
                      <p className="text-sm font-medium mt-2 leading-tight">{p.name}</p>
                      {p.note && <p className="text-[11px] leading-tight text-gray-500 dark:text-gray-400">{p.note}</p>}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Top songs (artist / song) or the tracklist (album), with previews */}
            {songs.length > 0 && (
              <section className="mt-8">
                <h2 className="text-base font-semibold mb-3">
                  {info?.kind === 'album' ? t('musicTracklist') : info?.kind === 'track' ? t('musicMoreBy').replace('{name}', info.artist.name) : t('musicTopSongs')}
                </h2>
                <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  {songs.slice(0, info?.kind === 'album' ? undefined : 10).map((s, i) => (
                    <li key={`${s.title}-${i}`} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: 'var(--ui-border-subtle)' }}>
                      <span className="w-5 text-right text-sm text-gray-500 dark:text-gray-400">{i + 1}</span>
                      {info?.kind !== 'album' && s.coverUrl && <img src={s.coverUrl} alt="" className="w-10 h-10 rounded object-cover" loading="lazy" />}
                      <button type="button" onClick={() => open('track', s.artist || info!.artist.name, s.title)} className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">{s.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDuration(s.durationSec)}</p>
                      </button>
                      <PlayButton url={s.previewUrl} />
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Discography → each album opens its sheet */}
            {info && info.albums.length > 0 && (
              <section className="mt-8">
                <h2 className="text-base font-semibold mb-3">{t('musicDiscography')}</h2>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {info.albums.map((a) => (
                    <button
                      key={a.title}
                      type="button"
                      onClick={() => open('album', info.artist.name, a.title)}
                      className="w-32 flex-shrink-0 text-left rounded-xl overflow-hidden border"
                      style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-subtle)' }}
                    >
                      {a.coverUrl ? <img src={a.coverUrl} alt={a.title} className="w-full aspect-square object-cover" loading="lazy" /> : <div className="w-full aspect-square flex items-center justify-center"><Disc3 size={28} className="text-gray-400" /></div>}
                      <div className="p-2">
                        <p className="text-sm font-medium leading-tight line-clamp-2">{a.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{a.year}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Similar artists → each opens its sheet */}
            {info && info.related.length > 0 && (
              <section className="mt-8">
                <h2 className="text-base font-semibold mb-3">{t('musicSimilar')}</h2>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                  {info.related.map((r) => (
                    <button key={r.name} type="button" onClick={() => open('artist', r.name)} className="w-24 flex-shrink-0 text-left">
                      <div className="w-24 h-24 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
                        {r.pictureUrl && <img src={r.pictureUrl} alt={r.name} className="w-full h-full object-cover" loading="lazy" />}
                      </div>
                      <p className="text-sm font-medium mt-2 leading-tight">{r.name}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <AboutSection
              title={info ? t('movieAboutTitle').replace('{title}', info.title) : t('musicAbout')}
              text={explanation}
              done={explanationDone}
            />
          </>
        )}

        {/* Public-domain songs show the full lyrics; protected ones a short quotation + a
            licensed link (the full text never reaches the browser). */}
        {tab === 'lyrics' && info?.lyrics && (
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold">{info.title}</h1>
            <p className="text-sm mt-1 mb-4 text-gray-500 dark:text-gray-400">
              {info.artist.name}{!info.lyrics.full && ` · ${t('musicLyricsExcerpt')}`}
            </p>
            <blockquote className="whitespace-pre-line text-base leading-relaxed pl-4 border-l-2" style={{ borderColor: 'var(--accent-primary)' }}>
              {info.lyrics.text}{!info.lyrics.full && ' …'}
            </blockquote>
            {!info.lyrics.full && (
              <a
                href={lyricsLink(info)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
              >
                {t('musicLyricsFull')} <ExternalLink size={14} />
              </a>
            )}
            <AboutSection title={t('musicLyricsMeaning')} text={meaning} done={meaningDone} />
          </div>
        )}

        {tab === 'videos' && <VideosGrid videos={videos} />}

        {tab === 'images' && <ImagesGrid images={images} />}

        {tab === 'sources' && (
          <SourcesList
            sources={[
              ...sources,
              ...(info?.link ? [{ title: `${info.title} — Deezer`, url: info.link, snippet: '' }] : []),
              ...(info?.lastfmUrl ? [{ title: `${info.title} — Last.fm`, url: info.lastfmUrl, snippet: '' }] : []),
              ...(info?.wikipediaUrl ? [{ title: `${info.title} — Wikipedia`, url: info.wikipediaUrl, snippet: '' }] : []),
            ]}
          />
        )}
      </div>
      {studioOpen && info && <SongStudio info={info} onClose={() => setStudioOpen(false)} />}
    </div>
  );
}
