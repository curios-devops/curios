// Curios Arcade co-creation: three quick questions on one screen, each with a sensible default —
// a carousel of the style categories that fit the game's genres (mood for the colors, type and
// controls), a carousel for 2D or 3D when it fits (else which world), and the player's one-line
// idea, prefilled from their original query — then the build with real
// progress (the model's output is streamed) and play. "Remake" asks what to improve and uses
// the next model up (Luna → Sol → Astra). One Pro credit per build.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useLanguage } from '../../../contexts/LanguageContext.tsx';
import { useProCredits } from '../../../providers/ProCreditsProvider.tsx';
import type { GameInfo } from '../gamesSearch.ts';
import ArcadeScreen, { PIXEL_FONT, usePixelFont } from './ArcadeScreen.tsx';
import {
  arcadeModel, generateArcadeGame, improveArcadeGame, nextArcadeModel, offers3D, repairArcadeGame,
  type ArcadeGame, type ArcadeMode, type BuildEvent,
} from './arcadeService.ts';
import { relevantCategories, type ArcadeCategory, type CategoryId } from './arcadeStyles.ts';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Typical length of the model's answer, to turn streamed characters into a percentage.
const EXPECTED_CHARS: Record<ArcadeMode, number> = { '2d': 3500, '3d': 4500 };

// Best choice in the middle of a carousel, the rest around it.
const centerFirst = <T,>(xs: T[]) => (xs.length > 1 ? [xs[1], xs[0], ...xs.slice(2)] : xs);

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

// Mini scene in the category's mood colors; neon categories are drawn as glowing outlines.
function CategoryPreview({ c }: { c: ArcadeCategory }) {
  const [bg, ground, enemy, hero] = c.mood;
  const neon = c.look === 'cyberpunk';
  const shape = (color: string) => (neon ? { fill: 'none', stroke: color, strokeWidth: 1.2 } : { fill: color });
  return (
    <svg viewBox="0 0 64 48" className="w-full h-full" shapeRendering={neon ? undefined : 'crispEdges'}>
      <rect width="64" height="48" fill={bg} />
      {neon
        ? <path d="M0 40 H64 M0 44 H64 M8 40 L0 48 M24 40 L20 48 M40 40 L44 48 M56 40 L64 48" stroke={ground} strokeWidth="1" />
        : [0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} x={i * 8} y="40" width="7" height="8" fill={ground} />)}
      <rect x="8" y="6" width="22" height="3" fill={hero} />
      <rect x="12" y="27" width="6" height="12" {...shape(hero)} />
      <rect x="40" y="29" width="10" height="10" {...shape(enemy)} />
      <rect x="42" y="32" width="2" height="2" fill={neon ? enemy : bg} /><rect x="46" y="32" width="2" height="2" fill={neon ? enemy : bg} />
    </svg>
  );
}

export default function ArcadeStudio({ info, query, onClose }: { info: GameInfo; query: string; onClose: () => void }) {
  usePixelFont();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { requestProAccess, tier } = useProCredits();

  // At most three questions: style, then 2D/3D when 3D fits (else the world), then the idea.
  const second = offers3D(info.genres, query) ? 'mode' : info.screenshots.length >= 2 ? 'world' : null;
  // The original question may carry an intent for the game ("doom but with cats").
  const prefill = norm(query) !== norm(info.name) ? query : '';

  const [phase, setPhase] = useState<'ask' | 'improve' | 'build' | 'play' | 'error'>('ask');
  // Style categories that fit the inspiration's genres (a shooter never gets "cozy").
  const categories = centerFirst(relevantCategories(info.genres));
  const worlds = centerFirst(info.screenshots.slice(0, 3));
  const [style, setStyle] = useState<CategoryId>(relevantCategories(info.genres)[0].id);
  // Starts by perceived difficulty; every remake moves one model up.
  const [model, setModel] = useState(() => arcadeModel(info.genres));
  const [fixes, setFixes] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [mode, setMode] = useState<ArcadeMode>(/\b3d\b|first[- ]person|primera persona/i.test(query) ? '3d' : '2d');
  const [world, setWorld] = useState<string | null>(info.screenshots[0] ?? info.imageUrl);
  const [idea, setIdea] = useState(prefill);
  // Examples that roll through the empty idea box.
  const examples = t('arcadeIdeaExamples').split('|').map((x) => x.trim().replace('{name}', info.name));
  const [example, setExample] = useState(0);
  useEffect(() => {
    if (idea || phase !== 'ask') return;
    const id = setInterval(() => setExample((i) => (i + 1) % examples.length), 2600);
    return () => clearInterval(id);
  }, [idea, phase, examples.length]);
  const [pct, setPct] = useState(0);
  const [fixing, setFixing] = useState(false);
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
    else setPct((p) => Math.max(p, 12 + 80 * Math.min(1, e.chars / EXPECTED_CHARS[mode])));
  };

  // One credit, then stream the build (a new game, or a better version of the current one).
  const run = async (make: () => Promise<ArcadeGame>, onAccess?: () => void) => {
    const outMessage = tier === 'guest' ? t('creditsOutArcadeGuest') : tier === 'free' ? t('creditsOutArcadeFree') : undefined;
    if (!(await requestProAccess(outMessage))) return;
    onAccess?.();
    repairedRef.current = false;
    setFixing(false);
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
      language: currentLanguage.code,
      mode: second === 'mode' ? mode : '2d',
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

  const stepMessage = fixing ? t('arcadeStepFixing')
    : pct < 12 ? t('arcadeStepThinking')
    : pct < 30 ? t('arcadeStepWorld')
    : pct < 55 ? t('arcadeStepHero')
    : pct < 80 ? t('arcadeStepEnemies')
    : t('arcadeStepTuning');
  const chosen = (on: boolean) => ({ borderColor: on ? 'var(--accent-primary)' : '#333' });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0d0d0d] text-[#eee]" style={{ fontFamily: PIXEL_FONT, fontVariantLigatures: 'none' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-[#222]">
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold truncate">{t('arcadeStudioTitle')}</p>
          <p className="text-[11px] text-[#999] truncate">{t('arcadeInspiredBy').replace('{name}', info.name)}</p>
        </div>
        <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 py-4 flex flex-col">
        {phase === 'ask' && (
          <>
            <h2 className="text-base font-semibold">{t('arcadeQStyle')}</h2>
            <Carousel
              count={categories.length}
              index={categories.findIndex((c) => c.id === style)}
              onIndex={(i) => setStyle(categories[i].id)}
              width={150}
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
            <p className="text-xs text-[#bbb] text-center mb-5 truncate">{t(`arcadeCatDesc_${style}` as never)}</p>

            {second === 'mode' && (
              <>
                <h2 className="text-base font-semibold">{t('arcadeQMode')}</h2>
                <Carousel count={2} index={mode === '2d' ? 0 : 1} onIndex={(i) => setMode(i ? '3d' : '2d')} width={120}>
                  {(i) => (
                    <>
                      <div className="aspect-[4/3] bg-black"><ModePreview mode={i ? '3d' : '2d'} /></div>
                      <p className="px-2 py-1.5 text-xs text-center">{i ? t('arcade3D') : t('arcade2D')}</p>
                    </>
                  )}
                </Carousel>
              </>
            )}

            {second === 'world' && (
              <>
                <h2 className="text-base font-semibold">{t('arcadeQWorld')}</h2>
                <Carousel count={worlds.length} index={Math.max(0, worlds.indexOf(world ?? ''))} onIndex={(i) => setWorld(worlds[i])} width={140}>
                  {(i) => <img src={worlds[i]} alt="" className="w-full aspect-[4/3] object-cover" style={{ imageRendering: 'pixelated' }} />}
                </Carousel>
              </>
            )}

            <h2 className="text-base font-semibold mt-4 mb-2">
              {t('arcadeQIdea')} <span className="text-xs font-normal text-[#999]">· {t('arcadeIdeaHint')}</span>
            </h2>
            <div className="relative">
              <input
                value={idea}
                onChange={(e) => setIdea(e.target.value.slice(0, 140))}
                onKeyDown={(e) => { if (e.key === 'Enter') void build(); }}
                maxLength={140}
                aria-label={t('arcadeQIdea')}
                className="w-full h-11 px-3 rounded-md border-2 border-[#333] bg-transparent text-sm outline-none focus:border-[var(--accent-primary)]"
                style={{ fontFamily: PIXEL_FONT, fontVariantLigatures: 'none' }}
              />
              {!idea && (
                <span
                  key={example}
                  className="pointer-events-none absolute inset-y-0 left-3 right-3 flex items-center text-sm text-[#666] animate-fade-in-up"
                >
                  <span className="truncate">{examples[example]}</span>
                </span>
              )}
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
