import SearchBox from './SearchInput/SearchBox.tsx';
import HelpButton from './HelpButton.tsx';
import { useTranslation } from '../hooks/useTranslation.ts';

interface MainContentProps {
  _isCollapsed?: boolean;
}

export default function MainContent({ _isCollapsed: _ }: MainContentProps) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-black relative">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="max-w-2xl mx-auto mt-48 mb-16">
          <h1 className="text-4xl md:text-5xl font-light mb-12 animate-fade-in text-center text-gray-900 dark:text-white leading-tight font-helvetica">
            {t('mainTitle')}
          </h1>

          <SearchBox />
        </div>
      </div>
      
      {/* Help Button */}
      <div className="fixed bottom-4 right-4">
        <HelpButton />
      </div>
    </div>
  );
}