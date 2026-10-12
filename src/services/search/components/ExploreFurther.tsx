// "Explore further" (Search, before Quick Links): the Decisions API picks the experience that
// best continues this question (Video, Games, Music or Stories) and Luna writes its one-line
// pitch. The other ways are in the "More options" menu at the right of the title.
// When it recommends a video, the card shows its opening frame — painted here (no text) and
// handed to the movie, which starts from that same image.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Gamepad2, Music, PlayCircle, Settings2, type LucideIcon } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { fetchExploreOptions, type ExploreOptions, type ExploreWay } from '../../auto/intentRouter.ts';
import { NanoBananaProvider } from '../../movie/providers/NanoBananaProvider.ts';

const WAYS: { id: ExploreWay; icon: LucideIcon }[] = [
  { id: 'watch', icon: PlayCircle },
  { id: 'play', icon: Gamepad2 },
  { id: 'listen', icon: Music },
  { id: 'read', icon: BookOpen },
];

export default function ExploreFurther({ query, answer, images }: { query: string; answer: string; images: string[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [options, setOptions] = useState<ExploreOptions | null>(null);
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

  // Video's opening frame: undefined while painting, null if it failed (→ search images).
  const [frame, setFrame] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    setFrame(undefined);
    void fetchExploreOptions(query, answer).then((o) => {
      if (!live) return;
      setOptions(o);
      if (o.recommended !== 'watch') return;
      const gist = answer.replace(/\s+/g, ' ').slice(0, 300);
      new NanoBananaProvider()
        .generate(`Opening frame of a short explainer video answering: "${query}". Context: ${gist}. One clear, striking subject, cinematic 16:9 composition. Absolutely no text, letters, labels, captions, diagrams or watermarks.`, { userId: 'curios-guest' })
        .then((url) => { if (live) setFrame(url); }, () => { if (live) setFrame(null); });
    });
    return () => { live = false; };
  }, [query]); // once per question, when the answer is done

  const go = (way: ExploreWay) => {
    const q = encodeURIComponent(query);
    if (way === 'watch') navigate(`/movie-results?q=${q}${frame ? `&frame=${encodeURIComponent(frame)}` : ''}`);
    // Games are looked up by title: open the real game closest to the topic, if Luna named one.
    if (way === 'play') navigate(`/games-results?q=${encodeURIComponent(options?.lines.game || query)}`);
    // Same for Music: the real song closest to the topic (the question's own song, if it names one).
    if (way === 'listen') navigate(`/music-results?q=${encodeURIComponent(options?.lines.song || query)}`);
    if (way === 'read') navigate(`/stories-results?q=${q}`);
  };

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
              {WAYS.filter((w) => w.id !== pick).map(({ id, icon: WayIcon }) => (
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
            <img src={frame} alt="" onError={() => setFrame(null)} className="w-full aspect-video object-cover" />
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
