// Character mode — a live AI presenter. Two bodies:
//   • Full body (Vivix A1): a director turns the answer into a spoken line plus
//     full-body action (walk, gesture, dance, pick up a product).
//   • Half body (Anam): a talking upper body; no director — the spoken answer is
//     streamed straight into the avatar as it is written.
// The first answer is prepared in parallel with the connection. Billed by the minute:
// 1 Pro Credit on connecting and 1 more each minute; out of credits → close and the
// sign-up (guests) / Pro modal. 30 s idle → freeze the last frame and close.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';
import { Mic, Send, Loader2, Users, ThumbsUp, Volume2, RotateCcw, PersonStanding, UserRound, Captions } from 'lucide-react';
import TopBar from '../../../components/results/TopBar';
import DynamicShareRow from '../../../components/share/DynamicShareRow';
import SaveButton from '../../space/components/SaveButton';
import { useSession } from '../../../hooks/useSession';
import { useVoiceRecording } from '../../../hooks/useVoiceRecording';
import { transcribeAudioWithFallback } from '../../stt/transcriptionService';
import { formatTimeAgo } from '../../../utils/time';
import { resolveBuyIntent } from '../../search/buyIntent';
import { searchAmazonProducts } from '../../amazon-api';
import { saveNode, ensureShared, updateNodeAnswer, toggleNodeLike, type SavedNodeRef } from '../../space/nodePersistenceService';
import { findCharacter, DEFAULT_CHARACTER_ID, CHARACTERS, FEATURED_CHARACTERS, type CharacterPreset } from '../characterCatalog';
import { findHalfBody, DEFAULT_HALF_BODY_ID, HALF_BODY, FEATURED_HALF_BODY, type HalfBodyPreset } from '../halfBodyCatalog';
import { directTurn, buildScriptEvent, type StageProduct, type DirectedTurn } from '../characterDirector';
import { startCharacterSession, type LiveCharacter } from '../characterSession';
import { startAnamSession, SpeechQueue, type LiveAnam } from '../anamSession';
import { speakAnswer } from '../speechAnswer';
import { decideTurn, type TurnDecision } from '../../auto/modelTier';
import { groundTurn } from '../grounding';
import { trackMoment, type Moment } from '../personalTouch';
import { answerLanguage, listenLanguage } from '../../stt/language';
import { useLanguage } from '../../../contexts/LanguageContext';
import SongListener from '../../music/listen/SongListener';
import { useProCredits } from '../../../providers/ProCreditsProvider.tsx';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { appSettings } from '../../../config/appSettings';
import CharacterPicker from '../components/CharacterPicker';
import { mark } from '../timing';
import { loadPrefs, fetchPrefs, savePrefs, type CharacterPrefs } from '../characterPrefs';
import { revealWords, captionTail } from '../captions';
import { recordLoop } from '../idleLoop';

type Body = 'full' | 'half';
type Status = 'idle' | 'connecting' | 'live' | 'needs-sound' | 'paused' | 'closed' | 'error';
interface Turn { role: 'user' | 'character'; text: string }
type Presenter =
  | { body: 'full'; preset: CharacterPreset }
  | { body: 'half'; preset: HalfBodyPreset };
type Engine =
  | { kind: 'full'; live: LiveCharacter }
  | { kind: 'half'; live: LiveAnam };
type Prepared =
  | { kind: 'full'; turn: Promise<{ turn: DirectedTurn; product: StageProduct | null }> }
  | { kind: 'half'; queue: SpeechQueue; answer: Promise<{ speech: string; suggestions: string[] }> };

const STAGE_ID = 'character-stage';
const VIVIX_VIEW_ID = 'character-stage-video';
const ANAM_VIDEO_ID = 'character-stage-anam';
// Full body: the presenter images are 2:3 (1024×1536) and Vivix squeezes that frame into
// 672×1280 — the stage stays 2:3 and the video fills it, which undoes the squeeze.
const FULL_BODY_RATIO = 2 / 3;
// One credit buys this much live time.
const MINUTE_SECONDS = 60;
// No input for this long (and the presenter not speaking) → freeze the last
// frame and close the billable session; the page and conversation stay.
const IDLE_PAUSE_MS = 30_000;

const locale = () => navigator.language.split('-')[0] || 'en';

/** Snapshot the live video's current frame so a paused stage isn't black. */
function captureFrame(): string | null {
  const video = document.querySelector<HTMLVideoElement>(`#${STAGE_ID} video`);
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

function presenterFor(body: Body, id: string | null, prefs: CharacterPrefs): Presenter {
  return body === 'half'
    ? { body, preset: findHalfBody(id || prefs.halfId || DEFAULT_HALF_BODY_ID) }
    : { body, preset: findCharacter(id || prefs.fullId || DEFAULT_CHARACTER_ID) };
}

/** Full body: buy intent → product on stage → director (search + motion). */
type TurnContext = Pick<Parameters<typeof directTurn>[0], 'model' | 'sources' | 'language' | 'opening'>;
async function prepareFullTurn(q: string, character: CharacterPreset, history: Turn[], knownProduct: StageProduct | null, context: TurnContext) {
  mark('ask: question', { q });
  const buy = await resolveBuyIntent(q).catch(() => ({ isBuyIntent: false }));
  mark('ask: buy-intent ← done', { buy: buy.isBuyIntent });
  let product = knownProduct;
  if (buy.isBuyIntent) {
    const result = await searchAmazonProducts(q, 1).catch(() => null);
    const p = result?.success ? result.products[0] : null;
    if (p?.imageUrl) product = { title: p.title, imageUrl: p.imageUrl };
  }
  const turn = await directTurn({ question: q, character, history, product: buy.isBuyIntent ? product : null, locale: locale(), ...context });
  return { turn, product: buy.isBuyIntent ? product : null };
}

export default function CharacterResults() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialQuery = params.get('q') || '';
  const openMic = params.get('mic') === '1';
  // Auto's listener, "speech" button: the presenter connects while listening goes on over it; the
  // first question is what's heard, and the listener stays until the answer is ready.
  const listenFirst = params.get('listen') === '1';
  const [listening, setListening] = useState(listenFirst);
  const heardRef = useRef<(q: string) => void>(() => {});
  const [firstHeard] = useState(() => (listenFirst ? new Promise<string>((resolve) => { heardRef.current = resolve; }) : null));

  const { requestProAccess, tier, loading: creditsLoading } = useProCredits();
  const { t } = useTranslation();
  // Out of minutes: guests are invited to sign up, signed-in users to go Pro.
  const minutesMessage = (who: string) =>
    t((tier === 'guest' ? 'charMoreMinutesGuest' : 'charMoreMinutesFree') as never).replace('{name}', who);
  const chargingRef = useRef(false);
  // Answer model for the whole conversation, rated on its first question: Luna if easy, else Sol.
  const modelRef = useRef<Promise<string> | undefined>(undefined);
  const { session } = useSession();
  const { currentLanguage, autoDetect } = useLanguage();
  const { isRecording, startRecording, stopRecording, error: micError } = useVoiceRecording();

  // Explicit URL (?body=…&c=…) wins; otherwise the remembered choice.
  const urlBody = params.get('body') === 'half' ? 'half' : params.get('body') === 'full' ? 'full' : null;
  const prefsRef = useRef<CharacterPrefs>(loadPrefs(null));
  const [presenter, setPresenter] = useState<Presenter>(() =>
    presenterFor(urlBody ?? prefsRef.current.body, params.get('c'), prefsRef.current));
  const [captionsOn, setCaptionsOn] = useState(prefsRef.current.captions);
  const [captionText, setCaptionText] = useState('');
  const [loopUrl, setLoopUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(MINUTE_SECONDS);
  const [savedNode, setSavedNode] = useState<SavedNodeRef | null>(null);
  const [liked, setLiked] = useState(false);
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);
  // Half body: the stage takes the real video's aspect ratio (3:4 until known).
  const [aspect, setAspect] = useState<number | null>(null);
  const [startedAt] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState('just now');

  const engineRef = useRef<Engine | null>(null);
  const resumeRef = useRef<(() => Promise<void>) | null>(null);
  const turnsRef = useRef<Turn[]>([]);
  const productRef = useRef<StageProduct | null>(null);
  const startedRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const speakingRef = useRef(false);
  const speechRef = useRef(''); // full body: the line being spoken (approximate captions)
  const captionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingLoopRef = useRef(false);
  const touch = () => { lastActivityRef.current = Date.now(); };

  const remember = (patch: Partial<CharacterPrefs>) => {
    prefsRef.current = { ...prefsRef.current, ...patch };
    savePrefs(prefsRef.current, session?.user);
  };
  // The presenter in use becomes the remembered one (custom uploads aren't reusable ids).
  const rememberPresenter = (who: Presenter) => {
    const id = who.preset.id.startsWith('custom-') ? null : who.preset.id;
    remember(who.body === 'full' ? { body: 'full', ...(id ? { fullId: id } : {}) } : { body: 'half', ...(id ? { halfId: id } : {}) });
  };

  // Once the presenter has finished speaking, record a few silent seconds of
  // it listening — that becomes the "waiting" loop after the idle pause.
  const maybeRecordLoop = useCallback(() => {
    if (loopUrl || recordingLoopRef.current) return;
    setTimeout(async () => {
      const video = document.querySelector<HTMLVideoElement>(`#${STAGE_ID} video`);
      if (speakingRef.current || !video || recordingLoopRef.current) return;
      recordingLoopRef.current = true;
      let interrupted = false;
      const watch = setInterval(() => { if (speakingRef.current) interrupted = true; }, 200);
      const url = await recordLoop(video, 6000);
      clearInterval(watch);
      recordingLoopRef.current = false;
      if (url && !interrupted) setLoopUrl(url);
      else if (url) URL.revokeObjectURL(url);
    }, 1500);
  }, [loopUrl]);

  const stopCaptionTimer = () => {
    if (captionTimerRef.current) clearInterval(captionTimerRef.current);
    captionTimerRef.current = null;
  };

  const name = presenter.preset.name;
  const isLive = status === 'live' || status === 'needs-sound';
  const paused = status === 'paused';
  const canTalk = isLive || paused;
  const ended = status === 'closed';
  const firstQuestion = turns.find((t) => t.role === 'user')?.text || initialQuery;
  const lastAnswer = [...turns].reverse().find((t) => t.role === 'character')?.text || '';

  useEffect(() => {
    const id = setInterval(() => setTimeAgo(formatTimeAgo(startedAt)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // The presenter couldn't go on stage (or no minutes left): the listener steps aside to show why.
  useEffect(() => {
    if (status === 'closed' || status === 'error') setListening(false);
  }, [status]);

  const closeEngine = useCallback(async () => {
    const engine = engineRef.current;
    engineRef.current = null;
    await engine?.live.close();
  }, []);

  // Minute meter: each minute that starts costs one credit; none left → close + the modal.
  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [isLive]);
  useEffect(() => {
    if (!isLive || secondsLeft > 0 || chargingRef.current) return;
    chargingRef.current = true;
    void requestProAccess(minutesMessage(name)).then(async (ok) => {
      if (ok) setSecondsLeft(MINUTE_SECONDS);
      else { await closeEngine(); setStatus('closed'); }
      chargingRef.current = false;
    });
  }, [isLive, secondsLeft]);

  // Idle watcher: freeze + close after 30 s without input or speech.
  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(async () => {
      if (thinking || speakingRef.current || isRecording) return;
      if (Date.now() - lastActivityRef.current < IDLE_PAUSE_MS) return;
      if (!engineRef.current) return;
      setFrozenFrame(captureFrame());
      await closeEngine();
      setStatus('paused');
    }, 3000);
    return () => clearInterval(id);
  }, [isLive, thinking, isRecording, closeEngine]);

  // Half body: read the live video's real size so the stage never distorts it.
  useEffect(() => {
    if (!isLive || presenter.body === 'full') return;
    const id = setInterval(() => {
      const v = document.querySelector<HTMLVideoElement>(`#${STAGE_ID} video`);
      if (v?.videoWidth && v.videoHeight) { setAspect(v.videoWidth / v.videoHeight); clearInterval(id); }
    }, 300);
    return () => clearInterval(id);
  }, [isLive, presenter.body]);

  const persist = useCallback(async (all: Turn[]) => {
    const answer = all.map((t) => (t.role === 'user' ? `**You:** ${t.text}` : `**${name}:** ${t.text}`)).join('\n\n');
    if (savedNode) { void updateNodeAnswer(savedNode.id, answer); return; }
    const ref = await saveNode({
      mode: 'character',
      query: all.find((t) => t.role === 'user')?.text || initialQuery || 'Character conversation',
      answer,
      coverImage: presenter.preset.imageUrl,
    });
    if (ref) setSavedNode(ref);
  }, [name, savedNode, initialQuery, presenter.preset.imageUrl]);

  /** Start generating an answer — independent of the live connection. */
  // The moment (city, weather) is looked up once, as the conversation starts.
  const momentRef = useRef<Moment | null>(null);
  const prepare = useCallback((q: string, who: Presenter, history: Turn[], decision: Promise<TurnDecision> = decideTurn(q)): Prepared => {
    const model = modelRef.current;
    // Half body speaks a short line while fresh research runs (full body's script goes out whole).
    const queue = new SpeechQueue();
    const sources = groundTurn(q, decision, who.body === 'half' ? () => queue.push(`${t('charLookingUp')} `) : undefined);
    // Answer in the language the question was asked in; the first answer opens personally.
    const moment = (momentRef.current ??= trackMoment(session?.user));
    const opening = () => {
      if (!history.length) return { first: true, text: moment.opening() };
      const late = moment.late();
      return late ? { first: false, text: late } : undefined;
    };
    const context = { model, sources, language: decision.then((d) => answerLanguage(d.language, autoDetect, currentLanguage?.code)), opening };
    if (who.body === 'full') return { kind: 'full', turn: prepareFullTurn(q, who.preset, history, productRef.current, context) };
    const answer = speakAnswer({ question: q, name: who.preset.name, history, locale: locale(), onSpeech: (t) => queue.push(t), ...context })
      .then((r) => { queue.end(); return r; });
    return { kind: 'half', queue, answer };
  }, [t, session?.user, autoDetect, currentLanguage?.code]);

  /** Hand a prepared answer to the live engine, then record the turn. */
  const deliver = useCallback(async (p: Prepared) => {
    const engine = engineRef.current;
    if (!engine) return;
    let speech = '';
    let next: string[] = [];
    if (p.kind === 'full' && engine.kind === 'full') {
      const { turn, product } = await p.turn;
      if (product) { productRef.current = product; await engine.live.addProduct(product); }
      speechRef.current = turn.speech;
      engine.live.send(buildScriptEvent(turn));
      mark('ask: script sent to Vivix');
      speech = turn.speech;
      next = turn.suggestions;
    } else if (p.kind === 'half' && engine.kind === 'half') {
      setCaptionText('');
      engine.live.attachSpeech(p.queue); // flushes anything already written
      const r = await p.answer;
      speech = r.speech;
      next = r.suggestions;
    }
    setSuggestions(next);
    turnsRef.current = [...turnsRef.current, { role: 'character', text: speech }];
    setTurns(turnsRef.current);
    void persist(turnsRef.current);
  }, [persist]);

  const addUserTurn = (q: string) => {
    turnsRef.current = [...turnsRef.current, { role: 'user', text: q }];
    setTurns(turnsRef.current);
  };

  const ask = useCallback(async (question: string) => {
    const q = question.trim();
    if (!engineRef.current || !q || thinking) return;
    touch();
    setThinking(true);
    setSuggestions([]);
    const history = turnsRef.current;
    addUserTurn(q);
    try {
      await deliver(prepare(q, presenter, history));
    } catch (e) {
      setStatusDetail(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setThinking(false);
      touch();
    }
  }, [deliver, prepare, presenter, thinking]);

  const start = useCallback(async (who: Presenter, firstQ: string | Promise<string>) => {
    setStatusDetail(null);
    setSecondsLeft(MINUTE_SECONDS);
    setFrozenFrame(null);
    setAspect(null);
    setCaptionText('');
    stopCaptionTimer();
    speakingRef.current = false;

    // Parallel: the first answer starts as soon as the question is known (heard, when listening),
    // while the session connects. Its quick decision also rates the conversation model (free: no Astra).
    const firstPrepared = Promise.resolve(firstQ).then((raw): Prepared | null => {
      const q = raw.trim();
      if (!q) return null;
      const decision = decideTurn(q);
      modelRef.current = decision.then(({ tier }) => (tier === 'easy' ? appSettings.models.luna : appSettings.models.sol));
      setThinking(true);
      const history = turnsRef.current;
      addUserTurn(q);
      return prepare(q, who, history, decision);
    });

    try {
      const onStatus = (s: Status, detail?: string) => { setStatus(s); if (detail) setStatusDetail(detail); };
      let engine: Engine;
      if (who.body === 'full') {
        const live = await startCharacterSession(who.preset, VIVIX_VIEW_ID, onStatus, (resume) => { resumeRef.current = resume; });
        live.onServerEvent((e) => {
          if (e.type === 'response.render.started') {
            speakingRef.current = true;
            mark('vivix: render started (speaking)');
            // Approximate captions: reveal the known line at speaking pace.
            const startedAt = Date.now();
            const line = speechRef.current;
            stopCaptionTimer();
            captionTimerRef.current = setInterval(() => setCaptionText(revealWords(line, Date.now() - startedAt)), 150);
          }
          if (e.type === 'response.render.stopped') {
            speakingRef.current = false;
            stopCaptionTimer();
            setCaptionText(speechRef.current);
            touch();
            maybeRecordLoop();
          }
        });
        engine = { kind: 'full', live };
      } else {
        const live = await startAnamSession(who.preset, ANAM_VIDEO_ID, onStatus);
        live.onSpeaking((s) => { speakingRef.current = s; if (!s) { touch(); maybeRecordLoop(); } });
        live.onSpokenText((chunk) => { if (chunk) setCaptionText((t) => t + chunk); });
        engine = { kind: 'half', live };
      }
      // The first minute is charged once the presenter is live (connecting is free).
      if (!(await requestProAccess(minutesMessage(who.preset.name)))) {
        await engine.live.close();
        setStatus('closed');
        setThinking(false);
        return;
      }
      engineRef.current = engine;
      touch();
      const prepared = await firstPrepared;
      if (prepared) {
        if (prepared.kind === 'full') await prepared.turn.catch(() => null);
        setListening(false); // the answer is ready: the presenter takes the screen
        await deliver(prepared).catch((e) => setStatusDetail(e instanceof Error ? e.message : 'Something went wrong'));
        setThinking(false);
        touch();
      } else if (openMic) {
        void startRecording();
      }
    } catch (e) {
      console.error('Character start failed', e);
      setThinking(false);
      setStatus('error');
      setStatusDetail(`${who.preset.name} couldn't get on stage right now. Please try again in a moment.`);
    }
  }, [deliver, maybeRecordLoop, openMic, prepare, requestProAccess, startRecording]);

  // Start once credits are known (checking earlier reads an empty balance).
  useEffect(() => {
    if (creditsLoading || startedRef.current) return;
    mark('credits loaded → start');
    startedRef.current = true;
    momentRef.current ??= trackMoment(session?.user); // city and weather, ready for the first answer
    // Signed-in users: their saved setup (any device) — unless the URL says otherwise.
    void fetchPrefs(session?.user).then((prefs) => {
      prefsRef.current = prefs;
      setCaptionsOn(prefs.captions);
      const who = urlBody || params.get('c') ? presenter : presenterFor(prefs.body, null, prefs);
      setPresenter(who);
      rememberPresenter(who);
      void start(who, firstHeard ?? initialQuery);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creditsLoading]);

  // Always release the billable session when leaving.
  useEffect(() => {
    const onHide = () => {
      const engine = engineRef.current;
      if (engine?.kind === 'full') engine.live.closeOnUnload();
      else void engine?.live.close();
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      if (captionTimerRef.current) clearInterval(captionTimerRef.current);
      void closeEngine();
    };
  }, [closeEngine]);

  const restartWith = async (who: Presenter) => {
    setShowPicker(false);
    setPresenter(who);
    rememberPresenter(who);
    if (loopUrl) { URL.revokeObjectURL(loopUrl); setLoopUrl(null); }
    await closeEngine();
    turnsRef.current = [];
    productRef.current = null;
    setTurns([]);
    setSuggestions([]);
    setSavedNode(null);
    setThinking(false);
    void start(who, '');
  };

  const switchBody = (body: Body) => {
    if (body === presenter.body) return;
    void restartWith(presenterFor(body, null, prefsRef.current));
  };

  const toggleCaptions = () => {
    const next = !captionsOn;
    setCaptionsOn(next);
    remember({ captions: next });
  };

  // Phones block the presenter's sound until a tap: any tap here unblocks it too.
  const unlockSound = () => {
    if (status === 'needs-sound') void resumeRef.current?.().then(() => setStatus('live'));
  };

  // While paused, any new question resumes with a fresh session (a new minute).
  const send = (q: string) => {
    unlockSound();
    if (!q.trim()) return;
    if (paused) void start(presenter, q);
    else void ask(q);
  };

  const handleMic = async () => {
    touch();
    unlockSound();
    if (!isRecording) { await startRecording(); return; }
    setTranscribing(true);
    try {
      const blob = await stopRecording();
      if (blob) {
        const text = await transcribeAudioWithFallback(blob, listenLanguage(autoDetect, currentLanguage?.code));
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

  const ratio = presenter.body === 'full' ? FULL_BODY_RATIO : aspect ?? 3 / 4;
  const maxWidth = ratio < 1 ? 420 : 640;
  const stageStyle = {
    aspectRatio: String(ratio),
    '--stage-w': `min(100%, ${maxWidth}px, calc(70vh * ${ratio}))`,
  } as CSSProperties;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Share lives in the row below the stage — no duplicate button up here. */}
      <TopBar query={firstQuestion || `Talk with ${name}`} timeAgo={timeAgo} rightSlot={<span />} />

      <main className="max-w-5xl mx-auto sm:px-4 py-4 flex flex-col lg:flex-row gap-6">
        {/* Stage: full width on phones, real video aspect ratio everywhere. */}
        <section className="lg:w-auto shrink-0 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-full border" style={{ borderColor: 'var(--ui-border-default)', backgroundColor: 'var(--ui-bg-elevated)' }}>
            {([['full', PersonStanding, 'Full body'], ['half', UserRound, 'Half body']] as const).map(([body, Icon, label]) => {
              const active = presenter.body === body;
              return (
                <button
                  key={body}
                  type="button"
                  onClick={() => switchBody(body)}
                  aria-pressed={active}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                  style={active
                    ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }
                    : { color: 'var(--ui-text-secondary)' }}
                >
                  <Icon size={16} /> {label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={toggleCaptions}
            aria-pressed={captionsOn}
            title={captionsOn ? 'Hide captions' : 'Show captions'}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-full border text-xs font-medium transition-colors"
            style={captionsOn
              ? { backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }
              : { color: 'var(--ui-text-secondary)', borderColor: 'var(--ui-border-default)' }}
          >
            <Captions size={16} /> CC
          </button>
          </div>

          <div id={STAGE_ID} className="relative w-full sm:w-[var(--stage-w)] sm:rounded-3xl overflow-hidden bg-black" style={stageStyle}>
            {/* Poster until the live video arrives; frozen last frame when paused. */}
            {!isLive && (paused && loopUrl ? (
              // Waiting loop recorded while the presenter was listening.
              <video src={loopUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-contain" />
            ) : (
              <img
                src={frozenFrame || presenter.preset.imageUrl}
                alt={name}
                className={`absolute inset-0 w-full h-full ${frozenFrame ? 'object-contain' : 'object-cover opacity-80'}`}
              />
            ))}
            {presenter.body === 'full' ? (
              <div id={VIVIX_VIEW_ID} className="absolute inset-0 [&_video]:!object-fill [&_video]:!w-full [&_video]:!h-full" />
            ) : (
              <video
                id={ANAM_VIDEO_ID}
                autoPlay
                playsInline
                className={`absolute inset-0 w-full h-full object-contain ${isLive ? '' : 'invisible'}`}
              />
            )}

            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-black/50 text-white">
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
                {isLive ? `LIVE · ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : status === 'connecting' ? 'Connecting…' : paused ? 'Paused' : name}
              </span>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-black/50 text-white"
              >
                <Users size={14} /> {name}
              </button>
            </div>

            {status === 'needs-sound' && (
              <button
                type="button"
                onClick={async () => { await resumeRef.current?.(); setStatus('live'); }}
                className="absolute inset-x-0 mx-auto top-1/2 w-max inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
              >
                <Volume2 size={16} /> {t('charEnableSound')}
              </button>
            )}

            {(status === 'connecting' || thinking) && (
              <div className="absolute inset-x-0 bottom-6 flex justify-center">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-black/55 text-white">
                  <Loader2 size={14} className="animate-spin" /> {status === 'connecting' ? `${name} is getting ready…` : `${name} is thinking…`}
                </span>
              </div>
            )}

            {paused && (
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm text-white bg-black/60">
                <span>Paused — no activity for 30 s</span>
                <button
                  type="button"
                  onClick={() => void start(presenter, '')}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
                >
                  Continue
                </button>
              </div>
            )}

            {(ended || status === 'error') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white text-center p-6">
                <p className="text-sm">
                  {status === 'error' ? (statusDetail || 'The presenter could not start.')
                    : 'Conversation ended.'}
                </p>
                <button
                  type="button"
                  onClick={() => void restartWith(presenter)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                  style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
                >
                  <RotateCcw size={16} /> New conversation
                </button>
              </div>
            )}
          </div>

          {/* Captions strip: written live while the presenter speaks (exact for
              half body, paced approximation for full body). */}
          {captionsOn && (
            <div
              className="w-full sm:w-[var(--stage-w)] min-h-[3.75rem] px-4 py-2.5 sm:rounded-2xl text-[15px] leading-snug"
              style={{ ...stageStyle, aspectRatio: undefined, backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--ui-text-primary)' }}
              aria-live="polite"
            >
              {captionText ? captionTail(captionText) : (
                <span style={{ color: 'var(--ui-text-secondary)' }}>{isLive ? `${name} is listening…` : '\u00a0'}</span>
              )}
            </div>
          )}
        </section>

        {/* Conversation */}
        <section className="flex-1 min-w-0 flex flex-col gap-4 px-4 sm:px-0">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--ui-text-primary)' }}>{name}</h1>
            <p className="text-sm" style={{ color: 'var(--ui-text-secondary)' }}>
              {presenter.preset.tagline}{presenter.body === 'full' ? ` · ${presenter.preset.personality}` : ''}
            </p>
          </div>

          {turns.length > 0 && (
            <DynamicShareRow
              serviceType="avatar"
              onShare={savedNode ? () => ensureShared(savedNode.id) : undefined}
              payload={{
                title: firstQuestion,
                description: lastAnswer.slice(0, 200),
                text: lastAnswer.slice(0, 100),
                imageUrls: [presenter.preset.imageUrl],
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
                Ask {name} anything — speak, type, or pick a suggestion.
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
              placeholder={`Ask ${name}…`}
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
          {micError && <p className="text-xs text-red-500">{micError}</p>}
        </section>
      </main>

      {showPicker && (
        <CharacterPicker
          selectedId={presenter.preset.id}
          items={presenter.body === 'full' ? CHARACTERS : HALF_BODY}
          featured={presenter.body === 'full' ? FEATURED_CHARACTERS : FEATURED_HALF_BODY}
          allowCustom={presenter.body === 'full'}
          onSelect={(item) => void restartWith(
            presenter.body === 'full'
              ? { body: 'full', preset: item as CharacterPreset }
              : { body: 'half', preset: item as HalfBodyPreset },
          )}
          onClose={() => setShowPicker(false)}
        />
      )}
      {listening && (
        <SongListener
          listenFor="speech"
          onHeard={(q) => heardRef.current(q)}
          onClose={() => { heardRef.current(''); setListening(false); }}
        >
          {status === 'needs-sound' && (
            // Phones block the presenter's sound until a tap; it connects while this listens.
            <button
              type="button"
              onClick={unlockSound}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
            >
              <Volume2 size={16} /> {t('charEnableSound')}
            </button>
          )}
        </SongListener>
      )}
    </div>
  );
}
