// Curios Arcade co-creation: up to three quick questions with visual choices (2D or 3D when
// it fits, which world, the player's one-line idea — prefilled from their original query),
// then the build with real progress (the model's output is streamed) and play. "Remake"
// comes back here with the previous answers. One Pro credit per build.
import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useLanguage } from '../../../contexts/LanguageContext.tsx';
import { useProCredits } from '../../../providers/ProCreditsProvider.tsx';
import type { GameInfo } from '../gamesSearch.ts';
import ArcadeScreen, { PIXEL_FONT, usePixelFont } from './ArcadeScreen.tsx';
import { generateArcadeGame, offers3D, repairArcadeGame, type ArcadeGame, type ArcadeMode } from './arcadeService.ts';

type Step = 'mode' | 'world' | 'idea';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Typical length of the model's answer, to turn streamed characters into a percentage.
const EXPECTED_CHARS: Record<ArcadeMode, number> = { '2d': 3500, '3d': 4500 };

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

export default function ArcadeStudio({ info, query, onClose }: { info: GameInfo; query: string; onClose: () => void }) {
  usePixelFont();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const { requestProAccess, tier } = useProCredits();

  const steps: Step[] = [
    ...(offers3D(info.genres, query) ? ['mode' as const] : []),
    ...(info.screenshots.length >= 2 ? ['world' as const] : []),
    'idea',
  ];
  // The original question may carry an intent for the game ("doom but with cats").
  const prefill = norm(query) !== norm(info.name) ? query : '';

  const [phase, setPhase] = useState<'ask' | 'build' | 'play' | 'error'>('ask');
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<ArcadeMode>(/\b3d\b|first[- ]person|primera persona/i.test(query) ? '3d' : '2d');
  const [world, setWorld] = useState<string | null>(info.screenshots[0] ?? info.imageUrl);
  const [idea, setIdea] = useState(prefill);
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

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));

  const build = async () => {
    const outMessage = tier === 'guest' ? t('creditsOutArcadeGuest') : tier === 'free' ? t('creditsOutArcadeFree') : undefined;
    if (!(await requestProAccess(outMessage))) return;
    repairedRef.current = false;
    setFixing(false);
    setPct(3);
    setPhase('build');
    try {
      const made = await generateArcadeGame(
        {
          inspiredBy: info.name,
          genres: info.genres,
          description: info.description,
          screenshot: world,
          language: currentLanguage.code,
          mode: steps.includes('mode') ? mode : '2d',
          idea: idea.trim(),
        },
        (e) => {
          if (e.type === 'fixing') { setFixing(true); setPct(93); }
          else setPct((p) => Math.max(p, 12 + 80 * Math.min(1, e.chars / EXPECTED_CHARS[mode])));
        },
      );
      setGame(made);
      setPhase('play');
    } catch {
      setPhase('error');
    }
  };

  // The console's smoke test threw → one free fix of the same game, then give up.
  const onGameError = useCallback((message: string) => {
    if (!game || repairedRef.current) { setPhase('error'); return; }
    repairedRef.current = true;
    setFixing(true);
    setPct(95);
    setPhase('build');
    repairArcadeGame(game.id, message, info.genres, currentLanguage.code)
      .then((fixed) => { setGame(fixed); setPhase('play'); })
      .catch(() => setPhase('error'));
  }, [game, info.genres, currentLanguage.code]);

  const remake = () => { setStep(0); setPhase('ask'); };

  if (phase === 'play' || (phase === 'error' && game)) {
    return <ArcadeScreen game={game} failed={phase === 'error'} onClose={onClose} onError={onGameError} onRemake={remake} />;
  }

  const stepMessage = fixing ? t('arcadeStepFixing')
    : pct < 12 ? t('arcadeStepThinking')
    : pct < 30 ? t('arcadeStepWorld')
    : pct < 55 ? t('arcadeStepHero')
    : pct < 80 ? t('arcadeStepEnemies')
    : t('arcadeStepTuning');
  const current = steps[step];
  const choice = 'flex-1 rounded-md overflow-hidden border-2 text-left';
  const chosen = (on: boolean) => ({ borderColor: on ? 'var(--accent-primary)' : '#333' });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0d0d0d] text-[#eee]" style={{ fontFamily: PIXEL_FONT }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-[#222]">
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold truncate">{t('arcadeStudioTitle')}</p>
          <p className="text-[11px] text-[#999] truncate">{t('arcadeInspiredBy').replace('{name}', info.name)}</p>
        </div>
        {phase === 'ask' && <span className="text-xs text-[#999]">{step + 1}/{steps.length}</span>}
        <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-6 flex flex-col">
        {phase === 'ask' && current === 'mode' && (
          <>
            <h2 className="text-lg font-semibold mb-4">{t('arcadeQMode')}</h2>
            <div className="flex gap-3">
              {(['2d', '3d'] as const).map((m) => (
                <button key={m} type="button" onClick={() => { setMode(m); next(); }} className={choice} style={chosen(mode === m)}>
                  <div className="aspect-[4/3] bg-black"><ModePreview mode={m} /></div>
                  <p className="p-2 text-sm">{m === '2d' ? t('arcade2D') : t('arcade3D')}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {phase === 'ask' && current === 'world' && (
          <>
            <h2 className="text-lg font-semibold mb-4">{t('arcadeQWorld')}</h2>
            <div className="flex gap-3">
              {info.screenshots.slice(0, 2).map((src) => (
                <button key={src} type="button" onClick={() => { setWorld(src); next(); }} className={choice} style={chosen(world === src)}>
                  <img src={src} alt="" className="w-full aspect-[4/3] object-cover" style={{ imageRendering: 'pixelated' }} />
                </button>
              ))}
            </div>
          </>
        )}

        {phase === 'ask' && current === 'idea' && (
          <>
            <h2 className="text-lg font-semibold mb-1">{t('arcadeQIdea')}</h2>
            <p className="text-xs text-[#999] mb-4">{t('arcadeIdeaHint')}</p>
            <input
              value={idea}
              onChange={(e) => setIdea(e.target.value.slice(0, 140))}
              onKeyDown={(e) => { if (e.key === 'Enter') void build(); }}
              maxLength={140}
              className="h-11 px-3 rounded-md border-2 border-[#333] bg-transparent text-sm outline-none focus:border-[var(--accent-primary)]"
              style={{ fontFamily: PIXEL_FONT }}
            />
            <button
              type="button"
              onClick={() => void build()}
              className="mt-4 h-12 rounded-md text-base font-semibold"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
            >
              {t('arcadeBuild')}
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
