// Clips on the Video page (same template as the other types: player, then share, overview and
// Continue exploring from the page). A clip already found for the question opens at once and
// free; a new one costs 1 Pro Credit (caps per day like the Experience). The chat bubble pauses
// the video and the viewer asks; the answer plays over the player, labelled as AI generated, and
// the original continues (1 Pro Credit per question).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Clapperboard, ExternalLink, Loader2, Maximize, MessageCircle, Mic, Minimize, Pause, Play, Send, Sparkles, Volume1, Volume2, VolumeX, X } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import CuriosLogo from '../../../components/common/CuriosLogo.tsx';
import { useLanguage } from '../../../contexts/LanguageContext.tsx';
import { useSession } from '../../../hooks/useSession.ts';
import { useProCredits } from '../../../providers/ProCreditsProvider.tsx';
import { findRelatedPosters } from '../cinematic/cinematicPlan.ts';
import { tts } from '../audio/paragraphNarrator.ts';
import { loadNarratorVoice } from '../audio/narratorPrefs.ts';
import { VOICES } from '../../character/voices.ts';
import { claimClip, clipKey, findClip, guestClips, makeClip, planClip, rememberGuestClip, type Clip, type ClipStage } from './clipPlan.ts';
import { directAnswer, makeShot, openSegment, recordAsk, startAsk } from './clipAsk.ts';
import { canCaptureScreen, frameAt, lastSeconds, screenRegion, videoFrame } from './clipFrames.ts';

export interface ClipInfo {
  title: string;
  overview: string;
  related: string[];
  relatedImages?: (string | undefined)[];
  thumbnail: string;
  source: { title: string; url: string; snippet: string };
}

interface Props {
  question: string;
  /** The page's tab: the player on Video, the transcript on Timeline. */
  tab: 'video' | 'timeline' | 'hidden';
  context: { title: string; snippet: string }[] | null;
  belowPlayer?: ReactNode;
  onReady: (info: ClipInfo) => void;
  onWatch: () => void;
  onNeedSignIn: () => void;
}

type Stage = 'looking' | 'nocredits' | 'designing' | ClipStage | 'ready' | 'limit' | 'failed';
type Turn = { question: string; answer?: string; state: 'thinking' | 'rendering' | 'done' | 'failed' | 'limit' };

// ── YouTube IFrame API (loaded once) ────────────────────────────────────────────────────────
interface YTPlayer { playVideo(): void; pauseVideo(): void; seekTo(s: number, allow: boolean): void; getCurrentTime(): number; getIframe(): HTMLIFrameElement; destroy(): void }
type YTNamespace = { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer };
let ytApi: Promise<YTNamespace> | null = null;
function loadYouTube(): Promise<YTNamespace> {
  const w = window as unknown as { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };
  if (w.YT?.Player) return Promise.resolve(w.YT);
  ytApi ??= new Promise((resolve) => {
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => { previous?.(); resolve(w.YT!); };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
  return ytApi;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function ClipScene({ question, tab, context, belowPlayer, onReady, onWatch, onNeedSignIn }: Props) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { session, isLoading: sessionLoading } = useSession();
  const { requestProAccess, promptUpgrade, tier, remaining } = useProCredits();
  // One charge per clip, even if the page re-runs (web facts arriving, signing in midway).
  const chargedRef = useRef<string | null>(null);
  const [stage, setStage] = useState<Stage>('looking');
  const [clip, setClip] = useState<Clip | null>(null);
  const cb = useRef({ onReady });
  cb.current = { onReady };
  const signedIn = Boolean(session?.user);

  useEffect(() => {
    if (sessionLoading || !question.trim()) return;
    const controller = new AbortController();
    const key = clipKey(question);
    const show = (found: Clip) => {
      setClip(found);
      setStage('ready');
      const related = found.related.map((r) => r.question);
      const info: ClipInfo = {
        title: found.title, overview: found.overview || found.why, related, thumbnail: found.thumbnail,
        source: { title: found.title, url: found.sourceUrl || (found.videoId ? `https://www.youtube.com/watch?v=${found.videoId}` : ''), snippet: found.credit },
      };
      cb.current.onReady(info);
      void findRelatedPosters({ related, relatedSearch: found.related.map((r) => r.search || '') }, [])
        .then((relatedImages) => { if (!controller.signal.aborted) cb.current.onReady({ ...info, relatedImages }); });
    };
    (async () => {
      const found = await findClip(key).catch(() => ({ clip: null, left: 1 }));
      if (controller.signal.aborted) return;
      if (found.clip) {
        // A guest's clip, now signed in → it's saved to their account.
        if (signedIn && !found.clip.owned && guestClips().includes(key)) {
          void claimClip(key).then(() => rememberGuestClip(key, false), () => undefined);
        }
        return show(found.clip);
      }
      if (context === null) return; // wait for the web facts (the effect runs again)
      // Today's cap for this tier (guest 1, free 3, Pro 10) — before any credit is charged.
      if (chargedRef.current !== key && found.left <= 0) return setStage(tier === 'pro' ? 'limit' : 'nocredits');
      if (chargedRef.current !== key) {
        if (!(await requestProAccess())) return setStage('nocredits');
        chargedRef.current = key;
        if (!signedIn) rememberGuestClip(key);
      }
      if (controller.signal.aborted) return;
      setStage('designing');
      const plan = await planClip(question, context);
      if (controller.signal.aborted) return;
      show(await makeClip(key, question, plan, controller.signal, (s) => { if (!controller.signal.aborted) setStage(s); }));
    })().catch((err) => {
      if (controller.signal.aborted) return;
      setStage(String(err instanceof Error ? err.message : err).includes('daily_limit') ? 'limit' : 'failed');
    });
    return () => controller.abort();
    // requestProAccess is stable enough; re-running on it would re-charge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, signedIn, sessionLoading, context === null]);

  // ── The player: YouTube (IFrame API) or our MP4 ──────────────────────────────────────────
  const ytHostRef = useRef<HTMLDivElement>(null);
  const ytRef = useRef<YTPlayer | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerBoxRef = useRef<HTMLDivElement>(null);
  const [sceneSize, setSceneSize] = useState({ w: 16, h: 9 });
  // Player controls, YouTube style (as in Cinematic): play, volume with a hover slider, fullscreen.
  // The volume also drives the generated answers (their voices and the narrator).
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [soundOff, setSoundOff] = useState(false);
  const level = soundOff ? 0 : volume;
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => { if (videoRef.current) videoRef.current.volume = level; if (audioRef.current) audioRef.current.volume = level; });
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === playerBoxRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = () => {
    const el = playerBoxRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen().catch(() => setFullscreen((f) => !f));
    else setFullscreen((f) => !f); // iPhone: no element fullscreen → fill the window
  };
  useEffect(() => {
    if (!clip || clip.source !== 'youtube' || !clip.videoId || !ytHostRef.current) return;
    let player: YTPlayer | null = null;
    let gone = false;
    void loadYouTube().then((YT) => {
      if (gone || !ytHostRef.current) return;
      const host = document.createElement('div');
      ytHostRef.current.appendChild(host);
      player = new YT.Player(host, {
        videoId: clip.videoId, width: '100%', height: '100%',
        playerVars: { start: Math.floor(clip.start), end: Math.ceil(clip.end), playsinline: 1, rel: 0, modestbranding: 1, autoplay: 1 },
      });
      ytRef.current = player;
    });
    return () => { gone = true; player?.destroy(); ytRef.current = null; };
  }, [clip]);

  const player = {
    time: () => (clip?.source === 'youtube' ? ytRef.current?.getCurrentTime() ?? clip.start : videoRef.current?.currentTime ?? 0),
    pause: () => (clip?.source === 'youtube' ? ytRef.current?.pauseVideo() : videoRef.current?.pause()),
    play: () => (clip?.source === 'youtube' ? ytRef.current?.playVideo() : void videoRef.current?.play().catch(() => undefined)),
    seek: (s: number) => {
      if (clip?.source === 'youtube') { ytRef.current?.seekTo(s, true); ytRef.current?.playVideo(); }
      else if (videoRef.current) { videoRef.current.currentTime = s; void videoRef.current.play().catch(() => undefined); }
    },
  };

  // ── Talk to the video ─────────────────────────────────────────────────────────────────────
  const [asking, setAsking] = useState(false);
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answerShots, setAnswerShots] = useState<{ urls: (string | null)[]; caption: string; narrated: boolean } | null>(null);
  const [listening, setListening] = useState(false);
  const busy = turns.some((x) => x.state === 'thinking' || x.state === 'rendering');
  const update = (i: number, patch: Partial<Turn>) => setTurns((all) => all.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  // YouTube: the paused 5 s are cut on the server while the viewer types the question.
  const segmentRef = useRef<{ at: number; url: Promise<string | null> } | null>(null);
  const segmentAt = (at: number) => {
    if (clip?.source !== 'youtube' || !clip.videoId) return Promise.resolve(null);
    if (!segmentRef.current || Math.abs(segmentRef.current.at - at) > 0.5) segmentRef.current = { at, url: openSegment(clip.videoId, at) };
    return segmentRef.current.url;
  };
  const openAsk = () => {
    player.pause();
    setAsking(true);
    void segmentAt(player.time());
  };

  const listen = () => {
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Recognition = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Recognition) return;
    const rec = new Recognition();
    rec.lang = currentLanguage.code || navigator.language;
    rec.interimResults = false;
    rec.onresult = (e) => setDraft((d) => `${d} ${e.results[0][0].transcript}`.trim());
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const ask = async () => {
    const q = draft.trim();
    if (!clip || !q || busy) return;
    const i = turns.length;
    setTurns((all) => [...all, { question: q, state: 'thinking' }]);
    setDraft('');
    player.pause();
    const at = player.time();
    if (!(await requestProAccess())) { update(i, { state: 'failed', answer: t('vidClipAskNoCredits') }); return; }
    try {
      // The paused moment: our MP4's frame + last 5 s; YouTube → the 5 s cut on the server (Tunelio /
      // VidKraken) and its last frame, else the shared tab (desktop), else the server recreates it.
      const ownVideo = clip.source === 'scene' ? videoRef.current : null;
      let frame: string | null = null;
      let last5: string | null = null;
      if (ownVideo) {
        [frame, last5] = await Promise.all([videoFrame(ownVideo, true).catch(() => null), clip.fiction ? lastSeconds(clip.videoUrl!, at, 5, true) : Promise.resolve(null)]);
      } else {
        const segment = await segmentAt(at);
        if (segment) { frame = await frameAt(segment, Infinity); last5 = clip.fiction ? segment : null; }
        if (!frame && playerBoxRef.current) frame = await screenRegion(playerBoxRef.current);
      }
      const start = await startAsk(clip.id, at, q, frame, last5);
      const plan = await directAnswer(clip, at, q, start.scene);
      update(i, { answer: plan.answer, state: 'rendering' });
      const narrated = plan.voice === 'narrator';
      const voiceId = loadNarratorVoice(session?.user);
      const audio = narrated
        ? tts(plan.answer, voiceId, VOICES.find((v) => v.id === voiceId)?.gender === 'male' ? 'male' : 'female', new AbortController().signal).catch(() => null)
        : Promise.resolve(null);
      const urls = await Promise.all(plan.shots.map((s, n) => makeShot(start, s, n, !narrated)));
      if (!urls.some(Boolean)) throw new Error('no shots');
      const sound = await audio;
      if (sound) narrationRef.current = URL.createObjectURL(new Blob([sound], { type: 'audio/mpeg' }));
      setAnswerShots({ urls, caption: plan.answer, narrated });
      update(i, { state: 'done' });
      void recordAsk(start.questionId, { text: plan.answer, voice: plan.voice, shots: urls });
    } catch (err) {
      const limit = String(err instanceof Error ? err.message : err).includes('daily_limit');
      update(i, { state: limit ? 'limit' : 'failed', answer: limit ? t('vidClipAskLimit') : t('vidClipAskFailed') });
      setAsking(false);
      player.play();
    }
  };

  // The answer plays over the player; narration (real people) runs across the shots.
  const narrationRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [shotIndex, setShotIndex] = useState(0);
  const finishAnswer = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (narrationRef.current) URL.revokeObjectURL(narrationRef.current);
    narrationRef.current = null;
    setAnswerShots(null);
    setShotIndex(0);
    setAsking(false);
    player.play(); // the original continues
  };
  useEffect(() => {
    if (!answerShots) return;
    if (answerShots.narrated && narrationRef.current) {
      const a = new Audio(narrationRef.current);
      audioRef.current = a;
      a.onended = finishAnswer;
      void a.play().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerShots]);
  const playable = answerShots?.urls.filter((u): u is string => Boolean(u)) ?? [];
  const nextShot = () => {
    if (shotIndex + 1 < playable.length) setShotIndex(shotIndex + 1);
    else if (answerShots?.narrated && audioRef.current && !audioRef.current.ended) setShotIndex(0); // narration still going
    else finishAnswer();
  };

  if (tab === 'hidden') return null;

  const status = stage === 'looking' || stage === 'designing' ? t('vidClipFinding')
    : stage === 'scene' ? t('vidClipScene')
    : stage === 'youtube' ? t('vidClipYoutube')
    : stage === 'picking' ? t('vidClipPicking')
    : stage === 'limit' ? t('vidClipLimit')
    : stage === 'failed' ? t('vidClipFailed')
    : null;
  const noCredits = tier === 'guest' ? t('vidClipNoCreditsGuest') : tier === 'free' ? t('vidClipNoCreditsFree') : t('vidTourNoCreditsPro');
  const offerSave = stage === 'ready' && !signedIn && remaining <= 0 && guestClips().includes(clipKey(question));
  const segment = clip ? clip.transcript.filter((l) => l.t >= clip.start - 1 && l.t <= clip.end) : [];

  return (
    <>
      {/* Timeline: the segment's transcript; a line jumps the player there. */}
      {tab === 'timeline' && (
        <ol className="space-y-2">
          {segment.map((l) => (
            <li key={`${l.t}-${l.text}`}>
              <button type="button" onClick={() => { player.seek(l.t); onWatch(); }} className="w-full flex gap-3 p-3 rounded-xl text-left hover:opacity-90" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
                <span className="text-xs font-semibold tabular-nums pt-0.5" style={{ color: 'var(--accent-primary)' }}>{mmss(l.t)}</span>
                <span className="text-sm">{l.text}</span>
              </button>
            </li>
          ))}
          {!segment.length && <li className="text-sm" style={{ color: 'var(--ui-text-muted)' }}>{clip ? t('vidNoSources') : t('vidClipFinding')}</li>}
        </ol>
      )}
      <div className={tab === 'video' ? '' : 'hidden'}>
        <div ref={playerBoxRef} className={`relative overflow-hidden bg-black ${fullscreen && !document.fullscreenElement ? 'fixed inset-0 z-[200]' : 'rounded-xl aspect-video'}`}>
          {stage === 'ready' && clip ? (
            <>
              {clip.source === 'youtube'
                ? <div ref={ytHostRef} className="absolute inset-0 [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full" />
                : (
                  // find-scene stamps its name in the top 10 %: the clip is shown from below it, with our mark.
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="relative overflow-hidden"
                      style={{ aspectRatio: `${sceneSize.w} / ${sceneSize.h * 0.9}`, ...(sceneSize.w / (sceneSize.h * 0.9) >= 16 / 9 ? { width: '100%' } : { height: '100%' }) }}
                    >
                      <video
                        ref={videoRef}
                        src={clip.videoUrl ?? undefined}
                        crossOrigin="anonymous"
                        playsInline
                        autoPlay
                        onPlay={() => setPlaying(true)}
                        onPause={() => setPlaying(false)}
                        onClick={() => player[playing ? 'pause' : 'play']()}
                        onLoadedMetadata={(e) => setSceneSize({ w: e.currentTarget.videoWidth || 16, h: e.currentTarget.videoHeight || 9 })}
                        className="absolute left-0 bottom-0 w-full h-auto"
                      />
                      <span className="absolute top-2 left-2 pointer-events-none" style={{ opacity: 0.3 }}>
                        <CuriosLogo size={18} frameColor="#FFFFFF" colorOverride="#FFFFFF" />
                      </span>
                    </div>
                  </div>
                )}
              {answerShots && playable.length > 0 && (
                <div className="absolute inset-0 z-10 bg-black">
                  <video
                    key={`${shotIndex}-${playable[shotIndex]}`}
                    src={playable[shotIndex]}
                    autoPlay
                    playsInline
                    muted={answerShots.narrated || level === 0}
                    ref={(el) => { if (el) el.volume = level; }}
                    onEnded={nextShot}
                    onError={nextShot}
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                    <Sparkles size={12} /> {t('vidClipAiLabel')}
                  </span>
                  <p className="absolute inset-x-3 bottom-3 text-center text-xs sm:text-base text-white line-clamp-3" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>{answerShots.caption}</p>
                  <button type="button" onClick={finishAnswer} className="absolute top-3 right-3 p-1.5 rounded-full text-white" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} aria-label={t('vidClipResume')} title={t('vidClipResume')}>
                    <X size={16} />
                  </button>
                </div>
              )}
              {/* Scene clips: our own control bar (YouTube brings its own). */}
              {clip.source === 'scene' && !answerShots && (
                <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-1 px-2 py-1 text-white" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}>
                  <button type="button" onClick={() => player[playing ? 'pause' : 'play']()} aria-label={playing ? t('vidPause') : t('vidPlay')} title={playing ? t('vidPause') : t('vidPlay')} className="p-2 hover:opacity-80">
                    {playing ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <div className="group flex items-center">
                    <button type="button" onClick={() => setSoundOff((m) => !m)} aria-label={level === 0 ? t('vidUnmute') : t('vidMute')} title={level === 0 ? t('vidUnmute') : t('vidMute')} className="p-2 hover:opacity-80">
                      {level === 0 ? <VolumeX size={20} /> : level < 0.5 ? <Volume1 size={20} /> : <Volume2 size={20} />}
                    </button>
                    {/* The slider opens on hover, like YouTube (touch screens use the mute button). */}
                    <input
                      type="range" min={0} max={1} step={0.05} value={level}
                      onChange={(e) => { setVolume(Number(e.target.value)); setSoundOff(Number(e.target.value) === 0); }}
                      aria-label={t('vidVolume')} title={t('vidVolume')}
                      className="w-0 opacity-0 group-hover:w-20 group-hover:opacity-100 focus:w-20 focus:opacity-100 transition-all duration-200 accent-white cursor-pointer"
                    />
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={fullscreen ? t('vidExitFullscreen') : t('vidFullscreen')}
                title={fullscreen ? t('vidExitFullscreen') : t('vidFullscreen')}
                className={`absolute z-20 p-2 rounded-full text-white hover:opacity-80 ${clip.source === 'scene' && !answerShots ? 'bottom-1 right-2' : 'top-3 right-14 sm:right-auto sm:left-1/2 sm:-translate-x-1/2'}`}
                style={clip.source === 'scene' && !answerShots ? undefined : { backgroundColor: 'rgba(0,0,0,0.55)' }}
              >
                {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
              {!answerShots && (
                <button
                  type="button"
                  onClick={openAsk}
                  className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold shadow-lg"
                  style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
                  aria-label={t('vidClipAsk')}
                  title={t('vidClipAsk')}
                >
                  <MessageCircle size={16} /> <span className="hidden sm:inline">{t('vidClipAsk')}</span>
                </button>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white/80">
              {stage === 'nocredits' ? (
                <>
                  <Clapperboard size={32} />
                  <p className="text-sm max-w-sm">{noCredits}</p>
                  {tier !== 'pro' && (
                    <button type="button" onClick={promptUpgrade} className="px-4 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}>
                      {tier === 'guest' ? t('vidSignUp') : t('vidGoPro')}
                    </button>
                  )}
                </>
              ) : (
                <>
                  {stage === 'limit' || stage === 'failed' ? <Clapperboard size={28} /> : <Loader2 size={28} className="animate-spin" />}
                  {status && <span className="text-sm">{status}</span>}
                </>
              )}
            </div>
          )}
        </div>

        {clip && stage === 'ready' && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span style={{ color: 'var(--ui-text-muted)' }}>{clip.credit}</span>
            {clip.sourceUrl && (
              <a href={clip.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}>
                {t('vidClipSource')} <ExternalLink size={13} />
              </a>
            )}
            {clip.moments.map((m) => (
              <button key={`${m.t}-${m.label}`} type="button" onClick={() => player.seek(m.t)} className="px-2.5 py-1 rounded-full border text-xs" style={{ borderColor: 'var(--ui-border-default)', color: 'var(--ui-text-primary)' }}>
                {mmss(m.t)} · {m.label}
              </button>
            ))}
          </div>
        )}

        {/* The conversation with the video */}
        {clip && (asking || turns.length > 0) && (
          <div className="mt-4 rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
            {turns.map((turn, i) => (
              <div key={i} className="space-y-1">
                <p className="text-sm font-semibold">{turn.question}</p>
                {turn.answer && <p className="text-sm" style={{ color: turn.state === 'failed' || turn.state === 'limit' ? 'var(--ui-text-muted)' : 'var(--ui-text-secondary)' }}>{turn.answer}</p>}
                {(turn.state === 'thinking' || turn.state === 'rendering') && (
                  <p className="flex items-center gap-2 text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                    <Loader2 size={12} className="animate-spin" /> {turn.state === 'thinking' ? t('vidClipThinking') : t('vidClipRendering')}
                  </p>
                )}
              </div>
            ))}
            {asking && !busy && (
              <form onSubmit={(e) => { e.preventDefault(); void ask(); }} className="flex items-center gap-2">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t('vidClipAskPlaceholder')}
                  className="flex-1 min-w-0 h-10 px-3 rounded-full border bg-transparent text-sm outline-none"
                  style={{ borderColor: 'var(--ui-border-default)', color: 'var(--ui-text-primary)' }}
                />
                {'webkitSpeechRecognition' in window || 'SpeechRecognition' in window ? (
                  <button type="button" onClick={listen} disabled={listening} className="h-10 w-10 inline-flex items-center justify-center rounded-full border" style={{ borderColor: 'var(--ui-border-default)', color: listening ? 'var(--accent-primary)' : 'var(--ui-text-primary)' }} aria-label={t('vidClipListen')} title={t('vidClipListen')}>
                    <Mic size={16} />
                  </button>
                ) : null}
                <button type="submit" disabled={!draft.trim()} className="h-10 w-10 inline-flex items-center justify-center rounded-full disabled:opacity-50" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }} aria-label={t('vidClipSend')} title={t('vidClipSend')}>
                  <Send size={16} />
                </button>
              </form>
            )}
            {asking && !busy && (
              <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                {t('vidClipAskCost')}{clip.source === 'youtube' && canCaptureScreen() ? ` ${t('vidClipScreenHint')}` : ''}
              </p>
            )}
          </div>
        )}

        {offerSave && (
          <div className="mt-4 rounded-xl p-4 flex flex-wrap items-center gap-3" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
            <Clapperboard size={18} style={{ color: 'var(--accent-primary)' }} />
            <p className="text-sm flex-1 min-w-[12rem]">{t('vidClipSaveGuest')}</p>
            <button type="button" onClick={onNeedSignIn} className="px-4 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}>
              {t('vidSignUp')}
            </button>
          </div>
        )}
        {belowPlayer}
      </div>
    </>
  );
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: { 0: { transcript: string } }[] }) => void;
  onend: () => void;
  start(): void;
}
