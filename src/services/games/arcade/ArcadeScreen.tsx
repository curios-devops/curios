// Curios Arcade full-screen player: the sandboxed console iframe and, after each run, the
// game-over sheet in the game's own look (its palette + a pixel font): name + score, today's
// podium and the Hall of Fame, 👍/👎, save for later, share, play again and remake.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Bookmark, BookmarkCheck, Loader2, RotateCcw, Share2, ThumbsDown, ThumbsUp, Trophy, Wand2, X } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { buildArcadeHtml, safePalette } from './arcadeRuntime.ts';
import { lookOf } from './arcadeStyles.ts';
import {
  countArcadePlay, fetchBoards, isArcadeSaved, myVote, postScore, toggleSavedArcade, voteArcadeGame,
  type ArcadeGame, type ArcadeScore,
} from './arcadeService.ts';

const MEDALS = ['🥇', '🥈', '🥉'];

// Arcade UI type: a pixel font (Minecraft-like) for RETRO, Orbitron for CYBERPUNK. Loaded
// once, only when the arcade opens.
export const PIXEL_FONT = "'Pixelify Sans', ui-monospace, monospace";
const NEON_FONT = "'Orbitron', 'Pixelify Sans', ui-monospace, monospace";
export function usePixelFont() {
  useEffect(() => {
    if (document.getElementById('pixel-font')) return;
    const link = document.createElement('link');
    link.id = 'pixel-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;600&family=Orbitron:wght@500;700&display=swap';
    document.head.appendChild(link);
  }, []);
}

// The name is kept for this visit only (the arcade saves nothing about a run on the device).
let sessionPlayerName = '';

export default function ArcadeScreen({ game, failed = false, onClose, onError, onRemake }: {
  game: ArcadeGame | null;
  failed?: boolean;
  onClose: () => void;
  /** The console's smoke test (or a run) threw. */
  onError?: (message: string) => void;
  /** "Remake the game" (back to the co-creation questions). */
  onRemake?: () => void;
}) {
  usePixelFont();
  const { t } = useTranslation();
  const frameRef = useRef<HTMLIFrameElement>(null);
  // Plays are counted once per page view (the first run started).
  const countedRef = useRef(false);
  const html = useMemo(() => (game ? buildArcadeHtml(game.code, game.palette, { style: lookOf(game.style), buttons: game.buttons }) : ''), [game]);
  const font = lookOf(game?.style) === 'cyberpunk' ? NEON_FONT : PIXEL_FONT;
  const [p0, p1, p2, p3] = safePalette(game?.palette);
  const [tested, setTested] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState(sessionPlayerName);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [board, setBoard] = useState<'today' | 'allTime'>('today');
  const [boards, setBoards] = useState<{ today: ArcadeScore[]; allTime: ArcadeScore[] } | null>(null);
  const [votes, setVotes] = useState({ up: game?.votesUp ?? 0, down: game?.votesDown ?? 0, mine: game ? myVote(game.id) : 0 });
  const [saved, setSaved] = useState(() => (game ? isArcadeSaved(game.id) : false));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setTested(false);
    countedRef.current = false;
    setVotes({ up: game?.votesUp ?? 0, down: game?.votesDown ?? 0, mine: game ? myVote(game.id) : 0 });
    setSaved(game ? isArcadeSaved(game.id) : false);
  }, [game]);

  const loadBoards = () => { if (game) void fetchBoards(game.id).then(setBoards); };

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow || !e.data?.arcade) return;
      if (e.data.type === 'ready') setTested(true);
      if (e.data.type === 'start' && game && !countedRef.current) { countedRef.current = true; countArcadePlay(game.id); }
      if (e.data.type === 'error') onError?.(String(e.data.message ?? ''));
      if (e.data.type === 'over') {
        setLastScore(Number(e.data.score) || 0);
        setScoreSaved(false);
        setSheetOpen(true);
        loadBoards();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, onError]);

  const saveScore = async () => {
    if (!game || lastScore === null || !name.trim() || saving) return;
    setSaving(true);
    sessionPlayerName = name.trim();
    const ok = await postScore(game.id, name, lastScore);
    setSaving(false);
    if (ok) { setScoreSaved(true); loadBoards(); }
  };

  const share = async () => {
    if (!game) return;
    const url = `${window.location.origin}/arcade/${game.id}`;
    try {
      if (navigator.share) { await navigator.share({ title: game.title, text: t('arcadeInspiredBy').replace('{name}', game.inspiredBy), url }); return; }
    } catch { return; /* share sheet dismissed */ }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* no clipboard */ }
  };

  const vote = async (v: -1 | 1) => {
    if (!game) return;
    const next = await voteArcadeGame(game.id, v);
    if (next) setVotes(next);
  };

  const playAgain = () => {
    setSheetOpen(false);
    frameRef.current?.contentWindow?.postMessage({ arcadeCmd: 'restart' }, '*');
  };

  // The game's own look for everything around the console.
  const ui = {
    bg: { backgroundColor: p0, color: p3, fontFamily: font } as CSSProperties,
    line: { borderColor: p1 } as CSSProperties,
    accent: { backgroundColor: p2, color: p0 } as CSSProperties,
    dim: { color: p3, opacity: 0.7 } as CSSProperties,
  };
  const rows = boards?.[board] ?? [];
  const iconBtn = 'w-9 h-9 rounded-md flex items-center justify-center';
  const action = 'h-11 rounded-md border-2 flex items-center justify-center gap-2 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={ui.bg}>
      <div className="flex items-center gap-2 px-4 py-3 border-b-2" style={ui.line}>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold truncate">{game?.title ?? ''}</p>
          <p className="text-[11px] truncate" style={ui.dim}>{game?.howTo ?? ''}</p>
        </div>
        {game && (
          <>
            <button type="button" onClick={() => { setSheetOpen(true); loadBoards(); }} className={iconBtn} aria-label={t('arcadeRecords')}>
              <Trophy size={18} />
            </button>
            <button type="button" onClick={() => void share()} className={iconBtn} aria-label={t('arcadeShare')}>
              <Share2 size={18} />
            </button>
          </>
        )}
        <button type="button" onClick={onClose} className={iconBtn} aria-label="Close">
          <X size={20} />
        </button>
      </div>
      {copied && <p className="text-center text-xs pt-1" style={ui.dim}>{t('arcadeLinkCopied')}</p>}

      <div className="flex-1 min-h-0 relative">
        {failed || !game ? (
          <div className="h-full flex items-center justify-center px-8 text-center text-sm" style={ui.dim}>
            {failed ? t('arcadeError') : <Loader2 size={24} className="animate-spin" />}
          </div>
        ) : (
          <iframe
            ref={frameRef}
            key={`${game.id}:${game.code.length}`}
            title={game.title}
            srcDoc={html}
            // Scripts only: no same-origin, storage, forms, popups or top navigation.
            sandbox="allow-scripts"
            className="w-full h-full border-0"
          />
        )}

        {/* Last build step: the console's own smoke test (milliseconds) */}
        {game && !failed && !tested && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={ui.bg}>
            <p className="text-sm">{t('arcadeStepTesting')}</p>
            <p className="text-2xl font-semibold">96%</p>
          </div>
        )}

        {/* Game-over sheet, in the game's style */}
        {sheetOpen && game && (
          <div className="absolute inset-x-0 bottom-0 max-h-[80%] overflow-y-auto border-t-2 p-5" style={{ ...ui.bg, ...ui.line }}>
            {lastScore !== null && !scoreSaved && (
              <div className="mb-4">
                <p className="text-xs" style={ui.dim}>{t('arcadeYourScore')}</p>
                <p className="text-3xl font-semibold mb-3" style={{ fontFamily: PIXEL_FONT }}>{lastScore}</p>
                <div className="flex gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 16))}
                    onKeyDown={(e) => { if (e.key === 'Enter') void saveScore(); }}
                    placeholder={t('arcadeYourName')}
                    maxLength={16}
                    className="flex-1 min-w-0 h-10 px-3 rounded-md border-2 text-sm bg-transparent outline-none"
                    style={{ ...ui.line, color: p3, fontFamily: font }}
                  />
                  <button
                    type="button"
                    onClick={() => void saveScore()}
                    disabled={!name.trim() || saving}
                    className="h-10 px-4 rounded-md text-sm font-semibold disabled:opacity-50"
                    style={ui.accent}
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : t('arcadeSave')}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4 border-b-2 mb-3" style={ui.line}>
              {(['today', 'allTime'] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBoard(b)}
                  className="pb-2 text-sm border-b-2 -mb-[2px]"
                  style={board === b ? { borderColor: p2, color: p3 } : { borderColor: 'transparent', ...ui.dim }}
                >
                  {b === 'today' ? t('arcadeToday') : t('arcadeHallOfFame')}
                </button>
              ))}
            </div>

            {!boards ? (
              <Loader2 size={18} className="animate-spin" />
            ) : rows.length === 0 ? (
              <p className="text-sm" style={ui.dim}>{t('arcadeNoScores')}</p>
            ) : (
              <ol className="flex flex-col">
                {rows.map((r, i) => (
                  <li key={`${r.player}-${r.score}-${i}`} className="flex items-center gap-3 text-sm py-1">
                    <span className="w-6 text-center">{i < 3 ? MEDALS[i] : <span style={ui.dim}>{i + 1}</span>}</span>
                    <span className="flex-1 truncate">{r.player}</span>
                    <span className="tabular-nums" style={{ fontFamily: PIXEL_FONT }}>{r.score}</span>
                  </li>
                ))}
              </ol>
            )}

            {/* 👍 / 👎 */}
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm flex-1" style={ui.dim}>{t('arcadeVotePrompt')}</span>
              {([1, -1] as const).map((v) => {
                const Icon = v === 1 ? ThumbsUp : ThumbsDown;
                const active = votes.mine === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => void vote(v)}
                    className="h-9 px-3 rounded-md border-2 flex items-center gap-1.5 text-sm"
                    style={active ? { ...ui.accent, borderColor: p2 } : ui.line}
                    aria-pressed={active}
                  >
                    <Icon size={16} /> <span style={{ fontFamily: PIXEL_FONT }}>{v === 1 ? votes.up : votes.down}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={playAgain} className={action} style={ui.accent}>
                <RotateCcw size={16} /> {t('arcadePlayAgain')}
              </button>
              <button type="button" onClick={() => void share()} className={action} style={ui.line}>
                <Share2 size={16} /> {t('arcadeShare')}
              </button>
              <button type="button" onClick={() => setSaved(toggleSavedArcade(game))} className={action} style={ui.line}>
                {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />} {saved ? t('arcadeSavedGame') : t('arcadeSaveGame')}
              </button>
              {onRemake && (
                <button type="button" onClick={onRemake} className={action} style={ui.line}>
                  <Wand2 size={16} /> {t('arcadeRemake')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
