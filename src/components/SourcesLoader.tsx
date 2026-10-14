// While an answer is being prepared (Search and Magazine): "Searching trusted sources…",
// then "Analyzing <source>" cycling Claude-style through the sources found (each full name
// cross-fades over the previous via .fs-shimmer keyed on the index), with their favicons.
import { useEffect, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';

export default function SourcesLoader({ sources }: { sources: Array<{ title?: string; url?: string }> }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (sources.length === 0) return;
    const id = setInterval(() => setIndex((prev) => (prev + 1) % sources.length), 1500);
    return () => clearInterval(id);
  }, [sources.length]);

  return (
    <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      {sources.length === 0 ? (
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-primary)' }} />
          <span>{t('searchingSources')}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <div className="w-3 h-3 rounded-full animate-ping absolute" style={{ backgroundColor: 'var(--accent-primary)', opacity: 0.4 }} />
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base flex-shrink-0 fs-shimmer">{t('analyzingSource')}</span>
              <span key={index} className="text-base font-medium truncate fs-shimmer">
                {sources[index % sources.length]?.title?.slice(0, 40) || ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center">
              {sources.slice(0, 3).map((source, i) => {
                try {
                  const domain = new URL(source.url ?? '').hostname.replace('www.', '');
                  return (
                    <div
                      key={source.url}
                      className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center overflow-hidden"
                      style={{ marginLeft: i > 0 ? '-8px' : '0', zIndex: 3 - i }}
                    >
                      <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt="" className="w-4 h-4" />
                    </div>
                  );
                } catch {
                  return null;
                }
              })}
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">+{sources.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
