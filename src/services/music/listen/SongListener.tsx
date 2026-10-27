// Music mode's "listen" button, full screen: it hears the music around the phone like Shazam and
// opens the Music page of the song. It sends what it has heard at 6 s (most songs are found there)
// and, only if that missed, the whole 12 s clip. Meanwhile it says where it is, like Shazam:
// listening → searching → expanding search → this is tough (last try) → no result. The mic's voice
// processing is off: echo cancellation and noise suppression treat music as noise and wipe it out.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AudioLines, CircleAlert, X } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { recognizeSong, songPage, TRY_AT_MS, type HeardSong, type Recognition } from './songRecognition.ts';

type Stage = 'listening' | 'searching' | 'expanding' | 'tough' | 'found' | 'missed' | 'denied' | 'limit' | 'signin' | 'error';

// What the screen says while no song is found yet: searching once the first try goes out, the
// last try (the full clip) is the tough one.
const SAYS_AT: [number, Stage][] = [[TRY_AT_MS[0], 'searching'], [(TRY_AT_MS[0] + TRY_AT_MS[1]) / 2, 'expanding'], [TRY_AT_MS[1], 'tough']];

interface Props {
  onClose: () => void;
  onNeedSignIn: () => void;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function SongListener({ onClose, onNeedSignIn }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('listening');
  const [song, setSong] = useState<HeardSong | null>(null);
  const [round, setRound] = useState(0); // "Try again" listens anew
  const stopRef = useRef<() => void>(() => {});
  const openTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let over = false;
    void (async () => {
      setStage('listening'); setSong(null);
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
      let elapsed = 0;
      for (const [i, at] of TRY_AT_MS.entries()) {
        await wait(at - elapsed);
        elapsed = at;
        if (over) return;
        const last = i === TRY_AT_MS.length - 1;
        if (last) { stop(); await stopped; }
        tries.push(recognizeSong(clip()).then((r) => { if (r.status === 'found' || r.status === 'limit') finish(r); return r; }));
      }
      const results = await Promise.all(tries);
      finish(results.every((r) => r.status === 'error') ? { status: 'error' } : { status: 'missed' });
    })();
    return () => { over = true; stopRef.current(); };
  }, [round, navigate]);

  const close = () => { stopRef.current(); clearTimeout(openTimer.current); onClose(); };
  const busy = stage === 'listening' || stage === 'searching' || stage === 'expanding' || stage === 'tough';
  const title = {
    listening: t('musicListening'),
    searching: t('musicSearching'),
    expanding: t('musicExpanding'),
    tough: t('musicTough'),
    found: song?.title ?? '',
    missed: t('musicNotHeard'),
    denied: t('musicMicDenied'),
    limit: t('musicListenLimit'),
    signin: t('musicListenSignIn'),
    error: t('musicListenError'),
  }[stage];
  const hint = {
    listening: t('musicListeningHint'),
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
      aria-label={t('musicListen')}
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
            {busy || stage === 'found' ? (
              <span
                className="relative w-28 h-28 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
              >
                <AudioLines size={48} className={busy ? 'song-bars' : ''} />
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
