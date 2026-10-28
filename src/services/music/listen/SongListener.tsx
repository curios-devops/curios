// Music mode's "listen" button, full screen: it hears the music around the phone like Shazam and
// opens the Music page of the song. It sends what it has heard at 6 s (most songs are found there)
// and, only if that missed, the whole 12 s clip. Meanwhile it says where it is, like Shazam:
// listening → searching → expanding search → this is tough (last try) → no result. The mic's voice
// processing is off: echo cancellation and noise suppression treat music as noise and wipe it out.
// In Auto it listens for anything: when someone talks and pauses, the clip goes to song
// recognition and speech-to-text at once and the first that recognizes something wins — a song
// opens its page, words open the Character with them as the first line. Only a pause sends the
// clip to speech-to-text (music or noise never pause, and transcribing them makes up words).
// Two buttons narrow it: songs only, or speech only — that one goes to the Character right away,
// so the presenter connects while it listens there ('speech': the words go to onHeard). When
// nothing is heard it just closes.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AudioLines, CircleAlert, MessageCircle, Music, X } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { transcribeAudioWithFallback } from '../../stt/transcriptionService.ts';
import { listenLanguage } from '../../stt/language.ts';
import { useLanguage } from '../../../contexts/LanguageContext.tsx';
import { heardPage, recognizeSong, songPage, spokenWords, TRY_AT_MS, type HeardSong, type Recognition } from './songRecognition.ts';

type Stage = 'listening' | 'searching' | 'expanding' | 'tough' | 'found' | 'heard' | 'missed' | 'denied' | 'limit' | 'signin' | 'error';

// What the screen says while no song is found yet: searching once the first try goes out, the
// last try (the full clip) is the tough one.
const SAYS_AT: [number, Stage][] = [[TRY_AT_MS[0], 'searching'], [(TRY_AT_MS[0] + TRY_AT_MS[1]) / 2, 'expanding'], [TRY_AT_MS[1], 'tough']];

interface Props {
  /** 'anything' (Auto): a song or someone talking; 'song' (Music): only songs; 'speech' (Character): only words. */
  listenFor?: 'song' | 'anything' | 'speech';
  /** 'speech': what was said (the listener stays, showing it, until the parent closes it). */
  onHeard?: (text: string) => void;
  onClose: () => void;
  onNeedSignIn?: () => void;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resolves once there was sound and then a quiet second: someone finished talking (music rarely pauses). */
function pauseAfterSound(stream: MediaStream, isOver: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const ctx = new AudioContext();
    void ctx.resume(); // it can start suspended (no tap counted yet) and would read silence forever
    const analyser = ctx.createAnalyser();
    ctx.createMediaStreamSource(stream).connect(analyser);
    // Chrome may not pull a mic source that leads nowhere (the analyser then reads silence): end it
    // at the speakers, muted.
    const mute = ctx.createGain();
    mute.gain.value = 0;
    analyser.connect(mute).connect(ctx.destination);
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

export default function SongListener({ listenFor = 'song', onHeard, onClose, onNeedSignIn }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentLanguage, autoDetect } = useLanguage();
  const sttLanguage = useRef('auto');
  sttLanguage.current = listenLanguage(autoDetect, currentLanguage?.code);
  const [stage, setStage] = useState<Stage>('listening');
  const [song, setSong] = useState<HeardSong | null>(null);
  const [said, setSaid] = useState('');
  const [round, setRound] = useState(0); // "Try again" listens anew
  const stopRef = useRef<() => void>(() => {});
  const openTimer = useRef<ReturnType<typeof setTimeout>>();
  const closeRef = useRef(onClose); // a new function each parent render must not restart the listening
  closeRef.current = onClose;
  const heardRef = useRef(onHeard);
  heardRef.current = onHeard;
  const [onlySong, setOnlySong] = useState(false); // Auto narrowed to songs
  const onlySongRef = useRef(false);

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
      const speechOnly = listenFor === 'speech';
      const wantsSongs = () => !speechOnly;
      const wantsSpeech = () => speechOnly || (listenFor === 'anything' && !onlySongRef.current);
      const songsOnly = () => listenFor === 'song' || onlySongRef.current;
      const never = new Promise<boolean>(() => {});
      const talked = listenFor === 'song' ? never : pauseAfterSound(stream, () => over).then(() => (wantsSpeech() ? true : never));
      if (!speechOnly) SAYS_AT.forEach(([at, next]) => setTimeout(() => { if (!over) setStage(next); }, at));

      // The first answer that settles it (a song, words, or no more song tries today) wins.
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
      const heardWords = (words: string) => {
        const page = heardPage(null, words);
        if (over || !page) return;
        over = true;
        stop();
        setSaid(spokenWords(words)); setStage('heard');
        if (speechOnly) heardRef.current?.(spokenWords(words));
        else openTimer.current = setTimeout(() => navigate(page), 1200);
      };
      const clip = () => new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const tries: Promise<Recognition | void>[] = [];
      let elapsed = 0;
      for (const [i, at] of TRY_AT_MS.entries()) {
        const paused = await Promise.race([wait(at - elapsed).then(() => false), talked]);
        elapsed = at;
        if (over) return;
        const last = paused || i === TRY_AT_MS.length - 1;
        if (last) { stop(); await stopped; if (paused) setStage('searching'); }
        const heard = clip();
        // Same clip to both, racing: whichever recognizes something first wins. In Auto a daily
        // limit on songs doesn't end it: what was said can still go to the Character.
        if (wantsSongs()) tries.push(recognizeSong(heard).then((r) => { if (r.status === 'found' || (r.status === 'limit' && songsOnly())) finish(r); return r; }));
        if (last && wantsSpeech() && (paused || speechOnly)) tries.push(transcribeAudioWithFallback(heard, sttLanguage.current).catch(() => '').then(heardWords));
        if (last) break;
      }
      const results = (await Promise.all(tries)).filter((r): r is Recognition => Boolean(r));
      if (over) return;
      if (songsOnly()) { finish(results.every((r) => r.status === 'error') ? { status: 'error' } : { status: 'missed' }); return; }
      const limit = results.find((r) => r.status === 'limit');
      if (limit) finish(limit);
      else { over = true; stop(); closeRef.current(); } // nothing heard: back to where it was, ready to retry or type
    })();
    return () => { over = true; stopRef.current(); };
  }, [round, navigate, listenFor]);

  const close = () => { stopRef.current(); clearTimeout(openTimer.current); onClose(); };
  const busy = stage === 'listening' || stage === 'searching' || stage === 'expanding' || stage === 'tough';
  const title = {
    listening: listenFor === 'speech' ? t('listenSpeech') : listenFor === 'anything' && !onlySong ? t('listenAnything') : t('musicListening'),
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
    listening: listenFor === 'speech' ? t('listenSpeechHint') : listenFor === 'anything' && !onlySong ? t('listenAnythingHint') : t('musicListeningHint'),
    searching: t('musicSearchingHint'),
    expanding: t('musicExpandingHint'),
    tough: t('musicToughHint'),
    found: song?.artist ?? '',
    heard: listenFor === 'speech' ? t('listenAnswering') : '',
    missed: t('musicNotHeardHint'),
  }[stage as string] ?? '';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={listenFor === 'song' ? t('musicListen') : t('listenAnything')}
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

      {listenFor === 'anything' && busy && (
        // Narrow it: songs only (keeps listening here), or speech only (the presenter starts connecting now).
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            aria-pressed={onlySong}
            onClick={() => { onlySongRef.current = !onlySongRef.current; setOnlySong(onlySongRef.current); }}
            className="px-4 py-2 rounded-full text-sm font-medium border flex items-center gap-2"
            style={onlySong
              ? { backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }
              : { borderColor: 'var(--ui-border-default)', color: 'var(--ui-text-secondary)' }}
          >
            <Music size={16} /> {t('listenOnlyMusic')}
          </button>
          <button
            type="button"
            onClick={() => { stopRef.current(); navigate('/character?listen=1'); }}
            className="px-4 py-2 rounded-full text-sm font-medium border flex items-center gap-2"
            style={{ borderColor: 'var(--ui-border-default)', color: 'var(--ui-text-secondary)' }}
          >
            <MessageCircle size={16} /> {t('listenOnlySpeech')}
          </button>
        </div>
      )}

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
          onClick={() => { close(); onNeedSignIn?.(); }}
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
