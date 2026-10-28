// Music mode's "listen" button, full screen: it hears the music around the phone like Shazam and
// opens the Music page of the song. It sends what it has heard at 6 s (most songs are found there)
// and, only if that missed, the whole 12 s clip. Meanwhile it says where it is, like Shazam:
// listening → searching → expanding search → this is tough (last try) → no result. The mic's voice
// processing is off: echo cancellation and noise suppression treat music as noise and wipe it out.
// In Auto it listens for anything: the clip also goes to speech-to-text, and when no song is
// recognized what the person said opens the Character with it as their first line. Talking ends
// at a pause: only then does the clip go to speech-to-text (music or noise never pause, and
// transcribing them makes up words). When nothing is heard it just closes.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AudioLines, CircleAlert, MessageCircle, X } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { transcribeAudioWithFallback } from '../../stt/transcriptionService.ts';
import { heardPage, recognizeSong, songPage, spokenWords, TRY_AT_MS, type HeardSong, type Recognition } from './songRecognition.ts';

type Stage = 'listening' | 'searching' | 'expanding' | 'tough' | 'found' | 'heard' | 'missed' | 'denied' | 'limit' | 'signin' | 'error';

// What the screen says while no song is found yet: searching once the first try goes out, the
// last try (the full clip) is the tough one.
const SAYS_AT: [number, Stage][] = [[TRY_AT_MS[0], 'searching'], [(TRY_AT_MS[0] + TRY_AT_MS[1]) / 2, 'expanding'], [TRY_AT_MS[1], 'tough']];

interface Props {
  /** 'anything' (Auto): a song or someone talking; 'song' (Music): only songs. */
  listenFor?: 'song' | 'anything';
  onClose: () => void;
  onNeedSignIn: () => void;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const locale = () => navigator.language.split('-')[0] || 'en';

/** Resolves once there was sound and then a quiet second: someone finished talking (music rarely pauses). */
function pauseAfterSound(stream: MediaStream, isOver: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    ctx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let heard = false, quietSince = 0;
    const tick = setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      const loud = Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length) > 0.02;
      if (loud) { heard = true; quietSince = 0; } else if (heard && !quietSince) quietSince = Date.now();
      const paused = heard && quietSince > 0 && Date.now() - quietSince >= 1000;
      if (paused || isOver()) { clearInterval(tick); void ctx.close(); }
      if (paused) resolve();
    }, 100);
  });
}

export default function SongListener({ listenFor = 'song', onClose, onNeedSignIn }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('listening');
  const [song, setSong] = useState<HeardSong | null>(null);
  const [said, setSaid] = useState('');
  const [round, setRound] = useState(0); // "Try again" listens anew
  const stopRef = useRef<() => void>(() => {});
  const openTimer = useRef<ReturnType<typeof setTimeout>>();
  const closeRef = useRef(onClose); // a new function each parent render must not restart the listening
  closeRef.current = onClose;

  useEffect(() => {
    let over = false;
    void (async () => {
      setStage('listening'); setSong(null); setSaid('');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      } catch {
        if (!over) setStage('denied');
        return;
      }
      if (over) { stream.getTracks().forEach((track) => track.stop()); return; } // closed while asking for the mic
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      const stopped = new Promise((r) => { recorder.onstop = r; });
      const stop = () => {
        if (recorder.state !== 'inactive') recorder.stop();
        stream.getTracks().forEach((track) => track.stop());
      };
      stopRef.current = () => { over = true; stop(); };
      recorder.start(1000);
      const anything = listenFor === 'anything';
      const talked = anything ? pauseAfterSound(stream, () => over) : new Promise<void>(() => {});
      SAYS_AT.forEach(([at, next]) => setTimeout(() => { if (!over) setStage(next); }, at));

      // The first answer that settles it (a song, or no more tries today) wins.
      const finish = (r: Recognition) => {
        if (over) return;
        over = true;
        stop();
        if (r.status === 'found') {
          // The cover grows into place once it has loaded (or after 0.8 s without it).
          const cover = new Image();
          if (r.song.coverUrl) cover.src = r.song.coverUrl;
          void Promise.race([cover.decode().catch(() => {}), wait(800)]).then(() => {
            setSong(r.song); setStage('found');
            openTimer.current = setTimeout(() => navigate(songPage(r.song)), 1400);
          });
        } else setStage(r.status === 'limit' ? (r.signIn ? 'signin' : 'limit') : r.status);
      };
      const clip = () => new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const tries: Promise<Recognition>[] = [];
      let speech: Promise<string> = Promise.resolve('');
      let elapsed = 0;
      for (const [i, at] of TRY_AT_MS.entries()) {
        const paused = await Promise.race([wait(at - elapsed).then(() => false), talked.then(() => true)]);
        elapsed = at;
        if (over) return;
        const last = paused || i === TRY_AT_MS.length - 1;
        if (last) { stop(); await stopped; if (paused) setStage('searching'); }
        const heard = clip();
        // In Auto a daily limit on songs doesn't end it: what was said can still go to the Character.
        tries.push(recognizeSong(heard).then((r) => { if (r.status === 'found' || (r.status === 'limit' && !anything)) finish(r); return r; }));
        if (last) {
          if (anything && paused) speech = transcribeAudioWithFallback(heard, locale()).catch(() => '');
          break;
        }
      }
      const results = await Promise.all(tries);
      const words = spokenWords(await speech);
      if (over) return;
      if (anything) {
        const page = heardPage(null, words);
        const limit = results.find((r) => r.status === 'limit');
        if (page) {
          over = true;
          setSaid(words); setStage('heard');
          openTimer.current = setTimeout(() => navigate(page), 1200);
        } else if (limit) finish(limit);
        else { over = true; closeRef.current(); } // nothing heard: back to the box, ready to retry or type
        return;
      }
      finish(results.every((r) => r.status === 'error') ? { status: 'error' } : { status: 'missed' });
    })();
    return () => { over = true; stopRef.current(); };
  }, [round, navigate, listenFor]);

  const close = () => { stopRef.current(); clearTimeout(openTimer.current); onClose(); };
  const busy = stage === 'listening' || stage === 'searching' || stage === 'expanding' || stage === 'tough';
  const title = {
    listening: listenFor === 'anything' ? t('listenAnything') : t('musicListening'),
    searching: t('musicSearching'),
    expanding: t('musicExpanding'),
    tough: t('musicTough'),
    found: song?.title ?? '',
    heard: `“${said}”`,
    missed: t('musicNotHeard'),
    denied: t('musicMicDenied'),
    limit: t('musicListenLimit'),
    signin: t('musicListenSignIn'),
    error: t('musicListenError'),
  }[stage];
  const hint = {
    listening: listenFor === 'anything' ? t('listenAnythingHint') : t('musicListeningHint'),
    searching: t('musicSearchingHint'),
    expanding: t('musicExpandingHint'),
    tough: t('musicToughHint'),
    found: song?.artist ?? '',
    missed: t('musicNotHeardHint'),
  }[stage as string] ?? '';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={listenFor === 'anything' ? t('listenAnything') : t('musicListen')}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: 'var(--ui-bg-primary)', color: 'var(--ui-text-primary)' }}
    >
      <button
        type="button"
        onClick={close}
        aria-label={t('close')}
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ color: 'var(--ui-text-secondary)' }}
      >
        <X size={20} />
      </button>

      <div className="relative w-40 h-40 flex items-center justify-center">
        {stage === 'found' && song?.coverUrl ? (
          <img src={song.coverUrl} alt="" className="song-found w-40 h-40 rounded-xl object-cover shadow-lg" />
        ) : (
          <>
            {busy && [0, 1, 2].map((i) => (
              <span key={i} aria-hidden className="song-ring absolute inset-0 rounded-full" style={{ animationDelay: `${i * 0.8}s` }} />
            ))}
            {busy || stage === 'found' || stage === 'heard' ? (
              <span
                className={`relative w-28 h-28 rounded-full flex items-center justify-center${stage === 'heard' ? ' song-found' : ''}`}
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
              >
                {stage === 'heard' ? <MessageCircle size={48} /> : <AudioLines size={48} className={busy ? 'song-bars' : ''} />}
              </span>
            ) : (
              // No result (or no mic, no tries left): a quiet sign instead of the accent button.
              <span
                className="relative w-28 h-28 rounded-full flex items-center justify-center border"
                style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)', color: 'var(--ui-text-secondary)' }}
              >
                <CircleAlert size={48} />
              </span>
            )}
          </>
        )}
      </div>

      <p className="mt-8 text-xl font-semibold text-center" aria-live="polite">{title}</p>
      {hint && <p className="mt-2 text-sm text-center" style={{ color: 'var(--ui-text-secondary)' }}>{hint}</p>}

      {(stage === 'missed' || stage === 'error') && (
        <button
          type="button"
          onClick={() => setRound((n) => n + 1)}
          className="mt-6 px-5 py-2.5 rounded-full text-sm font-semibold"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
        >
          {t('musicTryAgain')}
        </button>
      )}
      {stage === 'signin' && (
        <button
          type="button"
          onClick={() => { close(); onNeedSignIn(); }}
          className="mt-6 px-5 py-2.5 rounded-full text-sm font-semibold"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
        >
          {t('signIn')}
        </button>
      )}
    </div>,
    document.body,
  );
}
