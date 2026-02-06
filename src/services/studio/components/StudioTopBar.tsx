import { Clock, Video, Sparkles, FileText, ArrowLeft, Film } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ShareMenu from '../../../components/ShareMenu';

interface StudioTopBarProps {
  query: string;
  timeAgo: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  shareUrl?: string;
  shareTitle?: string;
  shareText?: string;
  progress?: number;
  currentStage?: string;
  isLoading?: boolean;
}

export default function StudioTopBar({ 
  query, 
  timeAgo, 
  activeTab = 'video',
  onTabChange,
  shareUrl = '',
  shareTitle = '',
  shareText = '',
  progress = 0,
  currentStage = '',
  isLoading = false
}: StudioTopBarProps) {
  const navigate = useNavigate();
  
  const tabs = [
    { id: 'video', label: 'Video', icon: Video },
    { id: 'ideas', label: 'Key Ideas', icon: Sparkles },
    { id: 'script', label: 'Script', icon: FileText },
    { id: 'scenes', label: 'Scenes', icon: Film },
  ];

  return (
    <div className="sticky top-0 bg-white/80 dark:bg-[#111111]/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 z-10 transition-colors duration-200">
      {/* Top row with back arrow, query title and time */}
      <div className="px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 mr-2">
            <button 
              onClick={() => navigate('/')}
              className="transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex-shrink-0"
              style={{ color: 'var(--accent-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Video size={20} style={{ color: 'var(--accent-primary)' }} className="flex-shrink-0" />
              <h1 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-white break-words line-clamp-2">
                {query}
              </h1>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-gray-500 dark:text-gray-400 flex-shrink-0">
              <Clock size={14} />
              <span className="text-xs">{timeAgo}</span>
            </div>
          </div>
          <ShareMenu
            url={shareUrl}
            title={shareTitle}
            text={shareText}
          />
        </div>
      </div>

      {/* Progress bar when loading */}
      {isLoading && (
        <div className="px-4 sm:px-6 pb-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} className="animate-pulse" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{currentStage}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}
      
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
                        ? ''
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    style={isActive ? { 
                      borderColor: 'var(--accent-primary)', 
                      color: 'var(--accent-primary)' 
                    } : undefined}
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
