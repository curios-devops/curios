import { useUserType } from '../hooks/useUserType';
import { Sparkles } from 'lucide-react';
import SearchContainer from '../components/search/SearchContainer';
import HelpButton from '../components/HelpButton';
import ThemeToggle from '../components/theme/ThemeToggle';
import { LanguageSelector } from '../components/common/LanguageSelector';

export default function Home() {
  const userType = useUserType();
  const isPremium = userType === 'premium';

  return (
    <div className="min-h-screen bg-white dark:bg-black relative transition-colors duration-200">
      <div className="absolute top-4 right-16 flex items-center gap-2">
        <LanguageSelector />
        <ThemeToggle />
      </div>

      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="max-w-2xl mx-auto mt-40 mb-8">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="flex items-center justify-center gap-3">
              <h1 className="text-3xl font-medium animate-fade-in flex items-center gap-2">
                <span className="text-[#007BFF]">AI</span>
                <span className="text-gray-900 dark:text-white"> - Smart Search</span>
                {isPremium && (
                  <div className="relative group">
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1a1a1a] px-2 py-0.5 rounded-full">
                      <Sparkles className="text-[#007BFF]" size={14} />
                      <span className="text-[#007BFF] text-sm font-medium">Pro</span>
                    </div>
                  </div>
                )}
              </h1>
            </div>
          </div>

          <SearchContainer />
        </div>
      </div>

      <div className="fixed bottom-4 right-4">
        <HelpButton />
      </div>
    </div>
  );
}