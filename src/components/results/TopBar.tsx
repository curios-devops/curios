import { Clock, Search, Image, Video, Newspaper, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ShareMenu from '../ShareMenu';

interface TopBarProps {
  query: string;
  timeAgo: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  shareUrl?: string;
  shareTitle?: string;
  shareText?: string;
  images?: Array<{ url: string; alt?: string }>;
}

export default function TopBar({ 
  query, 
  timeAgo, 
  activeTab = 'answer',
  onTabChange,
  shareUrl = '',
  shareTitle = '',
  shareText = '',
  images
}: TopBarProps) {
  const navigate = useNavigate();
  
  const tabs = [
    { id: 'answer', label: 'Overview', icon: Search },
    { id: 'images', label: 'Images', icon: Image },
    { id: 'videos', label: 'Videos', icon: Video },
    { id: 'news', label: 'Sources', icon: Newspaper },
  ];

  return (
    <div className="sticky top-0 bg-white/80 dark:bg-[#111111]/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 z-10 transition-colors duration-200">
      {/* Top row with back arrow, query title and time */}
      <div className="px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 mr-2">
            <button 
              onClick={() => navigate('/')}
              className="text-[#0095FF] hover:text-[#0080FF] transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex-shrink-0"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-white truncate">{query}</h1>
            <div className="hidden sm:flex items-center gap-1.5 text-gray-500 dark:text-gray-400 flex-shrink-0">
              <Clock size={14} />
              <span className="text-xs">{timeAgo}</span>
            </div>
          </div>
          <ShareMenu
            url={shareUrl}
            title={shareTitle}
            text={shareText}
            query={query}
            images={images}
          />
        </div>
      </div>
      
      {/* Tab navigation */}
      {onTabChange && (
        <div className="px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? 'border-[#0095FF] text-[#0095FF]'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}