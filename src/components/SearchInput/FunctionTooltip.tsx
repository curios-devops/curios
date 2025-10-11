import { useRef, useEffect, useState } from 'react';
import { Check, Sparkles, FlaskConical, BookOpen } from 'lucide-react';

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
  title: string;
  description: string;
  icon: React.ElementType;
  features: string[];
  badge?: string;
}

const tabConfig: Record<'search' | 'insights' | 'labs', TabConfig> = {
  search: {
    title: 'Search',
    description: 'Fast answers to everyday questions',
    icon: Sparkles,
    features: [
      '3x more sources',
      'More detailed answers', 
      'Advanced AI models'
    ]
  },
  insights: {
    title: 'Insights',
    description: 'Multi-agent research reports for any topic',
    icon: BookOpen,
    features: [
      'Planner, Search, and Writer agents',
      'Web search and synthesis',
      'Detailed markdown report',
      'Follow-up research questions'
    ]
  },
  labs: {
    title: 'Labs',
    description: 'Execute simple tasks and create projects',
    icon: FlaskConical,
    features: [
      'Create docs, slides, dashboards',
      'Interactive prototypes',
      'AI-powered content generation'
    ]
  }
};

// Pro features description for each tab
const proConfig: Record<'search' | 'insights' | 'labs', { title: string; description: string; features: string[] }> = {
  search: {
    title: 'Try Pro Search',
    description: '3x more sources with powerful models and increased limits',
    features: [
      '3x more sources',
      'More detailed answers', 
      'Advanced AI models'
    ]
  },
  insights: {
    title: 'Try Research',
    description: 'In-depth reports with more sources and advanced reasoning',
    features: [
      'Multi-agent coordination',
      'Deeper source analysis',
      'Advanced reasoning models'
    ]
  },
  labs: {
    title: 'Try Pro Labs',
    description: 'Tackle big tasks with AI — create docs, slides, webs, or even book a trip or order dinner',
    features: [
      'Complex project generation',
      'Advanced task automation',
      'Unlimited iterations'
    ]
  }
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
  const proFeatures = proConfig[tab];
  const [isProEnabled, setIsProEnabled] = useState(false);

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
        className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white dark:bg-[#1a1a1a] rounded-lg px-3 py-2.5 shadow-xl border border-gray-200 dark:border-gray-800 w-64 z-50 transition-colors duration-200"
      >
        {/* Header */}
        <div className="text-left mb-2.5">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xs font-medium text-gray-900 dark:text-white">{config.title}</h3>
            {config.badge && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#007BFF] text-white rounded">
                {config.badge}
              </span>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-[10px]">{config.description}</p>
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
              <span className="text-[#007BFF] text-[10px] font-bold">{proFeatures.title}</span>
            </div>
            {/* Interactive Toggle Switch for Guests (triggers sign-in) */}
            <button
              type="button"
              onClick={onSignIn}
              className="relative w-8 h-4 rounded-full bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors cursor-pointer group"
              title="Sign in to enable Pro features"
            >
              <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all group-hover:bg-gray-100"></div>
              <div className="absolute inset-0 rounded-full ring-2 ring-transparent group-hover:ring-[#007BFF] group-hover:ring-opacity-30 transition-all"></div>
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-[10px] mb-1.5">{proFeatures.description}</p>
        </div>
        {/* Sign In Button */}
        <button
          type="button"
          onClick={onSignIn}
          className="w-full bg-[#007BFF] hover:bg-[#0056b3] text-white py-2 rounded-lg transition-colors text-[10px] font-medium"
        >
          Sign in for access
        </button>
        {/* Arrow pointer */}
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white dark:bg-[#1a1a1a] border-l border-t border-gray-200 dark:border-gray-800 rotate-45"></div>
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
        className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 bg-white dark:bg-[#1a1a1a] rounded-lg p-4 shadow-xl border border-gray-200 dark:border-gray-800 w-80 z-50 transition-colors duration-200"
      >
        {/* Arrow pointing up */}
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white dark:bg-[#1a1a1a] border-l border-t border-gray-200 dark:border-gray-800 rotate-45"></div>
        
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <config.icon className="text-[#007BFF]" size={18} />
              <h3 className="text-gray-900 dark:text-white font-medium">{config.title}</h3>
              <span className="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded-full font-medium">
                PREMIUM
              </span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              ×
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{config.description}</p>

          {/* Pro Toggle */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="text-[#007BFF]" size={16} />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Pro Mode</span>
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
                <h4 className="text-sm font-medium text-[#007BFF] mb-2">{proFeatures.title}</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{proFeatures.description}</p>
                <ul className="space-y-1">
                  {proFeatures.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <Check size={12} className="text-[#007BFF]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ul className="space-y-2">
                {config.features.map((feature, index) => (
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
            <h4 className="text-sm font-medium text-green-600 mb-1">✨ Premium Benefits Active</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Unlimited searches • Full Pro access • Priority support</p>
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
        className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 bg-white dark:bg-[#1a1a1a] rounded-lg p-4 shadow-xl border border-gray-200 dark:border-gray-800 w-80 z-50 transition-colors duration-200"
      >
        {/* Arrow pointing up */}
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white dark:bg-[#1a1a1a] border-l border-t border-gray-200 dark:border-gray-800 rotate-45"></div>
        
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <config.icon className="text-[#007BFF]" size={18} />
              <h3 className="text-gray-900 dark:text-white font-medium">{config.title}</h3>
              {config.badge && (
                <span className="text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-full font-medium">
                  {config.badge}
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              ×
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{config.description}</p>

          {/* Pro Toggle */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="text-[#007BFF]" size={16} />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Pro Mode</span>
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
                <h4 className="text-sm font-medium text-[#007BFF] mb-2">{proFeatures.title}</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{proFeatures.description}</p>
                <ul className="space-y-1">
                  {proFeatures.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <Check size={12} className="text-[#007BFF]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ul className="space-y-2">
                {config.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Check size={14} className="text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Usage Stats - Free users have 5 daily Pro uses */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Daily Pro Quota</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {remainingQuota}/5
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-[#007BFF] h-2 rounded-full transition-all duration-300"
                style={{ width: `${(remainingQuota / 5) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Pro Search, Research & Pro Labs count towards quota
            </p>
          </div>

          {/* Upgrade CTA */}
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="text-sm font-medium text-orange-600 mb-1">🚀 Upgrade to Premium</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Get unlimited Pro searches and full Pro access</p>
          </div>

          {/* Action Button */}
          <button
            onClick={onUpgrade}
            className="w-full bg-[#007BFF] text-white py-2 px-4 rounded-lg hover:bg-[#0056b3] transition-colors text-sm font-medium"
          >
            Upgrade to Premium
          </button>
        </div>
      </div>
    );
  }
}
