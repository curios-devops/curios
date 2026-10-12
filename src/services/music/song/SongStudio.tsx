// "Crea tu propia canción" (Music page): an original song inspired by the song, artist or
// album on screen. One screen, like the game studio: the lyrics one part at a time in a
// carousel (moods, regenerate, guided edit), the style to perform it in, voice and length,
// the idea in one line with suggestions, then Generate.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProCredits } from '../../../providers/ProCreditsProvider.tsx';
import { ArrowLeft, Check, Loader2, Music, Pencil, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { useLanguage } from '../../../contexts/LanguageContext.tsx';
import type { MusicInfo } from '../musicInfo.ts';
import {
  PARTS_BY_LENGTH, SONG_STYLES, checkLines, draftSong, fetchSongIdeas, generateSong, replaceLastWord, rewritePart, songMusicReady, syllables,
  type LineCheck, type PartId, type SongDraft, type SongLength, type SongStyle,
} from './songService.ts';

const pill = (on: boolean) => ({
  className: 'px-3 py-1.5 rounded-full text-sm border transition-colors whitespace-nowrap flex-shrink-0',
  style: on
    ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)', borderColor: 'var(--accent-primary)' }
    : { backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--ui-text-primary)', borderColor: 'var(--ui-border-subtle)' },
});

export default function SongStudio({ info, onClose }: { info: MusicInfo; onClose: () => void }) {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const lang = currentLanguage.code;
  const navigate = useNavigate();
  const { requestProAccess, tier } = useProCredits();
  // Generating (≈ 45 s): seconds elapsed drive the progress bar and its messages.
  const [building, setBuilding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [buildFailed, setBuildFailed] = useState(false);

  const [song, setSong] = useState<SongDraft | null>(null);
  const [drafting, setDrafting] = useState(true);
  const [failed, setFailed] = useState(false);
  const [style, setStyle] = useState<SongStyle>('original');
  const [length, setLength] = useState<SongLength>('short');
  const [voice, setVoice] = useState(true);
  const [idea, setIdea] = useState('');
  // The idea the current lyrics were written with (a new one offers a rewrite).
  const [draftIdea, setDraftIdea] = useState('');
  const [ideas, setIdeas] = useState<string[] | null>(null);
  const [musicReady, setMusicReady] = useState(false);

  // Carousel: one part at a time.
  const scroller = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const [busyPart, setBusyPart] = useState<PartId | null>(null);
  // Guided edit of the active part.
  const [editing, setEditing] = useState<PartId | null>(null);
  const [editLines, setEditLines] = useState<string[]>([]);
  const [checks, setChecks] = useState<LineCheck[] | null>(null);
  const [checking, setChecking] = useState(false);

  const draft = (withIdea: string) => {
    setDrafting(true);
    setFailed(false);
    setEditing(null);
    draftSong(info, lang, withIdea, style)
      .then((s) => {
        setSong(s);
        setDraftIdea(withIdea);
        // An instrumental inspiration (a symphony, a sonata) starts without voice.
        if (s.instrumental) setVoice(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setDrafting(false));
  };

  useEffect(() => {
    draft('');
    fetchSongIdeas(info, lang).then(setIdeas).catch(() => setIdeas([]));
    void songMusicReady().then(setMusicReady);
  }, [info.title, info.artist.name, lang]); // once per inspiration and language

  const parts = song ? PARTS_BY_LENGTH[length].map((id) => song.parts.find((p) => p.id === id)).filter((p) => !!p) : [];
  const part = parts[Math.min(active, parts.length - 1)];

  const onScroll = () => {
    const el = scroller.current;
    if (!el || !parts.length) return;
    setActive(Math.round(el.scrollLeft / (el.scrollWidth / parts.length)));
  };
  const goTo = (i: number) => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: (el.scrollWidth / parts.length) * i, behavior: 'smooth' });
  };

  const setPartLines = (id: PartId, lines: string[]) =>
    setSong((s) => (s ? { ...s, parts: s.parts.map((p) => (p.id === id ? { ...p, lines } : p)) } : s));

  const rewrite = (mood?: string) => {
    if (!song || !part) return;
    setBusyPart(part.id);
    rewritePart(info, lang, song, part.id, mood)
      .then((lines) => setPartLines(part.id, lines))
      .catch(() => {})
      .finally(() => setBusyPart(null));
  };

  const startEdit = () => {
    if (!part) return;
    setEditing(part.id);
    setEditLines(part.lines);
    setChecks(null);
  };
  const review = () => {
    if (!part) return;
    setChecking(true);
    checkLines(lang, part.type, editLines, part.lines)
      .then(setChecks)
      .catch(() => setChecks(null))
      .finally(() => setChecking(false));
  };
  const saveEdit = () => {
    if (!editing) return;
    setPartLines(editing, editLines.map((l) => l.trim()).filter(Boolean));
    setEditing(null);
    setChecks(null);
  };
  const fixLine = (i: number, line: string) => {
    setEditLines((ls) => ls.map((l, j) => (j === i ? line : l)));
    setChecks((cs) => cs?.map((c, j) => (j === i ? { ok: true, words: [] } : c)) ?? null);
  };

  useEffect(() => {
    if (!building) return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [building]);

  // One credit, then music + animations; the finished song opens on its own page.
  const generate = async () => {
    if (!song) return;
    const outMessage = tier === 'guest' ? t('creditsOutSongGuest') : tier === 'free' ? t('creditsOutSongFree') : undefined;
    if (!(await requestProAccess(outMessage))) return;
    setBuildFailed(false);
    setElapsed(0);
    setBuilding(true);
    try {
      const id = await generateSong(info, lang, song, { style, voice: voice && !song.instrumental, length, idea: idea.trim() });
      onClose();
      navigate(`/song/${id}`);
    } catch {
      setBuildFailed(true);
    } finally {
      setBuilding(false);
    }
  };
  const EXPECTED_SECONDS = 45;
  const buildStep = elapsed < 12 ? t('songStepMusic') : elapsed < 22 ? (voice ? t('songStepVoice') : t('songStepMix')) : t('songStepAnimation');

  const partLabel = (id: PartId) => t(`songPart_${id}` as never);
  const sung = voice && !song?.instrumental;
  const ideaChanged = idea.trim() && idea.trim() !== draftIdea;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'var(--ui-bg-primary)', color: 'var(--ui-text-primary)' }}>
      <header className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--ui-border-subtle)' }}>
        <button type="button" onClick={onClose} aria-label={t('arcadeBack')} className="p-1 -ml-1 hover:opacity-80">
          <ArrowLeft size={22} />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-semibold leading-tight">{t('songStudioTitle')}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {t('songInspiredBy').replace('{name}', info.kind === 'artist' ? info.artist.name : `${info.title} · ${info.artist.name}`)}
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-7">
          {/* Lyrics: one part at a time */}
          <section>
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h2 className="text-base font-semibold">{song && sung ? `«${song.title}»` : t('songLyrics')}</h2>
              {song && sung && parts.length > 1 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">{part ? partLabel(part.id) : ''} · {active + 1}/{parts.length}</span>
              )}
            </div>

            {drafting ? (
              <div className="rounded-xl border p-5 space-y-3 animate-pulse" style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-subtle)' }}>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><Loader2 size={16} className="animate-spin" /> {t('songWriting')}</div>
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-3 rounded bg-gray-200 dark:bg-gray-700" style={{ width: `${80 - i * 8}%` }} />)}
              </div>
            ) : failed || !song ? (
              <div className="rounded-xl border p-5 text-sm" style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-subtle)' }}>
                {t('songDraftFailed')}{' '}
                <button type="button" onClick={() => draft(idea.trim())} className="underline">{t('songTryAgain')}</button>
              </div>
            ) : !sung ? (
              <div className="rounded-xl border p-5 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400" style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-subtle)' }}>
                <Music size={18} /> {t('songInstrumentalNote')}
              </div>
            ) : (
              <>
                <div ref={scroller} onScroll={onScroll} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-3 -mx-4 px-4">
                  {parts.map((p) => (
                    <div
                      key={p.id}
                      className="snap-center flex-shrink-0 w-[85%] sm:w-[75%] rounded-xl border p-5"
                      style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: editing === p.id ? 'var(--accent-primary)' : 'var(--ui-border-subtle)' }}
                    >
                      <p className="text-[11px] uppercase tracking-wide mb-3" style={{ color: 'var(--accent-primary)' }}>{partLabel(p.id)}</p>
                      {busyPart === p.id ? (
                        <div className="py-6 flex justify-center"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
                      ) : editing === p.id ? (
                        <div className="space-y-2">
                          {editLines.map((line, i) => {
                            const c = checks?.[i];
                            return (
                              <div key={i}>
                                <div className="flex items-center gap-2">
                                  <textarea
                                    value={line}
                                    rows={Math.max(1, Math.ceil(line.length / 32))}
                                    onChange={(e) => fixLine(i, e.target.value.replace(/\n/g, ' '))}
                                    className="flex-1 min-w-0 bg-transparent border-b py-1 text-[15px] outline-none resize-none"
                                    style={{ borderColor: c && !c.ok ? 'var(--accent-primary)' : 'var(--ui-border-default)' }}
                                  />
                                  <span className="text-[11px] w-6 text-right text-gray-500 dark:text-gray-400" title={t('songSyllables')}>{syllables(line)}</span>
                                </div>
                                {c && !c.ok && (
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    <span className="text-[11px]" style={{ color: 'var(--accent-primary)' }}>
                                      {c.issue === 'length' ? t('songTooLong') : t('songNoRhyme')}
                                    </span>
                                    {c.words.map((w) => (
                                      <button key={w} type="button" onClick={() => fixLine(i, replaceLastWord(line, w))} {...pill(false)}>{w}</button>
                                    ))}
                                    {c.shorter && (
                                      <button type="button" onClick={() => fixLine(i, c.shorter!)} {...pill(false)}>{c.shorter}</button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-1 text-[15px] leading-relaxed">
                          {p.lines.map((l, i) => <p key={i}>{l}</p>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {parts.length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-3">
                    {parts.map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        aria-label={partLabel(p.id)}
                        onClick={() => goTo(i)}
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: i === active ? 16 : 6, backgroundColor: i === active ? 'var(--accent-primary)' : 'var(--ui-border-default)' }}
                      />
                    ))}
                  </div>
                )}

                {/* Actions for the part on screen */}
                {part && (editing === part.id ? (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button type="button" onClick={review} disabled={checking} {...pill(false)}>
                      <span className="inline-flex items-center gap-1.5">{checking ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}{t('songReview')}</span>
                    </button>
                    <button type="button" onClick={saveEdit} {...pill(true)}>
                      <span className="inline-flex items-center gap-1.5"><Check size={14} />{t('songSave')}</span>
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                      {song.moods.map((m) => (
                        <button key={m} type="button" disabled={!!busyPart} onClick={() => rewrite(m)} {...pill(false)}>{m}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" disabled={!!busyPart} onClick={() => rewrite()} {...pill(false)}>
                        <span className="inline-flex items-center gap-1.5"><RefreshCw size={14} />{t('songRegenerate')}</span>
                      </button>
                      <button type="button" disabled={!!busyPart} onClick={startEdit} {...pill(false)}>
                        <span className="inline-flex items-center gap-1.5"><Pencil size={14} />{t('songEdit')}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </section>

          {/* Style: the original sound or a typical genre */}
          <section>
            <h2 className="text-base font-semibold mb-3">{t('songStyle')}</h2>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
              {SONG_STYLES.map((s) => (
                <button key={s.id} type="button" onClick={() => setStyle(s.id)} {...pill(style === s.id)}>{t(`songStyle_${s.id}` as never)}</button>
              ))}
            </div>
          </section>

          {/* Voice and length */}
          <section className="grid grid-cols-2 gap-4">
            <div>
              <h2 className="text-sm font-semibold mb-2">{t('songVoice')}</h2>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => setVoice(true)} {...pill(voice)}>{t('songSung')}</button>
                <button type="button" onClick={() => setVoice(false)} {...pill(!voice)}>{t('songInstrumental')}</button>
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold mb-2">{t('songLength')}</h2>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={() => { setLength('short'); setActive(0); }} {...pill(length === 'short')}>{t('songShort')}</button>
                <button type="button" onClick={() => setLength('long')} {...pill(length === 'long')}>{t('songLong')}</button>
              </div>
            </div>
          </section>

          {/* The idea in one line, with suggestions written for this inspiration */}
          <section>
            <h2 className="text-base font-semibold mb-3">{t('songIdea')}</h2>
            <input
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder={t('arcadeIdeaPlaceholder')}
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
              style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-subtle)' }}
            />
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-3 -mx-4 px-4">
              {ideas === null
                ? [0, 1, 2].map((i) => <span key={i} className="h-8 w-32 flex-shrink-0 rounded-full animate-pulse" style={{ backgroundColor: 'var(--ui-bg-elevated)' }} />)
                : ideas.map((x) => (
                  <button key={x} type="button" onClick={() => setIdea(idea === x ? '' : x)} {...pill(idea === x)}>{x}</button>
                ))}
            </div>
            {ideaChanged && sung && (
              <button type="button" onClick={() => draft(idea.trim())} disabled={drafting} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-80" style={{ color: 'var(--accent-primary)' }}>
                <Wand2 size={15} /> {t('songRewriteWithIdea')}
              </button>
            )}
          </section>
        </div>
      </div>

      {/* Generate (1 credit). Off until the music model is configured. */}
      <div className="border-t px-4 py-3" style={{ borderColor: 'var(--ui-border-subtle)', backgroundColor: 'var(--ui-bg-primary)' }}>
        <div className="max-w-2xl mx-auto">
          {building ? (
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" />{buildStep}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{Math.min(97, Math.round((elapsed / EXPECTED_SECONDS) * 100))}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ui-bg-elevated)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(97, (elapsed / EXPECTED_SECONDS) * 100)}%`, backgroundColor: 'var(--accent-primary)' }} />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void generate()}
              disabled={!musicReady || drafting || !song}
              className="w-full rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
            >
              <Music size={18} /> {t('songGenerate')}
            </button>
          )}
          {!musicReady && !building && <p className="text-center text-xs mt-2 text-gray-500 dark:text-gray-400">{t('songComingSoon')}</p>}
          {buildFailed && <p className="text-center text-xs mt-2 text-gray-500 dark:text-gray-400">{t('songBuildFailed')}</p>}
        </div>
      </div>
    </div>
  );
}
