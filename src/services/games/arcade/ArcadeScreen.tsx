// Curios Arcade full-screen player: the sandboxed console iframe, share link, and the
// leaderboard sheet (name + score after each run; today's podium and all-time Hall of Fame).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Share2, Trophy, X } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { buildArcadeHtml } from './arcadeRuntime.ts';
import { fetchBoards, postScore, type ArcadeGame, type ArcadeScore } from './arcadeService.ts';

const MEDALS = ['🥇', '🥈', '🥉'];

// The name is kept for this visit only (the arcade saves nothing on the device).
let sessionPlayerName = '';

export default function ArcadeScreen({ game, status, onClose, onError }: {
  game: ArcadeGame | null;
  status: 'creating' | 'ready' | 'error';
  onClose: () => void;
  /** The console's smoke test (or a run) threw. */
  onError?: (message: string) => void;
}) {
  const { t } = useTranslation();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => (game ? buildArcadeHtml(game.code, game.palette) : ''), [game]);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState(sessionPlayerName);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [board, setBoard] = useState<'today' | 'allTime'>('today');
  const [boards, setBoards] = useState<{ today: ArcadeScore[]; allTime: ArcadeScore[] } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadBoards = () => { if (game) void fetchBoards(game.id).then(setBoards); };

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow || !e.data?.arcade) return;
      if (e.data.type === 'error') onError?.(String(e.data.message ?? ''));
      if (e.data.type === 'over') {
        setLastScore(Number(e.data.score) || 0);
        setSaved(false);
        setSheetOpen(true);
        loadBoards();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, onError]);

  const save = async () => {
    if (!game || lastScore === null || !name.trim() || saving) return;
    setSaving(true);
    sessionPlayerName = name.trim();
    const ok = await postScore(game.id, name, lastScore);
    setSaving(false);
    if (ok) { setSaved(true); loadBoards(); }
  };

  const share = async () => {
    if (!game) return;
    const url = `${window.location.origin}/arcade/${game.id}`;
    try {
      if (navigator.share) { await navigator.share({ title: game.title, text: t('arcadeInspiredBy').replace('{name}', game.inspiredBy), url }); return; }
    } catch { return; /* share sheet dismissed */ }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* no clipboard */ }
  };

  const rows = boards?.[board] ?? [];
  const iconBtn = 'w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:text-white';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{game?.title ?? t('arcadeCreating')}</p>
          <p className="text-[11px] text-white/60 truncate">
            {game ? game.howTo : t('arcadeCreatingHint')}
          </p>
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
      {copied && <p className="text-center text-xs text-white/70">{t('arcadeLinkCopied')}</p>}

      <div className="flex-1 min-h-0 relative">
        {status === 'ready' && game ? (
          <iframe
            ref={frameRef}
            key={game.code}
            title={game.title}
            srcDoc={html}
            // Scripts only: no same-origin, storage, forms, popups or top navigation.
            sandbox="allow-scripts"
            className="w-full h-full border-0"
          />
        ) : status === 'creating' ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-white/70">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-sm">{t('arcadeCreating')}</p>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center px-8 text-center text-sm text-white/70">{t('arcadeError')}</div>
        )}

        {/* Leaderboard sheet */}
        {sheetOpen && game && (
          <div className="absolute inset-x-0 bottom-0 max-h-[75%] overflow-y-auto rounded-t-2xl p-5 text-left"
            style={{ backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--ui-text-primary)' }}>
            {lastScore !== null && !saved && (
              <div className="mb-4">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('arcadeYourScore')}</p>
                <p className="text-2xl font-semibold mb-3">{lastScore}</p>
                <div className="flex gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 16))}
                    onKeyDown={(e) => { if (e.key === 'Enter') void save(); }}
                    placeholder={t('arcadeYourName')}
                    maxLength={16}
                    className="flex-1 min-w-0 h-10 px-3 rounded-lg border text-sm bg-transparent"
                    style={{ borderColor: 'var(--ui-border-default)', color: 'var(--ui-text-primary)' }}
                  />
                  <button
                    type="button"
                    onClick={() => void save()}
                    disabled={!name.trim() || saving}
                    className="h-10 px-4 rounded-lg text-sm font-medium disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : t('arcadeSave')}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4 border-b mb-3" style={{ borderColor: 'var(--ui-border-subtle)' }}>
              {(['today', 'allTime'] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBoard(b)}
                  className="pb-2 text-sm font-medium border-b-2"
                  style={board === b
                    ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }
                    : { borderColor: 'transparent', color: 'var(--ui-text-muted)' }}
                >
                  {b === 'today' ? t('arcadeToday') : t('arcadeHallOfFame')}
                </button>
              ))}
            </div>

            {!boards ? (
              <Loader2 size={18} className="animate-spin text-gray-500 dark:text-gray-400" />
            ) : rows.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('arcadeNoScores')}</p>
            ) : (
              <ol className="flex flex-col gap-1">
                {rows.map((r, i) => (
                  <li key={`${r.player}-${r.score}-${i}`} className="flex items-center gap-3 text-sm py-1">
                    <span className="w-6 text-center">{i < 3 ? MEDALS[i] : <span className="text-gray-500 dark:text-gray-400">{i + 1}</span>}</span>
                    <span className="flex-1 truncate">{r.player}</span>
                    <span className="font-medium tabular-nums">{r.score}</span>
                  </li>
                ))}
              </ol>
            )}

            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-4 w-full h-10 rounded-lg text-sm font-medium border"
              style={{ borderColor: 'var(--ui-border-default)', color: 'var(--ui-text-primary)' }}
            >
              {t('arcadePlayAgain')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
