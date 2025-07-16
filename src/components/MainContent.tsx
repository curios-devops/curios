import SearchBox from './SearchInput/SearchBox.tsx';
import HelpButton from './HelpButton.tsx';

interface MainContentProps {
  _isCollapsed: boolean;
}

export default function MainContent({ _isCollapsed }: MainContentProps) {
  return (
    <div className="min-h-screen bg-black relative">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="max-w-2xl mx-auto mt-48 mb-16">
          <h1 className="text-2xl font-medium mb-12 animate-fade-in text-center">
            <span className="text-[#007BFF]">AI</span>
            <span className="text-white"> - Web Search</span>
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