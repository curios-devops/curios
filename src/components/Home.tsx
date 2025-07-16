import RegularSearch from '../components/search/RegularSearch.tsx';
import HelpButton from '../components/HelpButton.tsx';
import { useSubscription } from '../hooks/useSubscription.ts';

export default function Home() {
  const { subscription } = useSubscription();

  return (
    <div className="min-h-screen bg-black relative">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="max-w-2xl mx-auto mt-48 mb-16">
          <div className="flex items-center justify-center gap-2 mb-12">
            <h1 className="text-3xl font-bold animate-fade-in">
              <span className="text-[#007BFF]">AI</span>
              <span className="text-white"> Web Search</span>
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