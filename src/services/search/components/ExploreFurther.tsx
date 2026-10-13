// "Explore further" (Search, before Quick Links): the Decisions API picks the experience that
// best continues this question (Video, Games, Music or Stories) and Luna writes its one-line
// pitch. The other ways are in the "More options" menu at the right of the title.
// When it recommends a video, the card shows its opening frame — painted here (no text) and
// handed to the movie, which starts from that same image.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Gamepad2, Music, PlayCircle, Settings2, Sparkles, type LucideIcon } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { fetchExploreOptions, type ExploreOptions, type ExploreWay } from '../../auto/intentRouter.ts';
import { NanoBananaProvider } from '../../movie/providers/NanoBananaProvider.ts';
import { getCached, setCached } from '../searchCache.ts';

const WAYS: { id: ExploreWay; icon: LucideIcon }[] = [
  { id: 'watch', icon: PlayCircle },
  { id: 'play', icon: Gamepad2 },
  { id: 'listen', icon: Music },
  { id: 'read', icon: BookOpen },
];

/** Video's opening frame: undefined while painting, null if none (→ search images). */
export interface ExplorePrep { options: ExploreOptions | null; frame: string | null | undefined; dropFrame: () => void }

// One preparation per question for the whole visit: leaving the search while the frame is
// still painting and coming back reuses the same work (and a reload reuses the cache).
type ExploreJob = { options: Promise<ExploreOptions>; frame: Promise<string | null> };
const jobs = new Map<string, ExploreJob>();

function exploreJob(query: string): ExploreJob {
  const running = jobs.get(query);
  if (running) return running;
  const key = `explore|${query}`;
  const cached = getCached<{ options: ExploreOptions; frame: string | null }>(key)?.value;
  const options = cached ? Promise.resolve(cached.options) : fetchExploreOptions(query, '');
  const frame = cached ? Promise.resolve(cached.frame) : options.then((o) => o.recommended !== 'watch' ? null
    : new NanoBananaProvider()
      .generate(`Opening frame of a short explainer video answering: "${query}". One clear, striking subject, cinematic 16:9 composition. Absolutely no text, letters, labels, captions, diagrams or watermarks.`, { userId: 'curios-guest' })
      .catch(() => null));
  if (!cached) void Promise.all([options, frame]).then(([o, f]) => setCached(key, { options: o, frame: f }));
  const job = { options, frame };
  jobs.set(query, job);
  return job;
}

/**
 * Called by the page as soon as the search starts (from the question alone), so the pick and
 * the video frame are prepared in parallel with the answer and the images.
 */
export function useExplorePrep(query: string): ExplorePrep {
  const [options, setOptions] = useState<ExploreOptions | null>(null);
  const [frame, setFrame] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    setOptions(null);
    setFrame(undefined);
    if (!query.trim()) return;
    const job = exploreJob(query);
    void job.options.then((o) => { if (live) setOptions(o); });
    void job.frame.then((f) => { if (live) setFrame(f); });
    return () => { live = false; };
  }, [query]);

  return { options, frame, dropFrame: () => setFrame(null) };
}

export default function ExploreFurther({ query, images, prep }: { query: string; images: string[]; prep: ExplorePrep }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { options, frame } = prep;
  // Search images often block hotlinking: skip to the next one until one loads.
  const [imageIndex, setImageIndex] = useState(0);
  const image = images[imageIndex];
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => { if (!menu.current?.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const go = (way: ExploreWay) => {
    const q = encodeURIComponent(query);
    if (way === 'watch') navigate(`/movie-results?q=${q}${frame ? `&frame=${encodeURIComponent(frame)}` : ''}`);
    // Games are looked up by title: open the real game closest to the topic, if Luna named one.
    if (way === 'play') navigate(`/games-results?q=${encodeURIComponent(options?.lines.game || query)}`);
    // Same for Music: the real song closest to the topic (the question's own song, if it names one).
    if (way === 'listen') navigate(`/music-results?q=${encodeURIComponent(options?.lines.song || query)}`);
    if (way === 'read') navigate(`/stories-results?q=${q}`);
  };
  // "A song that explains it": the song studio with no real song, written from this answer.
  const topic = options?.lines.topic || query;
  const goExplain = () => navigate(`/song-explain?topic=${encodeURIComponent(topic)}&q=${encodeURIComponent(query)}`);

  const pick = options?.recommended ?? 'watch';
  const line = (way: ExploreWay) => options?.lines[way] || t(`exploreLine_${way}` as never);
  const Icon = WAYS.find((w) => w.id === pick)!.icon;

  return (
    <div className="p-6 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('exploreFurther')}</h3>
        <div ref={menu} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            title={t('exploreMoreOptions')}
            aria-label={t('exploreMoreOptions')}
            aria-expanded={menuOpen}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#222222] transition-colors"
          >
            <Settings2 size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 w-64 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1">
              <p className="px-3 pt-1.5 pb-1 text-xs text-gray-500 dark:text-gray-400">{t('exploreMoreOptions')}</p>
              {/* Music stays in the menu even when it's the pick: it holds the explainer song. */}
              {WAYS.filter((w) => w.id !== pick || w.id === 'listen').map(({ id, icon: WayIcon }) => id === 'listen' ? (
                <div key={id} className="px-3 py-2">
                  <span className="flex items-center gap-3 text-sm text-gray-900 dark:text-white">
                    <WayIcon size={18} className="flex-shrink-0" />
                    {t('exploreWay_listen')}
                  </span>
                  {/* Mini selector: the real song, or one written to explain the topic. */}
                  <div className="mt-1.5 ml-[30px] flex flex-col gap-1">
                    {pick !== 'listen' && (
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); go('listen'); }}
                        className="w-full text-left rounded-lg px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#222222] transition-colors"
                      >
                        <span className="block text-xs font-medium text-gray-900 dark:text-white">{t('exploreRealSong')}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{line('listen')}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); goExplain(); }}
                      className="w-full text-left rounded-lg px-2.5 py-1.5 border transition-colors hover:bg-gray-50 dark:hover:bg-[#222222]"
                      style={{ borderColor: 'var(--accent-primary)' }}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                        <Sparkles size={12} className="flex-shrink-0" /> {t('exploreExplainSong')}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{t('exploreExplainLine').replace('{topic}', topic)}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setMenuOpen(false); go(id); }}
                  className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-[#222222] transition-colors"
                >
                  <WayIcon size={18} className="flex-shrink-0 mt-0.5 text-gray-900 dark:text-white" />
                  <span className="min-w-0">
                    <span className="block text-sm text-gray-900 dark:text-white">{t(`exploreWay_${id}` as never)}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{line(id)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!options ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
          <div className="aspect-video bg-gray-100 dark:bg-gray-800" />
          <div className="p-4 space-y-2">
            <div className="h-4 w-1/2 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => go(pick)}
          className="group w-full text-left rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all overflow-hidden bg-white dark:bg-gray-800"
        >
          {pick === 'watch' && frame === undefined ? (
            <div className="w-full aspect-video bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ) : pick === 'watch' && frame ? (
            <img src={frame} alt="" onError={prep.dropFrame} className="w-full aspect-video object-cover" />
          ) : image && (
            <img src={image} alt="" onError={() => setImageIndex((i) => i + 1)} className="w-full aspect-video object-cover" />
          )}
          <div className="p-4 flex items-start gap-3">
            <Icon size={22} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-primary)' }} />
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-medium text-gray-900 dark:text-white group-hover:text-[var(--accent-primary)] transition-colors">
                {t(`exploreTitle_${pick}` as never)}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">{line(pick)}</p>
              <span
                className="inline-block mt-2 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
              >
                {t('exploreRecommendedBadge')}
              </span>
            </div>
            <ArrowUpRight size={18} className="flex-shrink-0 text-gray-400" />
          </div>
        </button>
      )}

    </div>
  );
}
