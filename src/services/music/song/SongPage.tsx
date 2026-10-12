// A song made in the song studio (/song/:id, shared by link and listed in Creative): the
// animation on top with captions over it, then the player and its controls — animation
// style, captions (none / scrolling / appearing word by word) and voice on/off (the
// accompaniment alone, separated on first use).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Pause, Play, Share2, ThumbsDown, ThumbsUp, Wand2 } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { buildAnimationHtml, DEFAULT_ANIMATION } from './songRuntime.ts';
import { countSongPlay, fetchSong, mySongVote, separateVoice, voteSong, type AnimationStyle, type Song } from './songService.ts';

type CaptionMode = 'none' | 'scroll' | 'appear';
const ANIMATIONS: AnimationStyle[] = ['abstract', 'drawn', 'particles'];
const CAPTIONS: CaptionMode[] = ['none', 'scroll', 'appear'];
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const pill = (on: boolean) => ({
  className: 'px-3 py-1.5 rounded-full text-sm border transition-colors whitespace-nowrap',
  style: on
    ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)', borderColor: 'var(--accent-primary)' }
    : { backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--ui-text-primary)', borderColor: 'var(--ui-border-subtle)' },
});

export default function SongPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [song, setSong] = useState<Song | null | undefined>(undefined);
  const [animation, setAnimation] = useState<AnimationStyle>('drawn');
  const [broken, setBroken] = useState<Set<AnimationStyle>>(new Set());
  const [captionMode, setCaptionMode] = useState<CaptionMode>('appear');
  const [voiceOn, setVoiceOn] = useState(true);
  const [separating, setSeparating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [votes, setVotes] = useState({ up: 0, down: 0, mine: mySongVote(id) as -1 | 0 | 1 });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const counted = useRef(false);

  useEffect(() => {
    void fetchSong(id).then((s) => {
      setSong(s);
      if (!s) return;
      setVotes({ up: s.votesUp, down: s.votesDown, mine: mySongVote(s.id) });
      if (!s.animations.drawn) setAnimation('abstract');
    });
  }, [id]);

  // The part each sung line belongs to (verse / chorus / bridge), for the animation.
  const lineSections = useMemo(() => {
    if (!song?.lyrics) return [];
    const byId = new Map(song.lyrics.parts.map((p) => [p.id, p]));
    return song.lyrics.order.flatMap((pid) => (byId.get(pid)?.lines ?? []).map(() => byId.get(pid)!.type));
  }, [song]);

  const current = song ? song.captions.reduce((k, c, i) => (c.start_ms <= time * 1000 ? i : k), -1) : -1;

  // The model's code for the chosen style, or the built-in visualizer if it is missing or broke.
  const code = song && !broken.has(animation) ? song.animations[animation] ?? DEFAULT_ANIMATION : DEFAULT_ANIMATION;
  const html = useMemo(() => buildAnimationHtml(code, song?.palette ?? []), [code, song?.palette]);

  // Runtime errors (or no "ready" within 2 s) → this style falls back to the built-in one.
  useEffect(() => {
    if (!song) return;
    let ready = false;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      if (e.data?.type === 'ready') ready = true;
      if (e.data?.type === 'error') setBroken((b) => new Set(b).add(animation));
    };
    window.addEventListener('message', onMessage);
    const timer = setTimeout(() => { if (!ready && code !== DEFAULT_ANIMATION) setBroken((b) => new Set(b).add(animation)); }, 2000);
    return () => { window.removeEventListener('message', onMessage); clearTimeout(timer); };
  }, [song, animation, code]);

  // Every frame: loudness, bass, highs, beats and where we are in the song → the animation.
  useEffect(() => {
    if (!song) return;
    const bins = new Uint8Array(512);
    let raf = 0;
    let bassAvg = 0;
    let lastBeat = 0;
    const tick = () => {
      const audio = audioRef.current;
      const t = audio?.currentTime ?? 0;
      let level = 0, bass = 0, high = 0, beat = false;
      if (analyser.current && audio && !audio.paused) {
        analyser.current.getByteFrequencyData(bins);
        const avg = (from: number, to: number) => { let s = 0; for (let i = from; i < to; i++) s += bins[i]; return s / (to - from) / 255; };
        level = avg(0, 256);
        bass = avg(0, 12);
        high = avg(96, 256);
        bassAvg = bassAvg * 0.95 + bass * 0.05;
        const now = performance.now();
        if (bass > 0.3 && bass > bassAvg * 1.3 && now - lastBeat > 280) { beat = true; lastBeat = now; }
      }
      const caps = song.captions;
      const idx = caps.reduce((k, c, i) => (c.start_ms <= t * 1000 ? i : k), -1);
      const lastEnd = caps.length ? caps[caps.length - 1].end_ms : 0;
      const section = !caps.length ? 'verse' : idx < 0 ? 'intro' : t * 1000 > lastEnd + 1500 ? 'outro' : lineSections[idx] ?? 'verse';
      const line = idx >= 0 && t * 1000 <= caps[idx].end_ms + 1500 ? caps[idx].text : '';
      const total = audio?.duration || song.durationMs / 1000 || 1;
      frameRef.current?.contentWindow?.postMessage({ type: 'frame', t, a: { level, bass, high, beat, section, line, progress: Math.min(1, t / total) } }, '*');
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [song, lineSections]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !song) return;
    // The analyser needs a user gesture to start (and one source per element).
    if (!analyser.current) {
      const ac = new AudioContext();
      const an = ac.createAnalyser();
      an.fftSize = 1024;
      ac.createMediaElementSource(audio).connect(an);
      an.connect(ac.destination);
      analyser.current = an;
    }
    if (audio.paused) {
      void audio.play();
      if (!counted.current) { counted.current = true; countSongPlay(song.id); }
    } else audio.pause();
  };

  // Voice off = the accompaniment alone; the position and play state carry over.
  const switchTrack = (url: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    const at = audio.currentTime;
    const wasPlaying = !audio.paused;
    audio.src = url;
    audio.addEventListener('loadedmetadata', () => { audio.currentTime = at; if (wasPlaying) void audio.play(); }, { once: true });
  };
  const toggleVoice = async () => {
    if (!song) return;
    if (!voiceOn) { switchTrack(song.audioUrl); setVoiceOn(true); return; }
    let url = song.instrumentalUrl;
    if (!url) {
      setSeparating(true);
      url = await separateVoice(song.id).catch(() => null);
      setSeparating(false);
      if (!url) return;
      setSong({ ...song, instrumentalUrl: url });
    }
    switchTrack(url);
    setVoiceOn(false);
  };

  const vote = async (v: -1 | 1) => {
    const r = await voteSong(id, v);
    if (r) setVotes(r);
  };
  const share = () => {
    const url = window.location.href;
    if (navigator.share) void navigator.share({ title: song?.title, url }).catch(() => {});
    else void navigator.clipboard?.writeText(url);
  };

  if (song === undefined) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;
  }
  if (!song) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">{t('songNotFound')}</div>;
  }

  const caps = song.captions;
  const cap = current >= 0 && time * 1000 <= caps[current].end_ms + 1500 ? caps[current] : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--ui-bg-primary)', color: 'var(--ui-text-primary)' }}>
      <header className="flex items-center gap-3 px-4 py-3 max-w-3xl mx-auto">
        <button type="button" onClick={() => navigate(-1)} aria-label={t('arcadeBack')} className="p-1 -ml-1 hover:opacity-80"><ArrowLeft size={22} /></button>
        <div className="min-w-0">
          <h1 className="text-base font-semibold leading-tight truncate">{song.title}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {t('songInspiredBy').replace('{name}', song.inspiredBy === song.inspiredArtist ? song.inspiredArtist : `${song.inspiredBy} · ${song.inspiredArtist}`)}
            {' · '}{song.creatorName ?? t('arcadeAnonymous')}
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pb-10">
        {/* Animation + captions */}
        <div className="relative rounded-xl overflow-hidden aspect-video bg-black">
          <iframe
            ref={frameRef}
            key={`${animation}-${broken.has(animation)}`}
            title={song.title}
            srcDoc={html}
            sandbox="allow-scripts"
            className="absolute inset-0 w-full h-full border-0"
          />
          {captionMode !== 'none' && caps.length > 0 && (
            <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-10 text-center pointer-events-none" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,.65))' }}>
              {captionMode === 'scroll' ? (
                <div className="h-[4.5rem] overflow-hidden">
                  <div className="transition-transform duration-500" style={{ transform: `translateY(${-Math.max(0, current - 1) * 1.5}rem)` }}>
                    {caps.map((c, i) => (
                      <p key={i} className="h-6 leading-6 text-white transition-opacity duration-300 truncate" style={{ opacity: i === current ? 1 : 0.45, fontWeight: i === current ? 600 : 400 }}>{c.text}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="min-h-[1.75rem] text-white text-lg font-semibold leading-7">
                  {cap?.words.map((w, i) => (
                    <span key={i} className="transition-opacity duration-150" style={{ opacity: w.s <= time * 1000 + 80 ? 1 : 0 }}>{w.w} </span>
                  ))}
                </p>
              )}
            </div>
          )}
          {!playing && (
            <button type="button" onClick={togglePlay} aria-label="Play" className="absolute inset-0 flex items-center justify-center">
              <span className="w-16 h-16 rounded-full flex items-center justify-center bg-black/55"><Play size={30} className="text-white ml-1" /></span>
            </button>
          )}
        </div>

        <audio
          ref={audioRef}
          src={song.audioUrl}
          crossOrigin="anonymous"
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        />

        {/* Player */}
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
          >
            {playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
          </button>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={time}
            onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }}
            className="flex-1"
            style={{ accentColor: 'var(--accent-primary)' }}
            aria-label="Seek"
          />
          <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{clock(time)} / {clock(duration)}</span>
        </div>

        {/* Animation, captions, voice */}
        <div className="mt-6 space-y-4">
          <div>
            <p className="text-sm font-semibold mb-2">{t('songAnimation')}</p>
            <div className="flex flex-wrap gap-2">
              {ANIMATIONS.map((a) => <button key={a} type="button" onClick={() => setAnimation(a)} {...pill(animation === a)}>{t(`songAnim_${a}` as never)}</button>)}
            </div>
          </div>
          {caps.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2">{t('songCaptions')}</p>
              <div className="flex flex-wrap gap-2">
                {CAPTIONS.map((c) => <button key={c} type="button" onClick={() => setCaptionMode(c)} {...pill(captionMode === c)}>{t(`songCaptions_${c}` as never)}</button>)}
              </div>
            </div>
          )}
          {song.voice && (
            <div>
              <p className="text-sm font-semibold mb-2">{t('songVoice')}</p>
              <div className="flex flex-wrap gap-2 items-center">
                <button type="button" onClick={() => { if (!voiceOn) void toggleVoice(); }} {...pill(voiceOn)}>{t('songVoiceOn')}</button>
                <button type="button" onClick={() => { if (voiceOn) void toggleVoice(); }} disabled={separating} {...pill(!voiceOn)}>
                  <span className="inline-flex items-center gap-1.5">{separating && <Loader2 size={14} className="animate-spin" />}{t('songVoiceOff')}</span>
                </button>
                {separating && <span className="text-xs text-gray-500 dark:text-gray-400">{t('songSeparating')}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Votes, share, make your own */}
        <div className="flex items-center gap-2 mt-8">
          <button type="button" onClick={() => void vote(1)} aria-label="👍" {...pill(votes.mine === 1)}><span className="inline-flex items-center gap-1.5"><ThumbsUp size={14} />{votes.up}</span></button>
          <button type="button" onClick={() => void vote(-1)} aria-label="👎" {...pill(votes.mine === -1)}><span className="inline-flex items-center gap-1.5"><ThumbsDown size={14} />{votes.down}</span></button>
          <button type="button" onClick={share} aria-label={t('songShare')} {...pill(false)}><Share2 size={14} /></button>
          <button
            type="button"
            onClick={() => navigate(`/music-results?q=${encodeURIComponent(song.inspiredBy === song.inspiredArtist ? song.inspiredArtist : `${song.inspiredBy} ${song.inspiredArtist}`)}`)}
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-80"
            style={{ color: 'var(--accent-primary)' }}
          >
            <Wand2 size={15} /> {t('songMakeYours')}
          </button>
        </div>
      </div>
    </div>
  );
}
