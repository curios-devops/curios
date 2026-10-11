// Curios Arcade co-creation: three quick questions on one screen, each with a sensible default —
// a carousel of the style categories that fit the game's genres (mood for the colors, type and
// controls), a carousel for 2D or 3D when it fits (else which world), and the player's one-line
// idea, prefilled from their original query — then the build with real
// progress (the model's output is streamed) and play. "Remake" asks what to improve and uses
// the next model up (Luna → Sol → Astra). One Pro credit per build.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useLanguage } from '../../../contexts/LanguageContext.tsx';
import { useProCredits } from '../../../providers/ProCreditsProvider.tsx';
import type { GameInfo } from '../gamesSearch.ts';
import ArcadeScreen, { PIXEL_FONT, usePixelFont } from './ArcadeScreen.tsx';
import {
  arcadeModel, fetchArcadeIdeas, generateArcadeGame, improveArcadeGame, nextArcadeModel, offers3D, repairArcadeGame,
  type ArcadeGame, type ArcadeMode, type BuildEvent,
} from './arcadeService.ts';
import { relevantCategories, type ArcadeCategory, type CategoryId } from './arcadeStyles.ts';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Typical length of the model's answer, to turn streamed characters into a percentage.
const EXPECTED_CHARS: Record<ArcadeMode, number> = { '2d': 3500, '3d': 4500 };

// Best choice in the middle of a carousel, the next ones alternating around it.
const centerFirst = <T,>(xs: T[]) => xs.reduce<T[]>((out, x, i) => (i % 2 ? [x, ...out] : [...out, x]), []);

// Swipeable row that snaps to the middle; the item in the middle is the choice and is a bit
// bigger. Tapping an item picks it and slides it to the middle.
function Carousel({ count, index, onIndex, width, children }: {
  count: number; index: number; onIndex: (i: number) => void; width: number;
  children: (i: number, on: boolean) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout>>();
  const center = (i: number, smooth = true) => {
    const row = ref.current;
    const el = row?.children[i] as HTMLElement | undefined;
    if (row && el) row.scrollTo({ left: el.offsetLeft + el.offsetWidth / 2 - row.clientWidth / 2, behavior: smooth ? 'smooth' : 'auto' });
  };
  useEffect(() => center(index, false), []);
  const onScroll = () => {
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const row = ref.current;
      if (!row) return;
      const mid = row.scrollLeft + row.clientWidth / 2;
      const off = (i: number) => {
        const el = row.children[i] as HTMLElement;
        return Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
      };
      let best = 0;
      for (let i = 1; i < count; i++) if (off(i) < off(best)) best = i;
      if (best !== index) onIndex(best);
    }, 120);
  };
  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="relative -mx-5 flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory py-2"
      style={{ paddingInline: `calc(50% - ${width / 2}px)` }}
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => { onIndex(i); center(i); }}
          className="snap-center flex-shrink-0 rounded-md overflow-hidden border-2 text-left transition-[transform,opacity] duration-200"
          style={{
            width,
            borderColor: i === index ? 'var(--accent-primary)' : '#333',
            transform: `scale(${i === index ? 1 : 0.84})`,
            opacity: i === index ? 1 : 0.55,
          }}
        >
          {children(i, i === index)}
        </button>
      ))}
    </div>
  );
}

// Small drawings for the 2D / 3D choice (no images to load).
function ModePreview({ mode }: { mode: ArcadeMode }) {
  return mode === '2d' ? (
    <svg viewBox="0 0 64 48" className="w-full h-full" shapeRendering="crispEdges">
      <rect width="64" height="48" fill="#1b1b1b" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} x={i * 8} y="40" width="7" height="7" fill="#5a4632" />)}
      <rect x="10" y="30" width="6" height="10" fill="#f2d17a" />
      <rect x="40" y="32" width="8" height="8" fill="#b03a2e" />
      <rect x="26" y="20" width="10" height="4" fill="#5a4632" />
    </svg>
  ) : (
    <svg viewBox="0 0 64 48" className="w-full h-full" shapeRendering="crispEdges">
      <rect width="64" height="24" fill="#1b1b1b" />
      <rect y="24" width="64" height="24" fill="#5a4632" />
      <polygon points="0,0 22,14 22,34 0,48" fill="#b03a2e" />
      <polygon points="64,0 42,14 42,34 64,48" fill="#8a2c22" />
      <rect x="22" y="14" width="20" height="20" fill="#6e241c" />
      <rect x="29" y="22" width="6" height="10" fill="#f2d17a" />
      <rect x="31" y="40" width="2" height="8" fill="#f2d17a" />
    </svg>
  );
}

// Mini scene per category in its mood colors, so the styles read differently at a glance;
// neon categories are drawn as glowing outlines.
function CategoryPreview({ c }: { c: ArcadeCategory }) {
  const [bg, ground, enemy, hero] = c.mood;
  const neon = c.look === 'cyberpunk';
  const paint = (color: string) => (neon ? { fill: 'none', stroke: color, strokeWidth: 1.2 } : { fill: color });
  const blocks = (n: number, y: number, color: string) => Array.from({ length: n }, (_, i) => <rect key={`${y}-${i}`} x={i * 8} y={y} width="7" height="7" fill={color} />);
  const scene: Record<CategoryId, ReactNode> = {
    retro_arcade: <>
      <path d="M4 6 H60 V42 H4 Z M14 16 H50 M14 32 H50" stroke={ground} strokeWidth="2" fill="none" />
      {[20, 26, 32, 38, 44].map((x) => <rect key={x} x={x} y="23" width="2" height="2" fill={hero} />)}
      <path d="M12 24 L18 20 A5 5 0 1 0 18 28 Z" fill={hero} />
      <path d="M46 28 V22 A4 4 0 0 1 54 22 V28 L52 26 L50 28 L48 26 Z" fill={enemy} />
    </>,
    sandbox: <>{blocks(8, 41, enemy)}{blocks(8, 34, ground)}<rect x="40" y="27" width="7" height="7" fill={ground} /><rect x="48" y="20" width="7" height="14" fill={enemy} /><rect x="44" y="10" width="15" height="10" fill={ground} /><rect x="14" y="20" width="6" height="14" fill={hero} /></>,
    cyberpunk: <>
      <path d="M2 34 V18 H10 V26 H16 V12 H24 V34 M40 34 V20 H48 V8 H56 V34" stroke={ground} strokeWidth="1.2" fill="none" />
      <circle cx="32" cy="16" r="7" fill="none" stroke={enemy} strokeWidth="1.2" />
      <path d="M0 40 H64 M0 44 H64 M8 40 L0 48 M24 40 L20 48 M40 40 L44 48 M56 40 L64 48" stroke={ground} strokeWidth="1" />
      <rect x="29" y="27" width="5" height="11" {...paint(hero)} />
    </>,
    fantasy: <>
      <path d="M30 40 V18 L34 12 L38 18 V40 Z M22 40 V24 L26 19 L30 24 M38 24 L42 19 L46 24 V40" fill={ground} />
      <path d="M6 40 L12 22 L18 40 Z" fill={enemy} /><rect x="0" y="40" width="64" height="8" fill={ground} />
      <path d="M54 8 L56 12 L60 12 L57 15 L58 19 L54 16 L50 19 L51 15 L48 12 L52 12 Z" fill={hero} />
    </>,
    platformer: <>{blocks(8, 41, ground)}<rect x="8" y="28" width="20" height="5" fill={ground} /><rect x="38" y="18" width="20" height="5" fill={ground} />
      {[42, 48, 54].map((x) => <circle key={x} cx={x} cy="12" r="2.5" fill={hero} />)}<rect x="14" y="19" width="6" height="9" fill={enemy} /></>,
    roguelike: <>
      {[[8, 8], [50, 10], [6, 36], [54, 34], [30, 4], [28, 40], [16, 22], [46, 22]].map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="5" height="5" fill={enemy} />)}
      <circle cx="32" cy="24" r="11" fill="none" stroke={ground} strokeWidth="1.5" /><rect x="29" y="20" width="6" height="8" fill={hero} />
    </>,
    racing: <>
      <path d="M24 0 H40 L60 48 H4 Z" fill={ground} />
      {[4, 16, 28, 40].map((y) => <rect key={y} x="31" y={y} width="2" height="6" fill={hero} />)}
      <rect x="18" y="32" width="9" height="12" fill={enemy} /><rect x="36" y="14" width="7" height="9" fill={hero} />
    </>,
    puzzle: <>
      {[[16, 34, enemy], [24, 34, enemy], [32, 34, ground], [40, 34, hero], [16, 26, ground], [32, 26, ground], [40, 26, hero], [40, 18, hero], [24, 8, enemy], [32, 8, enemy], [32, 0, enemy]].map(([x, y, f]) => <rect key={`${x}-${y}`} x={x as number} y={y as number} width="7" height="7" fill={f as string} />)}
      <path d="M15 42 H48" stroke={ground} strokeWidth="1" />
    </>,
    cozy: <>
      <rect x="0" y="36" width="64" height="12" fill={ground} /><path d="M10 24 L22 14 L34 24 Z" fill={enemy} /><rect x="13" y="24" width="18" height="12" fill={hero} />
      <rect x="20" y="29" width="4" height="7" fill={enemy} /><circle cx="52" cy="10" r="5" fill={enemy} />
      {[42, 48, 54].map((x) => <path key={x} d={`M${x} 36 V31 M${x - 2} 32 L${x} 31 L${x + 2} 32`} stroke={hero} strokeWidth="1.2" />)}
    </>,
    horror: <>
      <circle cx="22" cy="28" r="13" fill={ground} /><rect x="19" y="24" width="6" height="10" fill={hero} />
      {[[44, 14], [52, 30], [40, 38]].map(([x, y]) => <g key={x}><rect x={x} y={y} width="2" height="2" fill={enemy} /><rect x={x + 4} y={y} width="2" height="2" fill={enemy} /></g>)}
    </>,
    scifi: <>
      {[[6, 6], [20, 14], [44, 4], [58, 18], [10, 30], [36, 22], [52, 40], [26, 42]].map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={hero} />)}
      <circle cx="50" cy="12" r="8" fill="none" stroke={ground} strokeWidth="1.5" /><path d="M42 14 Q50 9 58 11" stroke={ground} strokeWidth="1" fill="none" />
      <path d="M14 40 L20 28 L26 40 Z" fill="none" stroke={hero} strokeWidth="1.2" /><path d="M30 18 H38 V22 L36 20 L34 22 L32 20 L30 22 Z" fill="none" stroke={enemy} strokeWidth="1.2" />
    </>,
    party: <>
      {[[6, 8, enemy], [52, 6, hero], [30, 4, ground], [14, 40, hero], [48, 38, ground], [40, 20, enemy]].map(([x, y, f], i) => <rect key={i} x={x as number} y={y as number} width="3" height="3" fill={f as string} transform={`rotate(20 ${x} ${y})`} />)}
      <circle cx="22" cy="20" r="7" fill={enemy} /><circle cx="34" cy="16" r="6" fill={ground} /><path d="M22 27 V40 M34 22 V40" stroke={hero} strokeWidth="0.8" />
    </>,
  };
  return (
    <svg viewBox="0 0 64 48" className="w-full h-full" shapeRendering={neon ? undefined : 'crispEdges'}>
      <rect width="64" height="48" fill={bg} />
      {scene[c.id]}
    </svg>
  );
}

export default function ArcadeStudio({ info, query, onClose }: { info: GameInfo; query: string; onClose: () => void }) {
  usePixelFont();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { requestProAccess, tier } = useProCredits();

  // Three questions: style, 2D or 3D, and the idea.
  // The original question may carry an intent for the game ("doom but with cats").
  const prefill = norm(query) !== norm(info.name) ? query : '';

  const [phase, setPhase] = useState<'ask' | 'improve' | 'build' | 'play' | 'error'>('ask');
  // Style categories that fit the inspiration's genres (a shooter never gets "cozy").
  const categories = centerFirst(relevantCategories(info.genres));
  const [style, setStyle] = useState<CategoryId>(relevantCategories(info.genres)[0].id);
  // Starts by perceived difficulty; every remake moves one model up.
  const [model, setModel] = useState(() => arcadeModel(info.genres));
  const [fixes, setFixes] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [mode, setMode] = useState<ArcadeMode>(offers3D([], query) ? '3d' : '2d');
  // The inspiration's look for the model (colors, mood).
  const world = info.screenshots[0] ?? info.imageUrl;
  const [idea, setIdea] = useState(prefill);
  // One-tap ideas under the box, written for this game by Luna; the fixed ones if that fails.
  const [examples, setExamples] = useState<string[] | null>(null);
  useEffect(() => {
    let live = true;
    const fixed = () => t('arcadeIdeaExamples').split('|').map((x) => x.trim().replace('{name}', info.name));
    fetchArcadeIdeas(info.name, info.genres, info.description, currentLanguage.code)
      .then((ideas) => { if (live) setExamples(ideas.length >= 3 ? ideas : fixed()); })
      .catch(() => { if (live) setExamples(fixed()); });
    return () => { live = false; };
  }, [info.name, currentLanguage.code]); // once per game and language
  const [pct, setPct] = useState(0);
  const [fixing, setFixing] = useState(false);
  const [painting, setPainting] = useState(false);
  const [game, setGame] = useState<ArcadeGame | null>(null);
  const repairedRef = useRef(false);

  // While the model is still thinking (before its first characters), creep towards 12%.
  useEffect(() => {
    if (phase !== 'build') return;
    const id = setInterval(() => setPct((p) => (p < 12 ? p + 0.5 : p)), 400);
    return () => clearInterval(id);
  }, [phase]);

  const onBuildEvent = (e: BuildEvent) => {
    if (e.type === 'fixing') { setFixing(true); setPct(93); }
    else if (e.type === 'painting') { setPainting(true); setPct(94); }
    else setPct((p) => Math.max(p, 12 + 80 * Math.min(1, e.chars / EXPECTED_CHARS[mode])));
  };

  // One credit, then stream the build (a new game, or a better version of the current one).
  const run = async (make: () => Promise<ArcadeGame>, onAccess?: () => void) => {
    const outMessage = tier === 'guest' ? t('creditsOutArcadeGuest') : tier === 'free' ? t('creditsOutArcadeFree') : undefined;
    if (!(await requestProAccess(outMessage))) return;
    onAccess?.();
    repairedRef.current = false;
    setFixing(false);
    setPainting(false);
    setPct(3);
    setPhase('build');
    try {
      setGame(await make());
      setPhase('play');
    } catch {
      setPhase('error');
    }
  };

  const build = () => run(() => generateArcadeGame(
    {
      inspiredBy: info.name,
      genres: info.genres,
      description: info.description,
      screenshot: world,
      year: info.year,
      platforms: info.platforms,
      language: currentLanguage.code,
      mode,
      style,
      idea: idea.trim(),
      model,
    },
    onBuildEvent,
  ));

  const improve = () => {
    if (!game) return;
    // The model only moves up once the credit is granted.
    const stronger = nextArcadeModel(model);
    const text = [...fixes, feedback.trim()].filter(Boolean).join('. ');
    return run(() => improveArcadeGame(game.id, text, stronger, currentLanguage.code, onBuildEvent), () => setModel(stronger));
  };

  // The console's smoke test threw → one free fix of the same game, then give up.
  const onGameError = useCallback((message: string) => {
    if (!game || repairedRef.current) { setPhase('error'); return; }
    repairedRef.current = true;
    setFixing(true);
    setPct(95);
    setPhase('build');
    repairArcadeGame(game.id, message, model, currentLanguage.code)
      .then((fixed) => { setGame(fixed); setPhase('play'); })
      .catch(() => setPhase('error'));
  }, [game, model, currentLanguage.code]);

  // Remake = "what should we improve?" (needs a game; after a failed build, start over).
  const remake = () => {
    setFixes([]);
    setFeedback('');
    setPhase(game ? 'improve' : 'ask');
  };
  const FIXES = [t('arcadeFixFaithful'), t('arcadeFixHarder'), t('arcadeFixEasier'), t('arcadeFixGraphics'), t('arcadeFixControls')];

  if (phase === 'play' || (phase === 'error' && game)) {
    return <ArcadeScreen game={game} failed={phase === 'error'} onClose={onClose} onError={onGameError} onRemake={remake} />;
  }

  const stepMessage = painting ? t('arcadeStepPainting')
    : fixing ? t('arcadeStepFixing')
    : pct < 12 ? t('arcadeStepThinking')
    : pct < 30 ? t('arcadeStepWorld')
    : pct < 55 ? t('arcadeStepHero')
    : pct < 80 ? t('arcadeStepEnemies')
    : t('arcadeStepTuning');
  const chosen = (on: boolean) => ({ borderColor: on ? 'var(--accent-primary)' : '#333' });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0d0d0d] text-[#eee]" style={{ fontFamily: PIXEL_FONT, fontVariantLigatures: 'none' }}>
      <div className="flex items-center gap-2 px-2 py-3 border-b-2 border-[#222]">
        <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center" aria-label={t('arcadeBack')}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold truncate">{t('arcadeStudioTitle')}</p>
          <p className="text-[11px] text-[#999] truncate">{t('arcadeInspiredBy').replace('{name}', info.name)}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 py-3 flex flex-col [&>*]:flex-shrink-0">
        {phase === 'ask' && (
          <>
            <h2 className="text-base font-semibold">{t('arcadeQStyle')}</h2>
            <Carousel
              count={categories.length}
              index={categories.findIndex((c) => c.id === style)}
              onIndex={(i) => setStyle(categories[i].id)}
              width={140}
            >
              {(i) => (
                <>
                  <div className="aspect-[4/3]"><CategoryPreview c={categories[i]} /></div>
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-semibold uppercase truncate">{t(`arcadeCat_${categories[i].id}` as never)}</p>
                    <p className="text-[10px] text-[#888] truncate">{categories[i].examples}</p>
                  </div>
                </>
              )}
            </Carousel>
            <p className="text-xs text-[#bbb] text-center mb-3 truncate">{t(`arcadeCatDesc_${style}` as never)}</p>

            <h2 className="text-base font-semibold">{t('arcadeQMode')}</h2>
            <Carousel count={2} index={mode === '2d' ? 0 : 1} onIndex={(i) => setMode(i ? '3d' : '2d')} width={108}>
              {(i) => (
                <>
                  <div className="aspect-[4/3] bg-black"><ModePreview mode={i ? '3d' : '2d'} /></div>
                  <p className="px-2 py-1.5 text-xs text-center">{i ? t('arcade3D') : t('arcade2D')}</p>
                </>
              )}
            </Carousel>

            <h2 className="text-base font-semibold mt-3 mb-2">
              {t('arcadeQIdea')} <span className="text-xs font-normal text-[#999]">· {t('arcadeIdeaHint')}</span>
            </h2>
            <input
              value={idea}
              onChange={(e) => setIdea(e.target.value.slice(0, 140))}
              onKeyDown={(e) => { if (e.key === 'Enter') void build(); }}
              placeholder={t('arcadeIdeaPlaceholder')}
              maxLength={140}
              aria-label={t('arcadeQIdea')}
              className="w-full h-11 px-3 rounded-md border-2 border-[#333] bg-transparent text-sm outline-none placeholder:text-[#666] focus:border-[var(--accent-primary)]"
              style={{ fontFamily: PIXEL_FONT, fontVariantLigatures: 'none' }}
            />
            <div className="-mx-5 px-5 mt-2 flex gap-2 overflow-x-auto scrollbar-hide">
              {!examples && [96, 128, 112].map((w) => <span key={w} className="flex-shrink-0 h-[26px] rounded-md bg-[#222] animate-pulse" style={{ width: w }} />)}
              {examples?.map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => setIdea(idea === x ? '' : x)}
                  className="flex-shrink-0 px-2.5 py-1 rounded-md border text-[11px] whitespace-nowrap"
                  style={{ borderColor: idea === x ? 'var(--accent-primary)' : '#333', color: idea === x ? '#eee' : '#999' }}
                >
                  {x}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void build()}
              className="mt-4 h-12 flex-shrink-0 rounded-md text-base font-semibold"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
            >
              {t('arcadeBuild')}
            </button>
          </>
        )}

        {phase === 'improve' && (
          <>
            <h2 className="text-lg font-semibold mb-1">{t('arcadeQImprove')}</h2>
            <p className="text-xs text-[#999] mb-4">{model === nextArcadeModel(model) ? t('arcadeImproveTop') : t('arcadeImproveNote')}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {FIXES.map((f) => {
                const on = fixes.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFixes((xs) => (on ? xs.filter((x) => x !== f) : [...xs, f]))}
                    className="px-3 py-2 rounded-md border-2 text-sm"
                    style={chosen(on)}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
            <input
              value={feedback}
              onChange={(e) => setFeedback(e.target.value.slice(0, 140))}
              onKeyDown={(e) => { if (e.key === 'Enter') void improve(); }}
              placeholder={t('arcadeImproveHint')}
              maxLength={140}
              className="h-11 px-3 rounded-md border-2 border-[#333] bg-transparent text-sm outline-none focus:border-[var(--accent-primary)]"
              style={{ fontFamily: PIXEL_FONT, fontVariantLigatures: 'none' }}
            />
            <button
              type="button"
              onClick={() => void improve()}
              className="mt-4 h-12 rounded-md text-base font-semibold"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
            >
              {t('arcadeImprove')}
            </button>
          </>
        )}

        {phase === 'build' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-sm text-[#bbb]">{stepMessage}</p>
            {/* Pixel progress bar: 20 blocks */}
            <div className="flex gap-1">
              {Array.from({ length: 20 }, (_, i) => (
                <span
                  key={i}
                  className="w-3 h-5"
                  style={{ backgroundColor: i < Math.round(pct / 5) ? 'var(--accent-primary)' : '#2a2a2a' }}
                />
              ))}
            </div>
            <p className="text-3xl font-semibold">{Math.round(pct)}%</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-[#bbb]">{t('arcadeError')}</p>
            <button type="button" onClick={remake} className="h-11 px-5 rounded-md border-2 border-[#333] text-sm">
              {t('arcadeRemake')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
