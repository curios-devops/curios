// Building blocks shared by the fact-sheet pages (Movie 🍿, Games 🎮): tabs, compact
// cards, the Home-style dropdown, "About {title}" with paragraph narration, and the
// Videos / Sources tabs. Extracted from MovieFactPage so both pages stay identical.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Headphones, Loader2, Pause, Play, type LucideIcon } from 'lucide-react';
import { useProCredits } from '../../providers/ProCreditsProvider.tsx';
import { ParagraphNarrator, toParagraphs, type NarratorState } from '../../services/movie/audio/paragraphNarrator.ts';
import { loadNarratorVoice, narratorGender } from '../../services/movie/audio/narratorPrefs.ts';
import { useSession } from '../../hooks/useSession.ts';
import { useTranslation } from '../../hooks/useTranslation.ts';
import LightMarkdown from '../LightMarkdown';

export const domain = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
};

export const favicon = (site: string) => `https://www.google.com/s2/favicons?domain=${site}&sz=64`;

export function FactTabs<T extends string>({ tabs, active, onChange }: {
  tabs: { id: T; label: string; icon: LucideIcon }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="border-b" style={{ borderColor: 'var(--ui-bg-elevated)' }}>
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap flex-shrink-0"
              style={active === id
                ? { borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }
                : { borderColor: 'transparent', color: 'var(--ui-text-muted)' }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

// Compact card (Perplexity-style): gray label over a primary value, visuals on the right.
export function FactCard({ label, value, right, onClick }: { label: string; value?: ReactNode; right?: ReactNode; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className="w-full text-left rounded-xl border px-4 py-3 flex items-center justify-between gap-3"
      style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-subtle)' }}
    >
      <div className="min-w-0">
        <p
          className={value ? 'text-[11px] text-gray-500 dark:text-gray-400' : 'text-sm font-medium'}
          style={value ? undefined : { color: 'var(--ui-text-primary)' }}
        >
          {label}
        </p>
        {value && <p className="text-sm font-medium line-clamp-2" style={{ color: 'var(--ui-text-primary)' }}>{value}</p>}
      </div>
      {right && <div className="flex items-center gap-2 flex-shrink-0">{right}</div>}
    </Tag>
  );
}

/** Card + expandable list of links (Watch on / Store): "First, +N" with stacked logos. */
export function LinksCard({ label, items, link }: {
  label: string;
  items: { name: string; logoUrl: string; url?: string | null }[];
  /** Fallback link for items without their own URL. */
  link?: string | null;
}) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  return (
    <div>
      <FactCard
        label={label}
        value={items.length > 1 ? `${items[0].name}, +${items.length - 1}` : items[0].name}
        onClick={() => setOpen((o) => !o)}
        right={
          <>
            <span className="flex items-center">
              {items.slice(0, 3).map((p, i) => (
                <img
                  key={p.name}
                  src={p.logoUrl}
                  alt={p.name}
                  className="w-6 h-6 rounded-full border-2"
                  style={{ marginLeft: i > 0 ? '-6px' : 0, zIndex: 3 - i, borderColor: 'var(--ui-bg-elevated)' }}
                />
              ))}
            </span>
            <ChevronDown size={14} className={`transition-transform text-gray-500 dark:text-gray-400 ${open ? 'rotate-180' : ''}`} />
          </>
        }
      />
      {open && (
        <ul className="mt-1 rounded-xl border py-1" style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-subtle)' }}>
          {items.map((p) => (
            <li key={p.name}>
              <a
                href={p.url ?? link ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2 text-sm hover:opacity-80"
              >
                <img src={p.logoUrl} alt="" className="w-6 h-6 rounded-full" />
                {p.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Same dropdown style as the Home input's mode menu. `title` = section heading look. */
export function MenuSelect<T extends string>({ options, value, onChange, variant = 'title' }: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  variant?: 'title' | 'small';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={variant === 'title' ? 'flex items-center gap-1.5 text-base font-semibold' : 'flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400'}
        style={variant === 'title' ? { color: 'var(--ui-text-primary)' } : undefined}
      >
        {options.find((o) => o.id === value)?.label}
        <ChevronDown size={variant === 'title' ? 16 : 14} className={`transition-transform text-gray-500 dark:text-gray-400 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className={`absolute top-full mt-2 ${variant === 'title' ? 'left-0' : 'right-0'} rounded-lg shadow-lg border overflow-hidden min-w-[180px] z-50`}
          style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)', boxShadow: '0 14px 28px var(--ui-shadow-elevated)' }}
        >
          {options.map((o) => {
            const active = o.id === value;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => { onChange(o.id); setOpen(false); }}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 transition-colors text-left"
                style={{ color: active ? 'var(--accent-primary)' : 'var(--ui-text-primary)', fontWeight: active ? 500 : 400 }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <span className="text-sm">{o.label}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * "About {title}" + Listen: ElevenLabs (OpenAI TTS fallback), paragraph by paragraph in
 * the user's narrator voice. First play costs 1 Pro Credit; replays reuse the audio.
 */
export function AboutSection({ title, text, done }: { title: string; text: string; done: boolean }) {
  const { t } = useTranslation();
  const { requestProAccess, tier } = useProCredits();
  const { session } = useSession();
  const narratorRef = useRef<ParagraphNarrator | null>(null);
  const [narration, setNarration] = useState<NarratorState | 'idle'>('idle');
  // Leaving the page cancels any pending generation and stops playback.
  useEffect(() => () => narratorRef.current?.stop(), []);

  // Listening time at ~155 spoken words per minute.
  const listenSeconds = Math.round((toParagraphs(text).join(' ').split(/\s+/).filter(Boolean).length / 155) * 60);
  const listenTime = listenSeconds < 60 ? `${Math.max(listenSeconds, 5)} s` : `${Math.round(listenSeconds / 60)} min`;

  const handleListen = async () => {
    const current = narratorRef.current;
    if (current && narration === 'playing') { current.pause(); return; }
    if (current && narration === 'paused') { current.resume(); return; }
    if (current && (narration === 'ended' || narration === 'error')) { void current.start(0); return; }
    if (current) return; // still loading

    // Created synchronously in the tap (unlocks audio on mobile), before any await.
    const voiceId = loadNarratorVoice(session?.user);
    const narrator = new ParagraphNarrator(toParagraphs(text), voiceId, narratorGender(voiceId), setNarration);
    narratorRef.current = narrator;
    setNarration('loading');
    // Out of credits: the modal says why, in this situation's words.
    const outMessage = tier === 'guest' ? t('creditsOutListenGuest') : tier === 'free' ? t('creditsOutListenFree') : undefined;
    if (!(await requestProAccess(outMessage))) {
      narrator.stop();
      narratorRef.current = null;
      setNarration('idle');
      return;
    }
    void narrator.start(0);
  };

  return (
    <section className="mt-8 max-w-3xl">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {done && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">{listenTime}</span>
            <button
              type="button"
              onClick={() => void handleListen()}
              disabled={narration === 'loading'}
              title={t('movieListen')}
              aria-label={t('movieListen')}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--accent-primary)' }}
            >
              {narration === 'loading' ? <Loader2 size={16} className="animate-spin" /> : narration === 'playing' ? <Pause size={16} /> : <Headphones size={16} />}
            </button>
          </div>
        )}
      </div>
      {text ? (
        <LightMarkdown>{text}</LightMarkdown>
      ) : (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 size={16} className="animate-spin" />
        </div>
      )}
    </section>
  );
}

export interface VideoItem { url: string; title: string; thumbnail: string; source: string }

export function VideosGrid({ videos }: { videos: VideoItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.map((v) => (
        <a
          key={v.url}
          href={v.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl overflow-hidden border transition-colors"
          style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-subtle)' }}
        >
          <div className="relative aspect-video bg-black">
            {v.thumbnail && <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" loading="lazy" />}
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
                <Play size={20} className="text-white ml-0.5" />
              </span>
            </span>
          </div>
          <div className="p-3">
            <p className="text-sm font-medium leading-tight line-clamp-2">{v.title}</p>
            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">{v.source}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

/** Same source cards as Search. */
export function SourcesList({ sources }: { sources: { title: string; url: string; snippet?: string }[] }) {
  return (
    <div className="grid gap-3 max-w-3xl">
      {sources.map((s) => (
        <a
          key={s.url}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors bg-white dark:bg-[#0a0a0a]"
        >
          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
            <img src={`https://www.google.com/s2/favicons?domain=${domain(s.url)}&sz=32`} alt="" className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">{s.title}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{domain(s.url)}</p>
            {s.snippet && <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{s.snippet}</p>}
          </div>
        </a>
      ))}
    </div>
  );
}
