import { useState, useRef, useEffect } from 'react';
import { Search, BookOpen, FlaskConical } from 'lucide-react';
import { useSession } from '../../hooks/useSession.ts';
import { useSubscription } from '../../hooks/useSubscription.ts';
import { useProQuota } from '../../hooks/useProQuota.ts';
import { useAccentColor } from '../../hooks/useAccentColor.ts';
import FunctionTooltip from './FunctionTooltip.tsx';
import { useTranslation } from '../../hooks/useTranslation.ts';

export type FunctionType = 'search' | 'insights' | 'labs' | 'pro-search' | 'research' | 'pro-labs';
export type TabType = 'search' | 'insights' | 'labs';
export type UserType = 'guest' | 'free' | 'premium';

interface Tab {
  id: TabType;
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  tooltip: string;
}

const tabs: Tab[] = [
  {
    id: 'search',
    label: 'Search',
    description: 'Fast answers to everyday questions',
    icon: Search,
    tooltip: 'Get quick answers with web search and AI analysis'
  },
  {
    id: 'insights',
    label: 'Insights',
    description: 'Multi-agent research reports',
    icon: BookOpen,
    tooltip: 'Get in-depth, multi-agent research reports'
  },
  {
    id: 'labs',
    label: 'Labs',
    description: 'Create projects from scratch',
    icon: FlaskConical,
    tooltip: 'Turn your ideas into completed docs, slides, dashboards, and more'
  }
];

interface FunctionSelectorProps {
  selectedFunction: FunctionType;
  onFunctionSelect: (functionType: FunctionType) => void;
  onSignUpRequired: () => void;
  onUpgrade?: () => void; // Added: callback to open ProModal from parent
  className?: string;
}

export default function FunctionSelector({
  selectedFunction,
  onFunctionSelect,
  onSignUpRequired,
  onUpgrade,
  className = ''
}: FunctionSelectorProps) {
  const { t } = useTranslation();
  const [hoveredTab, setHoveredTab] = useState<TabType | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isProEnabled, setIsProEnabled] = useState(false);
  const tooltipTimeoutRef = useRef<number | null>(null);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const [hoveredTabIndex, setHoveredTabIndex] = useState<number>(0);

  const { session, isLoading: sessionLoading } = useSession();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const { remainingQuota } = useProQuota();
  const accentColor = useAccentColor();

  // Convert FunctionType to TabType
  const getTabFromFunction = (functionType: FunctionType): TabType => {
    switch (functionType) {
      case 'search':
      case 'pro-search':
        return 'search';
      case 'insights':
      case 'research':
        return 'insights';
      case 'labs':
      case 'pro-labs':
        return 'labs';
      default:
        return 'search';
    }
  };

  // Convert TabType to FunctionType based on pro state
  const getFunctionFromTab = (tab: TabType, isPro: boolean): FunctionType => {
    if (isPro) {
      switch (tab) {
        case 'search':
          return 'pro-search';
        case 'insights':
          return 'research';
        case 'labs':
          return 'pro-labs';
      }
    } else {
      return tab;
    }
  };

  // Determine user type from current session/subscription state
  const getUserType = (): UserType => {
    if (!session) return 'guest';
    return subscription?.isActive ? 'premium' : 'free';
  };

  // Compute derived values (safe after hooks are called)
  const activeTab = getTabFromFunction(selectedFunction);
  const userType = getUserType();

  // Enhanced debug logging
  useEffect(() => {
    console.log('FunctionSelector - User State:', {
      sessionLoading,
      subscriptionLoading,
      hasSession: !!session,
      userType,
      showTooltip,
      hoveredTab
    });
  }, [sessionLoading, subscriptionLoading, session, userType, showTooltip, hoveredTab]);

  // Determine if pro is enabled based on selected function
  useEffect(() => {
    const proFunctions: FunctionType[] = ['pro-search', 'research', 'pro-labs'];
    setIsProEnabled(proFunctions.includes(selectedFunction));
  }, [selectedFunction]);

  const handleTabClick = (tabId: TabType) => {
    // Always select the basic function when clicking tabs, regardless of pro state
    // This allows all users (guest, standard, premium) to select basic functions
    const functionType = getFunctionFromTab(tabId, false); // Always use basic function
    onFunctionSelect(functionType);
  };

  const handleProToggle = (tab: TabType, enabled: boolean) => {
    // Only show Sign Up Modal when guests try to enable Pro options
    if (enabled && userType === 'guest') {
      onSignUpRequired();
      return;
    }
    
    const functionType = getFunctionFromTab(tab, enabled);
    onFunctionSelect(functionType);
  };

  const handleMouseEnter = (tabId: TabType) => {
    // Show tooltips for guests and standard users (premium users don't need usage limit info)
    if (userType === 'premium') return; 
    
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
    // Hide tooltips only if not premium user
    if (userType === 'premium') return;
    
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
    <div className={`relative ${className}`}>
      {/* Tab Buttons */}
      <div className="flex items-center bg-gray-50 dark:bg-[#2a2a2a] rounded-lg p-1 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isHovered = hoveredTab === tab.id;
          const isPro = isProEnabled && activeTab === tab.id;
          
          return (
            <div key={tab.id} className="relative">
              <button
                type="button"
                onClick={() => handleTabClick(tab.id)}
                onMouseEnter={() => handleMouseEnter(tab.id)}
                onMouseLeave={handleMouseLeave}
                data-tab-button
                className={`
                  relative flex items-center justify-center gap-1 px-3 py-2 rounded-md text-sm font-medium
                  transition-all duration-200 ease-in-out
                  cursor-pointer hover:scale-[1.02]
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
                      ? ''
                      : isHovered 
                        ? 'text-gray-600 dark:text-gray-300' 
                        : 'text-gray-500 dark:text-gray-400'
                    }
                  `}
                  style={isActive ? { color: accentColor.primary } : undefined}
                />
                {tab.badge && (
                  <span className="text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-full font-medium">
                    {tab.badge}
                  </span>
                )}
                {isPro && (
                  <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: accentColor.primary }}>
                    {t('pro')}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Tooltip for guest and standard users - only show when data is loaded */}
      {showTooltip && hoveredTab && userType !== 'premium' && !sessionLoading && !subscriptionLoading && (
        <div 
          className="absolute z-50"
          style={{
            // Position based on hovered tab
            left: hoveredTabIndex === 0 ? '16.67%' : 
                  hoveredTabIndex === 1 ? '50%' :    
                  '83.33%',
            transform: 'translateX(-50%)'
          }}
        >
          <FunctionTooltip
            tab={hoveredTab}
            userType={userType}
            remainingQuota={remainingQuota}
            onUpgrade={() => {
              console.log('FunctionTooltip onUpgrade clicked - calling parent handler');
              console.log('onUpgrade prop exists?', typeof onUpgrade, onUpgrade);
              handleTooltipClose();
              if (onUpgrade) {
                console.log('Calling onUpgrade...');
                onUpgrade();
              } else {
                console.error('ERROR: onUpgrade is undefined! Not passed from ThreeSelector');
              }
            }}
            onSignIn={onSignUpRequired}
            onClose={handleTooltipClose}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
            onProToggle={handleProToggle}
          />
        </div>
      )}
    </div>
  );
}
