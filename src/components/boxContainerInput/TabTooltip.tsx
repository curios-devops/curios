import { useRef, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { Check, Sparkles, FlaskConical, BookOpen } from 'lucide-react';

interface TabTooltipProps {
  tab: 'search' | 'insights' | 'labs';
  userType: 'guest' | 'standard' | 'premium';
  remainingSearches?: number;
  maxSearches?: number;
  onUpgrade: () => void;
  onSignIn: () => void;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  tabPosition?: number; // Add tab position for arrow alignment (0, 1, 2)
}

interface TabConfig {
  icon: React.ElementType;
  badge?: string;
}

const tabConfig: Record<'search' | 'insights' | 'labs', TabConfig> = {
  search: { icon: Sparkles },
  labs: { icon: FlaskConical },
  insights: { icon: BookOpen }
};

// text/content comes from translations via t(...)

export default function TabTooltip({ 
  tab,
  userType,
  remainingSearches = 3,
  maxSearches = 10,
  onUpgrade,
  onSignIn,
  onClose,
  onMouseEnter,
  onMouseLeave}: TabTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const config = tabConfig[tab];
  const { t } = useTranslation();
  const title = t(tab);
  const description = t(`${tab}_description`);
  const proTitle = t(`${tab}_pro_title`);
  const proDescription = t(`${tab}_pro_description`);
  const features: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const key = `${tab}_feature_${i}`;
    const val = t(key);
    if (!val || val === key) break;
    features.push(val);
  }
  const proFeatures: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const key = `${tab}_pro_feature_${i}`;
    const val = t(key);
    if (!val || val === key) break;
    proFeatures.push(val);
  }

  // Calculate arrow position - always centered since container is positioned correctly
  const getArrowPosition = () => {
    return 'left-1/2'; // Always center the arrow since container is positioned relative to tab
  };

  const handleMouseEnter = () => {
    // Keep tooltip open when mouse enters and notify parent
    onMouseEnter?.();
  };

  const handleMouseLeave = () => {
    // Notify parent when mouse leaves tooltip
    onMouseLeave?.();
  };

  const handleProFeatureClick = () => {
    if (userType === 'guest') {
      onSignIn();
    } else if (userType === 'standard') {
      onUpgrade();
    }
    // Premium users don't need to do anything - they already have access
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        // Check if click was on a tab button (don't close if switching tabs)
        const target = event.target as Element;
        const isTabButton = target.closest('[data-tab-button]');
        if (!isTabButton) {
          onClose();
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Show different tooltips based on user type
  const renderGuestTooltip = () => (
    <div
      ref={tooltipRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white dark:bg-[#1a1a1a] rounded-lg px-3 py-2.5 shadow-xl border border-gray-200 dark:border-gray-800 w-64 z-50 transition-colors duration-200"
    >
      {/* Header */}
      <div className="text-left mb-2.5">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-xs font-medium text-gray-900 dark:text-white">{title}</h3>
          {config.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#007BFF] text-white rounded">
              {config.badge}
            </span>
          )}
        </div>
  <p className="text-gray-600 dark:text-gray-400 text-[10px]">{description}</p>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700 my-2.5"></div>

      {/* Pro Toggle Section */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#007BFF] text-white rounded">
              PRO
            </span>
            <span className="text-[#007BFF] text-[10px] font-bold">{proTitle}</span>
          </div>
          {/* Interactive Toggle Switch for Guests */}
          <button
            type="button"
            onClick={handleProFeatureClick}
            className="relative w-8 h-4 rounded-full bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors cursor-pointer group"
            title={t('signInToUpgrade')}
          >
            <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all group-hover:bg-gray-100"></div>
            <div className="absolute inset-0 rounded-full ring-2 ring-transparent group-hover:ring-[#007BFF] group-hover:ring-opacity-30 transition-all"></div>
          </button>
        </div>

  <p className="text-gray-600 dark:text-gray-300 text-[10px] mb-1.5">{proDescription}</p>
      </div>

      {/* Sign In Button */}
        <button
        type="button"
        onClick={onSignIn}
        className="w-full bg-[#007BFF] hover:bg-[#0056b3] text-white py-2 rounded-lg transition-colors text-[10px] font-medium"
      >
        {t('signInForAccess')}
      </button>

      {/* Arrow pointer */}
      <div className={`absolute -top-2 transform -translate-x-1/2 w-4 h-4 bg-white dark:bg-[#1a1a1a] border-l border-t border-gray-200 dark:border-gray-800 rotate-45 ${getArrowPosition()}`}></div>
    </div>
  );

  const renderStandardTooltip = () => (
    <div
      ref={tooltipRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white dark:bg-[#1a1a1a] rounded-lg px-3 py-2.5 shadow-xl border border-gray-200 dark:border-gray-800 w-64 z-50 transition-colors duration-200"
    >
      {/* Header */}
      <div className="text-left mb-2.5">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-xs font-medium text-gray-900 dark:text-white">{title}</h3>
          {config.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#007BFF] text-white rounded">
              {config.badge}
            </span>
          )}
        </div>
  <p className="text-gray-600 dark:text-gray-400 text-[10px]">{description}</p>
      </div>

      {/* Usage Stats */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-600 dark:text-gray-300 text-[10px]">{t('usageToday')}</span>
          <span className="text-gray-900 dark:text-white text-[10px]">{maxSearches - remainingSearches}/{maxSearches}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
          <div 
            className="bg-[#007BFF] h-1 rounded-full transition-all" 
            style={{ width: `${((maxSearches - remainingSearches) / maxSearches) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700 my-2.5"></div>

      {/* Pro Features */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#007BFF] text-white rounded">
              PRO
            </span>
            <span className="text-[#007BFF] text-[10px] font-bold">{proTitle}</span>
          </div>
          <button
            type="button"
            onClick={handleProFeatureClick}
            className="relative w-8 h-4 rounded-full bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors cursor-pointer group"
            title={t('upgradeToPremium')}
          >
            <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all group-hover:bg-gray-100"></div>
            <div className="absolute inset-0 rounded-full ring-2 ring-transparent group-hover:ring-[#007BFF] group-hover:ring-opacity-30 transition-all"></div>
          </button>
        </div>

  <p className="text-gray-600 dark:text-gray-300 text-[10px] mb-1.5">{proDescription}</p>

        {/* Features List */}
        <div className="space-y-0.5 mb-2.5">
          {proFeatures.map((_, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <Check size={10} className="text-[#007BFF] flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-300 text-[10px]">{t(`${tab}_pro_feature_${index+1}`)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade Button */}
      <button
        type="button"
        onClick={onUpgrade}
        className="w-full bg-[#007BFF] hover:bg-[#0056b3] text-white py-2 rounded-lg transition-colors text-[10px] font-medium"
      >
  {t('upgradeToPremium')}
      </button>

      {/* Arrow pointer */}
      <div className={`absolute -top-2 transform -translate-x-1/2 w-4 h-4 bg-white dark:bg-[#1a1a1a] border-l border-t border-gray-200 dark:border-gray-800 rotate-45 ${getArrowPosition()}`}></div>
    </div>
  );

  const renderPremiumTooltip = () => (
    <div
      ref={tooltipRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white dark:bg-[#1a1a1a] rounded-lg px-3 py-2.5 shadow-xl border border-gray-200 dark:border-gray-800 w-64 z-50 transition-colors duration-200"
    >
      {/* Header */}
      <div className="text-left mb-2.5">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-xs font-medium text-gray-900 dark:text-white">{title}</h3>
          {config.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#007BFF] text-white rounded">
              {config.badge}
            </span>
          )}
          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-600 text-white rounded">
            {t('premium')}
          </span>
        </div>
  <p className="text-gray-600 dark:text-gray-400 text-[10px]">{description}</p>
      </div>

      {/* Pro Features Enabled */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-600 text-white rounded">
              PRO
            </span>
            <span className="text-green-600 dark:text-green-400 text-[10px] font-bold">{proTitle} ✓</span>
          </div>
          <div className="relative w-8 h-4 rounded-full bg-[#007BFF] cursor-default">
            <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-white rounded-full"></div>
          </div>
        </div>

  <p className="text-gray-600 dark:text-gray-300 text-[10px] mb-1.5">{proDescription}</p>

        {/* Features List */}
        <div className="space-y-0.5">
          {proFeatures.map((feature, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <Check size={10} className="text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-300 text-[10px]">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Arrow pointer */}
      <div className={`absolute -top-2 transform -translate-x-1/2 w-4 h-4 bg-[#1a1a1a] border-l border-t border-gray-800 rotate-45 ${getArrowPosition()}`}></div>
    </div>
  );

  // Render appropriate tooltip based on user type
  if (userType === 'guest') {
    return renderGuestTooltip();
  } else if (userType === 'standard') {
    return renderStandardTooltip();
  } else if (userType === 'premium') {
    return renderPremiumTooltip();
  }

  return null;
}
