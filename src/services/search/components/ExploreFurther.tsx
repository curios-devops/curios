// "Explore further" (Search, before Quick Links): the Decisions API picks the experience that
// best continues this question (Video, Games or Stories) and Luna writes its one-line pitch.
// The other ways stay one tap away below; Listen (an original song) is shown disabled until
// Music exists.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Gamepad2, Music, PlayCircle, type LucideIcon } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation.ts';
import { fetchExploreOptions, type ExploreOptions, type ExploreWay } from '../../auto/intentRouter.ts';

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

  useEffect(() => {
    let live = true;
    void fetchExploreOptions(query, answer).then((o) => { if (live) setOptions(o); });
    return () => { live = false; };
  }, [query]); // once per question, when the answer is done

  const go = (way: ExploreWay) => {
    const q = encodeURIComponent(query);
    if (way === 'watch') navigate(`/movie-results?q=${q}`);
    // Games are looked up by title: open the real game closest to the topic, if Luna named one.
    if (way === 'play') navigate(`/games-results?q=${encodeURIComponent(options?.lines.game || query)}`);
    if (way === 'read') navigate(`/stories-results?q=${q}`);
  };

  const pick = options?.recommended ?? 'watch';
  const line = (way: ExploreWay) => options?.lines[way] || t(`exploreLine_${way}` as never);
  const Icon = WAYS.find((w) => w.id === pick)!.icon;

  return (
    <div className="p-6 border-t border-gray-100 dark:border-gray-800">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('exploreFurther')}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('exploreRecommended')}</p>

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
          {image && (
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

      <p className="text-sm text-gray-500 dark:text-gray-400 mt-5 mb-3">{t('exploreOther')}</p>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {WAYS.map(({ id, icon: WayIcon }) => {
          const soon = id === 'listen';
          return (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              disabled={soon}
              title={soon ? t('exploreSoon') : line(id)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors text-sm text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed ${options && id === pick ? 'bg-gray-100 dark:bg-[#222222]' : ''}`}
            >
              <WayIcon size={18} />
              <span>{t(`exploreWay_${id}` as never)}</span>
              {soon && <span className="text-[10px] text-gray-500 dark:text-gray-400 -mt-1">{t('exploreSoon')}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
