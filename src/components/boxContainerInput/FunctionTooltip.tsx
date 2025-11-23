import { useRef, useEffect, useState } from 'react';
import { Check, Sparkles, FlaskConical, BookOpen } from 'lucide-react';
import { useAccentColor } from '../../hooks/useAccentColor.ts';
import { useTranslation } from '../../hooks/useTranslation.ts';

interface FunctionTooltipProps {
  tab: 'search' | 'insights' | 'labs';
  userType: 'guest' | 'free' | 'premium'; // Updated to match useUserType
  remainingQuota?: number;
  onUpgrade: () => void;
  onSignIn: () => void;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onProToggle: (tab: 'search' | 'insights' | 'labs', enabled: boolean) => void;
}

interface TabConfig {
  icon: React.ElementType;
  badge?: string;
}

// keep icons/badges in code, but fetch all text (title/description/features/pro text) from translations
const tabConfig: Record<'search' | 'insights' | 'labs', TabConfig> = {
  search: { icon: Sparkles },
  insights: { icon: BookOpen },
  labs: { icon: FlaskConical }
};

export default function FunctionTooltip({ 
  tab,
  userType,
  remainingQuota = 5,
  onUpgrade,
  onSignIn,
  onClose,
  onMouseEnter,
  onMouseLeave,
  onProToggle
}: FunctionTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const config = tabConfig[tab];
  const [isProEnabled, setIsProEnabled] = useState(false);
  const accentColor = useAccentColor();
  const { t } = useTranslation();

  // derive all text from translations so UI updates with language
  const title = t(tab);
  const description = t(`${tab}_description`);
  const features: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const key = `${tab}_feature_${i}`;
    const val = t(key);
    if (!val || val === key) break;
    features.push(val);
  }
  const proTitle = t(`${tab}_pro_title`);
  const proDescription = t(`${tab}_pro_description`);
  const proFeatures: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const key = `${tab}_pro_feature_${i}`;
    const val = t(key);
    if (!val || val === key) break;
    proFeatures.push(val);
  }

  const handleMouseEnter = () => {
    onMouseEnter?.();
  };

  const handleMouseLeave = () => {
    onMouseLeave?.();
  };

  const handleProToggle = () => {
    const newProState = !isProEnabled;
    setIsProEnabled(newProState);
    onProToggle(tab, newProState);
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

  // Render different UI based on user type
  if (userType === 'guest') {
    // Reverted to original guest UI design (dark, PRO badge, fake toggle, sign-in button)
    return (
      <div
        ref={tooltipRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="absolute top-full left-0 sm:left-1/2 sm:transform sm:-translate-x-1/2 mt-2 bg-white dark:bg-[#1a1a1a] rounded-lg px-3 py-2.5 shadow-xl border border-gray-200 dark:border-gray-800 w-64 z-50 transition-colors duration-200"
      >
        {/* Header */}
        <div className="text-left mb-2.5">
            <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xs font-medium text-gray-900 dark:text-white">{title}</h3>
            {config.badge && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold text-white rounded" style={{ backgroundColor: accentColor.primary }}>
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
              <span className="px-1.5 py-0.5 text-[10px] font-semibold text-white rounded" style={{ backgroundColor: accentColor.primary }}>
                {t('pro')}
              </span>
              <span className="text-[10px] font-bold" style={{ color: accentColor.primary }}>{proTitle}</span>
            </div>
            {/* Interactive Toggle Switch for Guests (triggers sign-in) */}
            <button
              type="button"
              onClick={onSignIn}
              className="relative w-8 h-4 rounded-full bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors cursor-pointer group"
              title={t('signInToUpgrade')}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 0 0 2px ${accentColor.primary}4D`}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
            >
              <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all group-hover:bg-gray-100"></div>
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-[10px] mb-1.5">{proDescription}</p>
        </div>
        {/* Sign In Button */}
        <button
          type="button"
          onClick={onSignIn}
          className="w-full text-white py-2 rounded-lg transition-colors text-[10px] font-medium"
          style={{ backgroundColor: accentColor.primary }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = accentColor.hover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = accentColor.primary}
        >
          {t('signInForAccess')}
        </button>
        {/* Arrow pointer - aligned differently on mobile vs desktop */}
        <div className="absolute -top-2 left-4 sm:left-1/2 sm:transform sm:-translate-x-1/2 w-4 h-4 bg-white dark:bg-[#1a1a1a] border-l border-t border-gray-200 dark:border-gray-800 rotate-45"></div>
      </div>
    );
  }

  if (userType === 'premium') {
    // Premium user UI - no limitations
    return (
      <div
        ref={tooltipRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="absolute left-0 sm:left-1/2 sm:transform sm:-translate-x-1/2 top-full mt-2 bg-white dark:bg-[#1a1a1a] rounded-lg p-4 shadow-xl border border-gray-200 dark:border-gray-800 w-80 z-50 transition-colors duration-200"
      >
        {/* Arrow pointing up - aligned differently on mobile vs desktop */}
        <div className="absolute -top-2 left-4 sm:left-1/2 sm:transform sm:-translate-x-1/2 w-4 h-4 bg-white dark:bg-[#1a1a1a] border-l border-t border-gray-200 dark:border-gray-800 rotate-45"></div>
        
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <config.icon size={18} style={{ color: accentColor.primary }} />
              <h3 className="text-gray-900 dark:text-white font-medium">{title}</h3>
              <span className="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded-full font-medium">
                {t('premium')}
              </span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              ×
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>

          {/* Pro Toggle */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="text-[#007BFF]" size={16} />
              <span className="text-sm font-medium text-gray-900 dark:text-white">{t('proMode')}</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={isProEnabled}
                onChange={handleProToggle}
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                isProEnabled ? 'bg-[#007BFF]' : 'bg-gray-200 dark:bg-gray-600'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  isProEnabled ? 'translate-x-5' : 'translate-x-0'
                } mt-0.5 ml-0.5`}></div>
              </div>
            </label>
          </div>

          {/* Features */}
          <div className="mb-4">
            {isProEnabled ? (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-medium mb-2" style={{ color: accentColor.primary }}>{proTitle}</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{proDescription}</p>
                <ul className="space-y-1">
                  {proFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <Check size={12} style={{ color: accentColor.primary }} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ul className="space-y-2">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check size={14} className="text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Premium Benefits */}
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h4 className="text-sm font-medium text-green-600 mb-1">✨ {t('usageToday')}</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">{t('unlockPremiumFeatures')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (userType === 'free') {
    // Free user UI - with Pro quota and upgrade prompts
    return (
      <div
        ref={tooltipRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="absolute left-0 sm:left-1/2 sm:transform sm:-translate-x-1/2 top-full mt-2 bg-white dark:bg-[#1a1a1a] rounded-lg p-4 shadow-xl border border-gray-200 dark:border-gray-800 w-80 z-50 transition-colors duration-200"
      >
        {/* Arrow pointing up - aligned differently on mobile vs desktop */}
        <div className="absolute -top-2 left-4 sm:left-1/2 sm:transform sm:-translate-x-1/2 w-4 h-4 bg-white dark:bg-[#1a1a1a] border-l border-t border-gray-200 dark:border-gray-800 rotate-45"></div>
        
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <config.icon size={18} style={{ color: accentColor.primary }} />
              <h3 className="text-gray-900 dark:text-white font-medium text-sm">{title}</h3>
              {config.badge && (
                <span className="text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-full font-medium">
                  {config.badge}
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg">
              ×
            </button>
          </div>

          {/* Description */}
          <p className="text-[10px] text-gray-600 dark:text-gray-400 mb-3">{description}</p>

          {/* Pro Toggle */}
          <div className="flex items-center justify-between mb-3 p-2.5 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg">
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: accentColor.primary }} />
              <span className="text-[10px] font-medium text-gray-900 dark:text-white">{t('proMode')}</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={isProEnabled}
                onChange={handleProToggle}
              />
              <div className={`w-8 h-4 rounded-full transition-colors ${
                isProEnabled ? '' : 'bg-gray-200 dark:bg-gray-600'
              }`} style={isProEnabled ? { backgroundColor: accentColor.primary } : undefined}>
                <div className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform ${
                  isProEnabled ? 'translate-x-4' : 'translate-x-0'
                } mt-0.5 ml-0.5`}></div>
              </div>
            </label>
          </div>

          {/* Features */}
          <div className="mb-2.5">
            {isProEnabled ? (
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="text-[10px] font-medium mb-1.5" style={{ color: accentColor.primary }}>{proTitle}</h4>
                <p className="text-[10px] text-gray-600 dark:text-gray-400 mb-2">{proDescription}</p>
                <ul className="space-y-1">
                  {proFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-[10px] text-gray-600 dark:text-gray-400">
                      <Check size={10} style={{ color: accentColor.primary }} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-[10px] text-gray-600 dark:text-gray-400">
                    <Check size={10} className="text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Usage Stats - Free users have 5 daily Pro uses */}
          <div className="mb-3 p-2.5 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg">
              <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-gray-600 dark:text-gray-400">{t('dailyProQuota')}</span>
              <span className="text-xs font-medium text-gray-900 dark:text-white">
                {remainingQuota}/5
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(remainingQuota / 5) * 100}%`, backgroundColor: accentColor.primary }}
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={onUpgrade}
            className="w-full text-white py-2 rounded-lg transition-colors text-[10px] font-medium"
            style={{ backgroundColor: accentColor.primary }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = accentColor.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = accentColor.primary}
          >
            {t('upgradeToPremium')}
          </button>
        </div>
      </div>
    );
  }
}
