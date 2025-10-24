import { useState, useRef, useEffect } from 'react';
import { Search, BookOpen, FlaskConical } from 'lucide-react';
import TabTooltip from './TabTooltip.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';

export type TabType = 'search' | 'insights' | 'labs';

interface Tab {
  id: TabType;
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  tooltip: string;
}

const tabs: Tab[] = [
  { id: 'search', label: 'search', description: 'Fast answers to everyday questions', icon: Search, tooltip: 'Get quick answers with web search and AI analysis' },
  { id: 'insights', label: 'insights', description: 'Multi-agent research reports', icon: BookOpen, tooltip: 'Get in-depth, multi-agent research reports' },
  { id: 'labs', label: 'labs', description: 'Create projects from scratch', icon: FlaskConical, tooltip: 'Turn your ideas into completed docs, slides, dashboards, and more' }
];

interface ThreeTabSwitchProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  disabled?: boolean;
  userType?: 'guest' | 'standard' | 'premium';
  remainingSearches?: number;
  maxSearches?: number;
  onUpgrade?: () => void;
  onSignIn?: () => void;
}

export default function ThreeTabSwitch({ 
  activeTab, 
  onTabChange, 
  disabled = false,
  userType = 'guest',
  remainingSearches = 3,
  maxSearches = 10,
  onUpgrade = () => {},
  onSignIn = () => {}
}: ThreeTabSwitchProps) {
  const { t } = useTranslation();
  const [hoveredTab, setHoveredTab] = useState<TabType | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<number | null>(null);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const [hoveredTabIndex, setHoveredTabIndex] = useState<number>(0);

  const handleTabClick = (tabId: TabType) => {
    if (disabled) return;
    onTabChange(tabId);
  };

  const handleMouseEnter = (tabId: TabType) => {
    if (disabled || userType !== 'guest') return;
    
    // Clear any existing timeout
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    
    // Find the index of the hovered tab for positioning
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    setHoveredTabIndex(tabIndex);
    setHoveredTab(tabId);
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    if (disabled || userType !== 'guest') return;
    
    // Don't close immediately - wait a bit to see if user moves to tooltip
    tooltipTimeoutRef.current = window.setTimeout(() => {
      if (!isTooltipHovered) {
        setHoveredTab(null);
        setShowTooltip(false);
      }
    }, 300); // 300ms delay before closing
  };

  const handleTooltipMouseEnter = () => {
    // Clear any pending close timeout when entering tooltip
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setIsTooltipHovered(true);
  };

  const handleTooltipMouseLeave = () => {
    setIsTooltipHovered(false);
    // Close tooltip after a delay when leaving tooltip area
    tooltipTimeoutRef.current = window.setTimeout(() => {
      setHoveredTab(null);
      setShowTooltip(false);
    }, 500); // 500ms delay when leaving tooltip
  };

  const handleTooltipClose = () => {
    // Clear any timeouts and close immediately
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setIsTooltipHovered(false);
    setShowTooltip(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      {/* Tab Buttons */}
      <div className="flex items-center bg-gray-50 dark:bg-[#2a2a2a] rounded-lg p-1 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isHovered = hoveredTab === tab.id;
          return (
            <div key={tab.id} className="relative">
              <button
                type="button"
                onClick={() => handleTabClick(tab.id)}
                onMouseEnter={() => handleMouseEnter(tab.id)}
                onMouseLeave={handleMouseLeave}
                disabled={disabled}
                data-tab-button
                className={`
                  relative flex items-center justify-center gap-1 px-3 py-2 rounded-md text-sm font-medium
                  transition-all duration-200 ease-in-out
                  ${disabled 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'cursor-pointer hover:scale-[1.02]'
                  }
                  ${isActive
                    ? 'bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700'
                    : isHovered
                      ? 'bg-gray-100 dark:bg-[#333333] text-gray-700 dark:text-gray-300'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }
                `}
              >
          <Icon 
                  size={16} 
                  className={`
                    transition-colors duration-200
                    ${isActive 
                      ? 'text-[#007BFF]' 
                      : isHovered 
                        ? 'text-gray-600 dark:text-gray-300' 
                        : 'text-gray-500 dark:text-gray-400'
                    }
                  `} 
                />
                {/* label is localized via translation */}
                <span className="sr-only">{t(tab.id)}</span>
              </button>
            </div>
          );
        })}
      </div>
      {/* Single Central Tooltip - only shown for guest users */}
      {showTooltip && hoveredTab && !disabled && userType === 'guest' && (
        <div 
          className="absolute z-50"
          style={{
            // More accurate positioning based on actual tab layout
            // Each tab is approximately 1/3 of the container width, accounting for padding and gaps
            left: hoveredTabIndex === 0 ? '16.67%' : // Left tab - closer to left edge
                  hoveredTabIndex === 1 ? '50%' :    // Middle tab - center
                  '83.33%', // Right tab - closer to right edge
            transform: 'translateX(-50%)'
          }}
        >
          <TabTooltip
            tab={hoveredTab}
            userType={userType}
            remainingSearches={remainingSearches}
            maxSearches={maxSearches}
            onUpgrade={onUpgrade}
            onSignIn={onSignIn}
            onClose={handleTooltipClose}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
            tabPosition={hoveredTabIndex} // Pass tab position for arrow alignment
          />
        </div>
      )}
    </div>
  );
}
