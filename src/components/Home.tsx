import RegularSearch from '../components/search/RegularSearch.tsx';
import HelpButton from '../components/HelpButton.tsx';
import { useSubscription } from '../hooks/useSubscription.ts';
import { useTranslation } from '../hooks/useTranslation.ts';

export default function Home() {
  const { subscription } = useSubscription();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-black relative">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="max-w-2xl mx-auto mt-48 mb-16">
          <div className="flex items-center justify-center gap-2 mb-12">
            <h1 className="text-4xl md:text-5xl font-light animate-fade-in text-center text-gray-900 dark:text-white leading-tight font-helvetica">
              {t('mainTitle')}
            </h1>
            {subscription?.isPro && (
              <span className="bg-[#007BFF] text-xs text-white px-2 py-0.5 rounded animate-fade-in">
                PRO
              </span>
            )}
          </div>

          <RegularSearch />
        </div>
      </div>
      
      <div className="fixed bottom-4 right-4">
        <HelpButton />
      </div>
    </div>
  );
}