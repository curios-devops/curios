import type { CinematicProgress } from '../cinematicService.ts';
import { useTranslation } from '../../../hooks/useTranslation.ts';

interface CinematicLoadingSkeletonProps {
  progress: CinematicProgress | null;
}

export default function CinematicLoadingSkeleton({ progress }: CinematicLoadingSkeletonProps) {
  const { t } = useTranslation();
  const stageTranslationKeys: Record<NonNullable<CinematicProgress['stage']>, string> = {
    planning: 'cinematicStagePlanning',
    research: 'cinematicStageResearch',
    directing: 'cinematicStageDirecting',
    generating: 'cinematicStageGenerating',
    composing: 'cinematicStageGenerating',
    complete: 'cinematicStageComplete'
  };
  const stageKey = progress?.stage ? stageTranslationKeys[progress.stage] : 'cinematicStagePlanning';
  const stageLabel = t(stageKey).toUpperCase();
  const progressValue = Math.round(progress?.progress || 0);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111111] overflow-hidden">
        <div className="bg-black">
          <div className="w-full aspect-square md:aspect-video bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="h-8 w-8 mx-auto border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-400 mt-3">{t('cinematicLoadingGeneratingScenes')}</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="h-6 w-2/3 rounded bg-gray-200 dark:bg-gray-800 skeleton-shimmer" />
          <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800 skeleton-shimmer" />
          <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-800 skeleton-shimmer" />
          <div className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 pt-2">
            <span className="font-medium">{stageLabel}</span>
            <span>•</span>
            <span>{progressValue}%</span>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">{t('cinematicLoadingScenes')}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('cinematicLoadingPreparingClips')}</p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="min-w-[210px] md:min-w-[260px] rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <div className="aspect-square md:aspect-video bg-gray-200 dark:bg-gray-800 skeleton-shimmer" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-4/5 rounded bg-gray-200 dark:bg-gray-800 skeleton-shimmer" />
                <div className="h-3 w-2/5 rounded bg-gray-200 dark:bg-gray-800 skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111111] p-4 sm:p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{t('cinematicLoadingFullVideoText')}</p>
          <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800 skeleton-shimmer" />
          <div className="h-4 w-11/12 rounded bg-gray-200 dark:bg-gray-800 skeleton-shimmer" />
          <div className="h-4 w-10/12 rounded bg-gray-200 dark:bg-gray-800 skeleton-shimmer" />
          <div className="h-4 w-9/12 rounded bg-gray-200 dark:bg-gray-800 skeleton-shimmer" />
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111111] p-4 sm:p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{t('cinematicLoadingSourcesQuickLinks')}</p>
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-md border border-gray-200 dark:border-gray-800 p-2 space-y-2">
              <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-800 skeleton-shimmer" />
              <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-800 skeleton-shimmer" />
              <div className="h-3 w-4/5 rounded bg-gray-200 dark:bg-gray-800 skeleton-shimmer" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
