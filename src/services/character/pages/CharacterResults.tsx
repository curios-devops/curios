// Character mode — a live, full-body AI presenter on a stage (Vivix A1).
// The question goes through our search engine; a director turns the answer into
// a spoken line + full-body action; the character performs it live. The user
// continues by voice (mic), a suggested question, or typing. One conversation =
// one Pro Credit; sessions are capped at 3 minutes server-side.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Crown, Mic, Send, Loader2, Users, ThumbsUp, Volume2, RotateCcw } from 'lucide-react';
import TopBar from '../../../components/results/TopBar';
import DynamicShareRow from '../../../components/share/DynamicShareRow';
import SaveButton from '../../space/components/SaveButton';
import { useProCredits } from '../../../providers/ProCreditsProvider.tsx';
import { useSession } from '../../../hooks/useSession';
import { useVoiceRecording } from '../../../hooks/useVoiceRecording';
import { transcribeAudioWithFallback } from '../../stt/transcriptionService';
import { formatTimeAgo } from '../../../utils/time';
import { resolveBuyIntent } from '../../search/buyIntent';
import { searchAmazonProducts } from '../../amazon-api';
import { saveNode, ensureShared, updateNodeAnswer, toggleNodeLike, type SavedNodeRef } from '../../space/nodePersistenceService';
import { findCharacter, DEFAULT_CHARACTER_ID, type CharacterPreset } from '../characterCatalog';
import { directTurn, buildScriptEvent, type StageProduct } from '../characterDirector';
import { startCharacterSession, type LiveCharacter } from '../characterSession';
import CharacterPicker from '../components/CharacterPicker';
import { mark } from '../timing';

type Status = 'idle' | 'no-credits' | 'connecting' | 'live' | 'needs-sound' | 'paused' | 'closed' | 'error';
interface Turn { role: 'user' | 'character'; text: string }

const VIDEO_ID = 'character-stage-video';
const LAST_CHARACTER_KEY = 'curios_character_id';
const SESSION_SECONDS = 180;
// No input for this long (and the character not speaking) → freeze the last
// frame and close the billable session; the page and conversation stay.
const IDLE_PAUSE_MS = 60_000;

/** Snapshot the live video's current frame so a paused stage isn't black. */
function captureFrame(): string | null {
  const video = document.querySelector<HTMLVideoElement>(`#${VIDEO_ID} video`);
  if (!video || !video.videoWidth) return null;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  try {
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return null;
  }
}

function transcriptMarkdown(character: CharacterPreset, turns: Turn[]): string {
  return turns.map((t) => (t.role === 'user' ? `**You:** ${t.text}` : `**${character.name}:** ${t.text}`)).join('\n\n');
}

export default function CharacterResults() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialQuery = params.get('q') || '';
  const openMic = params.get('mic') === '1';

  const { requestProAccess, canUseProFeature, loading: creditsLoading } = useProCredits();
  const { session } = useSession();
  const { isRecording, startRecording, stopRecording } = useVoiceRecording();

  const [character, setCharacter] = useState<CharacterPreset>(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(LAST_CHARACTER_KEY); } catch { /* storage blocked */ }
    return findCharacter(params.get('c') || saved || DEFAULT_CHARACTER_ID);
  });
  const [status, setStatus] = useState<Status>('idle');
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [caption, setCaption] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [savedNode, setSavedNode] = useState<SavedNodeRef | null>(null);
  const [liked, setLiked] = useState(false);
  const [startedAt] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState('just now');

  const liveRef = useRef<LiveCharacter | null>(null);
  const resumeRef = useRef<(() => Promise<void>) | null>(null);
  const turnsRef = useRef<Turn[]>([]);
  const productRef = useRef<StageProduct | null>(null);
  const startedRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const speakingRef = useRef(false);
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  const touch = () => { lastActivityRef.current = Date.now(); };

  useEffect(() => {
    const id = setInterval(() => setTimeAgo(formatTimeAgo(startedAt)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // Countdown of the 3-minute session (the server closes it regardless).
  useEffect(() => {
    if (status !== 'live' && status !== 'needs-sound') return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [status]);

  // Idle watcher: freeze + close after a minute without input or speech.
  useEffect(() => {
    if (status !== 'live' && status !== 'needs-sound') return;
    const id = setInterval(async () => {
      if (thinking || speakingRef.current || isRecording) return;
      if (Date.now() - lastActivityRef.current < IDLE_PAUSE_MS) return;
      const live = liveRef.current;
      if (!live) return;
      setFrozenFrame(captureFrame());
      liveRef.current = null;
      await live.close();
      setStatus('paused');
    }, 5000);
    return () => clearInterval(id);
  }, [status, thinking, isRecording]);

  const persist = useCallback(async (all: Turn[]) => {
    const answer = transcriptMarkdown(character, all);
    if (savedNode) {
      void updateNodeAnswer(savedNode.id, answer);
      return;
    }
    const ref = await saveNode({
      mode: 'character',
      query: all.find((t) => t.role === 'user')?.text || initialQuery || 'Character conversation',
      answer,
      coverImage: character.imageUrl,
    });
    if (ref) setSavedNode(ref);
  }, [character, savedNode, initialQuery]);

  const ask = useCallback(async (question: string) => {
    const live = liveRef.current;
    const q = question.trim();
    if (!live || !q || thinking) return;
    touch();
    setThinking(true);
    setSuggestions([]);
    const history = turnsRef.current;
    turnsRef.current = [...history, { role: 'user', text: q }];
    setTurns(turnsRef.current);
    try {
      // Selling: on buy intent, put the product on stage so the presenter can pick it up.
      mark('ask: question', { q });
      const buy = await resolveBuyIntent(q).catch(() => ({ isBuyIntent: false }));
      mark('ask: buy-intent ← done', { buy: buy.isBuyIntent });
      if (buy.isBuyIntent) {
        const result = await searchAmazonProducts(q, 1).catch(() => null);
        const p = result?.success ? result.products[0] : null;
        if (p?.imageUrl) {
          productRef.current = { title: p.title, imageUrl: p.imageUrl };
          await live.addProduct(productRef.current);
        }
      }
      const turn = await directTurn({
        question: q,
        character,
        history,
        product: buy.isBuyIntent ? productRef.current : null,
        locale: navigator.language.split('-')[0] || 'en',
      });
      live.send(buildScriptEvent(turn));
      mark('ask: script sent to Vivix');
      setCaption(turn.speech);
      setSuggestions(turn.suggestions);
      turnsRef.current = [...turnsRef.current, { role: 'character', text: turn.speech }];
      setTurns(turnsRef.current);
      void persist(turnsRef.current);
    } catch (e) {
      setStatusDetail(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setThinking(false);
    }
  }, [character, persist, thinking]);

  const start = useCallback(async (who: CharacterPreset, firstQuestion: string) => {
    // One conversation = one Pro Credit (guest 1, free 3, pro 25 per day).
    // Check the balance first, but only spend the credit once the character is
    // actually up — a failed start must not cost the user anything.
    if (!canUseProFeature) {
      await requestProAccess(); // opens the sign-in / upgrade modal
      setStatus('no-credits');
      return;
    }
    setStatusDetail(null);
    setSecondsLeft(SESSION_SECONDS);
    setFrozenFrame(null);
    try {
      const live = await startCharacterSession(
        who,
        VIDEO_ID,
        (s, detail) => { setStatus(s); if (detail) setStatusDetail(detail); },
        (resume) => { resumeRef.current = resume; },
      );
      if (!(await requestProAccess())) {
        await live.close();
        setStatus('no-credits');
        return;
      }
      liveRef.current = live;
      touch();
      live.onServerEvent((e) => {
        if (e.type === 'response.render.started') { speakingRef.current = true; mark('vivix: render started (speaking)'); }
        if (e.type === 'response.render.stopped') { speakingRef.current = false; touch(); }
      });
      if (firstQuestion) void ask(firstQuestion);
      else if (openMic) void startRecording();
    } catch (e) {
      console.error('Character start failed', e);
      setStatus('error');
      setStatusDetail(`${who.name} couldn't get on stage right now. Please try again in a moment.`);
    }
  }, [ask, canUseProFeature, openMic, requestProAccess, startRecording]);

  // Start once credits are known (checking earlier reads an empty balance);
  // always release the billable session when leaving.
  useEffect(() => {
    if (creditsLoading || startedRef.current) return;
    mark('credits loaded → start');
    startedRef.current = true;
    void start(character, initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creditsLoading]);

  useEffect(() => {
    // pagehide: the tab is going away → keepalive request; unmount (in-app
    // navigation) → normal close.
    const onHide = () => liveRef.current?.closeOnUnload();
    window.addEventListener('pagehide', onHide);
    return () => { window.removeEventListener('pagehide', onHide); void liveRef.current?.close(); };
  }, []);

  const restartWith = async (who: CharacterPreset) => {
    setShowPicker(false);
    setCharacter(who);
    if (!who.id.startsWith('custom-')) {
      try { localStorage.setItem(LAST_CHARACTER_KEY, who.id); } catch { /* storage blocked */ }
    }
    await liveRef.current?.close();
    liveRef.current = null;
    turnsRef.current = [];
    productRef.current = null;
    setTurns([]);
    setCaption('');
    setSuggestions([]);
    setSavedNode(null);
    void start(who, '');
  };

  // While paused, any new question resumes with a fresh session (1 credit).
  const send = (q: string) => {
    if (!q.trim()) return;
    if (status === 'paused') void start(character, q);
    else void ask(q);
  };

  const handleMic = async () => {
    touch();
    if (!isRecording) { await startRecording(); return; }
    setTranscribing(true);
    try {
      const blob = await stopRecording();
      if (blob) {
        const text = await transcribeAudioWithFallback(blob, navigator.language.split('-')[0] || 'en');
        if (text.trim()) send(text);
      }
    } finally {
      setTranscribing(false);
    }
  };

  const handleLike = async () => {
    if (!savedNode || !session?.user?.id) return;
    try { setLiked(await toggleNodeLike(savedNode.id, session.user.id)); } catch { /* best effort */ }
  };

  const isLive = status === 'live' || status === 'needs-sound';
  const paused = status === 'paused';
  const canTalk = isLive || paused;
  const ended = status === 'closed' || (isLive && secondsLeft === 0);
  const firstQuestion = turns.find((t) => t.role === 'user')?.text || initialQuery;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <TopBar query={firstQuestion || `Talk with ${character.name}`} timeAgo={timeAgo} />

      <main className="max-w-5xl mx-auto px-4 py-4 flex flex-col lg:flex-row gap-6">
        {/* Stage */}
        <section className="lg:w-[400px] shrink-0">
          <div
            className="relative mx-auto aspect-[9/16] rounded-3xl overflow-hidden bg-black"
            style={{ width: 'min(100%, 400px, calc(64vh * 9 / 16))' }}
          >
            {/* Poster until the live video arrives */}
            {!isLive && (
              <img
                src={frozenFrame || character.imageUrl}
                alt={character.name}
                className={`absolute inset-0 w-full h-full object-cover ${frozenFrame ? '' : 'opacity-80'}`}
              />
            )}
            <div id={VIDEO_ID} className="absolute inset-0 [&_video]:!object-cover" />

            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-black/50 text-white">
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
                {isLive ? `LIVE · ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : status === 'connecting' ? 'Connecting…' : paused ? 'Paused' : character.name}
              </span>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-black/50 text-white"
              >
                <Users size={14} /> {character.name}
              </button>
            </div>

            {status === 'needs-sound' && (
              <button
                type="button"
                onClick={async () => { await resumeRef.current?.(); setStatus('live'); }}
                className="absolute inset-x-0 mx-auto top-1/2 w-max inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
              >
                <Volume2 size={16} /> Tap to enable sound
              </button>
            )}

            {(status === 'connecting' || thinking) && (
              <div className="absolute inset-x-0 bottom-24 flex justify-center">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-black/55 text-white">
                  <Loader2 size={14} className="animate-spin" /> {status === 'connecting' ? `${character.name} is getting ready…` : `${character.name} is thinking…`}
                </span>
              </div>
            )}

            {paused && (
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm text-white bg-black/60">
                <span>Paused after 1 min without activity</span>
                <button
                  type="button"
                  onClick={() => void start(character, '')}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
                >
                  Continue <Crown size={12} />
                </button>
              </div>
            )}

            {caption && isLive && (
              <div className="absolute inset-x-3 bottom-3 px-3 py-2 rounded-xl text-sm text-white bg-black/55 max-h-28 overflow-y-auto">
                {caption}
              </div>
            )}

            {(ended || status === 'error' || status === 'no-credits') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white text-center p-6">
                <p className="text-sm">
                  {status === 'no-credits' ? 'You are out of Pro Credits for today.'
                    : status === 'error' ? (statusDetail || 'The character could not start.')
                    : 'Conversation ended.'}
                </p>
                <button
                  type="button"
                  onClick={() => void restartWith(character)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                  style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
                >
                  <RotateCcw size={16} /> New conversation <Crown size={14} />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Conversation */}
        <section className="flex-1 min-w-0 flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--ui-text-primary)' }}>{character.name}</h1>
            <p className="text-sm" style={{ color: 'var(--ui-text-secondary)' }}>{character.tagline} · {character.personality}</p>
          </div>

          {turns.length > 0 && (
            <DynamicShareRow
              serviceType="avatar"
              onShare={savedNode ? () => ensureShared(savedNode.id) : undefined}
              payload={{
                title: firstQuestion,
                description: caption.slice(0, 200),
                text: caption.slice(0, 100),
                imageUrls: [character.imageUrl],
                deepLink: savedNode ? `https://curiosai.com/s/${savedNode.shareSlug}` : window.location.href,
              }}
              trailing={
                <>
                  {savedNode && (
                    <button
                      type="button"
                      onClick={handleLike}
                      aria-label="Vote"
                      className="p-2 rounded-full transition-colors"
                      style={{ color: liked ? 'var(--accent-primary)' : 'var(--ui-text-secondary)' }}
                    >
                      <ThumbsUp size={18} fill={liked ? 'currentColor' : 'none'} />
                    </button>
                  )}
                  {savedNode && <SaveButton nodeId={savedNode.id} />}
                </>
              }
            />
          )}

          <div className="flex-1 space-y-3 max-h-[42vh] overflow-y-auto pr-1">
            {turns.map((t, i) => (
              <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] px-3 py-2 rounded-2xl text-sm"
                  style={t.role === 'user'
                    ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }
                    : { backgroundColor: 'var(--ui-bg-secondary)', color: 'var(--ui-text-primary)' }}
                >
                  {t.text}
                </div>
              </div>
            ))}
            {turns.length === 0 && isLive && (
              <p className="text-sm" style={{ color: 'var(--ui-text-secondary)' }}>
                Ask {character.name} anything — speak, type, or pick a suggestion.
              </p>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={!canTalk || thinking}
                  onClick={() => send(s)}
                  className="px-3 py-1.5 rounded-full border text-sm text-left disabled:opacity-50"
                  style={{ borderColor: 'var(--ui-border-default)', color: 'var(--ui-text-primary)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            className="flex items-center gap-2 p-2 rounded-2xl border"
            style={{ borderColor: 'var(--ui-border-default)', backgroundColor: 'var(--ui-bg-elevated)' }}
            onSubmit={(e) => { e.preventDefault(); const q = input; setInput(''); send(q); }}
          >
            <input
              value={input}
              onChange={(e) => { setInput(e.target.value); touch(); }}
              placeholder={`Ask ${character.name}…`}
              disabled={!canTalk}
              className="flex-1 min-w-0 bg-transparent outline-none px-2 text-sm"
              style={{ color: 'var(--ui-text-primary)' }}
            />
            <button
              type="button"
              onClick={() => void handleMic()}
              disabled={!canTalk || transcribing}
              aria-label={isRecording ? 'Stop and send' : 'Speak'}
              className={`p-2 rounded-full ${isRecording ? 'animate-pulse' : ''} disabled:opacity-50`}
              style={isRecording ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' } : { color: 'var(--ui-text-secondary)' }}
            >
              {transcribing ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
            </button>
            <button
              type="submit"
              disabled={!canTalk || thinking || !input.trim()}
              aria-label="Send"
              className="p-2 rounded-full disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
            >
              <Send size={16} />
            </button>
          </form>
          {statusDetail && status !== 'error' && <p className="text-xs text-red-500">{statusDetail}</p>}
        </section>
      </main>

      {showPicker && (
        <CharacterPicker selectedId={character.id} onSelect={(c) => void restartWith(c)} onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
}
