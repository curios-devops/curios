import { useRef, useEffect } from 'react';
import { Check, Wand2 } from 'lucide-react';
import { useAccentColor } from '../../hooks/useAccentColor.ts';

interface ImageGenerationModalProps {
  userType: 'guest' | 'free' | 'premium';
  remainingQuota?: number;
  isHDEnabled: boolean;
  onHDToggle: () => void;
  onGenerate: (useHD: boolean) => void;
  onUpgrade: () => void;
  onSignIn: () => void;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function ImageGenerationModal({ 
  userType,
  remainingQuota = 5,
  isHDEnabled,
  onHDToggle,
  onGenerate,
  onUpgrade,
  onSignIn,
  onClose,
  onMouseEnter,
  onMouseLeave
}: ImageGenerationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const accentColor = useAccentColor();

  const handleMouseEnter = () => {
    onMouseEnter?.();
  };

  const handleMouseLeave = () => {
    onMouseLeave?.();
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        // Check if click was on the trigger button
        const target = event.target as Element;
        const isTriggerButton = target.closest('[data-image-gen-button]');
        if (!isTriggerButton) {
          onClose();
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Render different UI based on user type
  if (userType === 'guest') {
    return (
      <div
        ref={modalRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="absolute bottom-full right-0 mb-2 bg-white dark:bg-[#1a1a1a] rounded-lg px-3 py-2.5 shadow-xl border border-gray-200 dark:border-gray-800 w-64 z-50 transition-colors duration-200"
      >
        {/* Header */}
        <div className="text-left mb-2.5">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xs font-medium text-gray-900 dark:text-white">AI Image</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-[10px]">Generate images with AI - Free for everyone</p>
        </div>
        
        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-2.5"></div>
        
        {/* Pro Toggle Section */}
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 text-[10px] font-semibold text-white rounded" style={{ backgroundColor: accentColor.primary }}>
                PRO
              </span>
              <span className="text-[10px] font-bold" style={{ color: accentColor.primary }}>HD Quality</span>
            </div>
            {/* Interactive Toggle Switch for Guests (triggers sign-in) */}
            <button
              type="button"
              onClick={onSignIn}
              className="relative w-8 h-4 rounded-full bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors cursor-pointer group"
              title="Sign in to use HD quality"
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 0 0 2px ${accentColor.primary}4D`}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
            >
              <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all group-hover:bg-gray-100"></div>
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-[10px] mb-1.5">Sign in for HD quality - sharper visuals, full HD resolution.</p>
        </div>
        
        {/* Generate Button - FREE for guests */}
        <button
          type="button"
          onClick={() => onGenerate(false)}
          className="w-full text-white py-2 rounded-lg transition-colors text-[10px] font-medium mb-2"
          style={{ backgroundColor: accentColor.primary }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = accentColor.hover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = accentColor.primary}
        >
          Generate with AI (Free)
        </button>

        {/* Sign In CTA */}
        <button
          type="button"
          onClick={onSignIn}
          className="w-full border py-1.5 rounded-lg transition-colors text-[10px] font-medium"
          style={{ borderColor: accentColor.primary, color: accentColor.primary }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${accentColor.primary}15`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Sign In for HD
        </button>
        
        {/* Arrow pointer */}
        <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white dark:bg-[#1a1a1a] border-r border-b border-gray-200 dark:border-gray-800 rotate-45"></div>
      </div>
    );
  }

  if (userType === 'premium') {
    // Premium user UI - unlimited HD images
    return (
      <div
        ref={modalRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="absolute bottom-full right-0 mb-2 bg-white dark:bg-[#1a1a1a] rounded-lg p-4 shadow-xl border border-gray-200 dark:border-gray-800 w-80 z-50 transition-colors duration-200"
      >
        {/* Arrow pointing down */}
        <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white dark:bg-[#1a1a1a] border-r border-b border-gray-200 dark:border-gray-800 rotate-45"></div>
        
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wand2 size={18} style={{ color: accentColor.primary }} />
              <h3 className="text-gray-900 dark:text-white font-medium">AI Image</h3>
              <span className="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded-full font-medium">
                PREMIUM
              </span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">
              ×
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Generate images with AI - Free for everyone, unlimited HD for Premium</p>

          {/* HD Toggle */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg">
            <div className="flex items-center gap-2">
              <Wand2 size={16} style={{ color: accentColor.primary }} />
              <span className="text-sm font-medium text-gray-900 dark:text-white">HD Quality</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={isHDEnabled}
                onChange={onHDToggle}
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                isHDEnabled ? '' : 'bg-gray-200 dark:bg-gray-600'
              }`} style={isHDEnabled ? { backgroundColor: accentColor.primary } : undefined}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  isHDEnabled ? 'translate-x-5' : 'translate-x-0'
                } mt-0.5 ml-0.5`}></div>
              </div>
            </label>
          </div>

          {/* Features */}
          <div className="mb-4">
            {isHDEnabled ? (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-medium mb-2" style={{ color: accentColor.primary }}>Premium HD Quality</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Get the highest quality AI-generated images</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Check size={12} style={{ color: accentColor.primary }} />
                    <span>Full HD resolution (1024x1536)</span>
                  </li>
                  <li className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Check size={12} style={{ color: accentColor.primary }} />
                    <span>Enhanced details and clarity</span>
                  </li>
                  <li className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Check size={12} style={{ color: accentColor.primary }} />
                    <span>Professional-grade quality</span>
                  </li>
                </ul>
              </div>
            ) : (
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Check size={14} className="text-green-500" />
                  <span>Fast generation</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Check size={14} className="text-green-500" />
                  <span>Good quality for web</span>
                </li>
              </ul>
            )}
          </div>

          {/* Premium Benefits */}
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h4 className="text-sm font-medium text-green-600 mb-1">✨ Unlimited Usage</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Generate as many images as you need</p>
          </div>

          {/* Generate Button */}
          <button
            onClick={() => onGenerate(isHDEnabled)}
            className="w-full text-white py-2.5 px-4 rounded-lg transition-colors text-sm font-medium"
            style={{ backgroundColor: accentColor.primary }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = accentColor.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = accentColor.primary}
          >
            Generate Image
          </button>
        </div>
      </div>
    );
  }

  if (userType === 'free') {
    // Free user UI - with Pro quota and upgrade prompts
    return (
      <div
        ref={modalRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="absolute bottom-full right-0 mb-2 bg-white dark:bg-[#1a1a1a] rounded-lg p-4 shadow-xl border border-gray-200 dark:border-gray-800 w-80 z-50 transition-colors duration-200"
      >
        {/* Arrow pointing down */}
        <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white dark:bg-[#1a1a1a] border-r border-b border-gray-200 dark:border-gray-800 rotate-45"></div>
        
        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wand2 size={18} style={{ color: accentColor.primary }} />
              <h3 className="text-gray-900 dark:text-white font-medium">AI Image</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">
              ×
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Generate images with AI - Free for everyone, 5 daily HD generations</p>

          {/* HD Toggle */}
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg">
            <div className="flex items-center gap-2">
              <Wand2 size={16} style={{ color: accentColor.primary }} />
              <span className="text-sm font-medium text-gray-900 dark:text-white">HD Quality</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded font-medium">
                Pro
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only"
                checked={isHDEnabled}
                onChange={onHDToggle}
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                isHDEnabled ? '' : 'bg-gray-200 dark:bg-gray-600'
              }`} style={isHDEnabled ? { backgroundColor: accentColor.primary } : undefined}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  isHDEnabled ? 'translate-x-5' : 'translate-x-0'
                } mt-0.5 ml-0.5`}></div>
              </div>
            </label>
          </div>

          {/* Features */}
          <div className="mb-4">
            {isHDEnabled ? (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-medium mb-2" style={{ color: accentColor.primary }}>HD Quality</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Higher quality AI-generated images</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Check size={12} style={{ color: accentColor.primary }} />
                    <span>Enhanced resolution</span>
                  </li>
                  <li className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Check size={12} style={{ color: accentColor.primary }} />
                    <span>Better details</span>
                  </li>
                </ul>
              </div>
            ) : (
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Check size={14} className="text-green-500" />
                  <span>Fast generation</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Check size={14} className="text-green-500" />
                  <span>Good quality for web</span>
                </li>
              </ul>
            )}
          </div>

          {/* Usage Stats - Free users have 5 daily Pro uses */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Daily HD Quota</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {remainingQuota}/5
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: `${(remainingQuota / 5) * 100}%`, backgroundColor: accentColor.primary }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Resets daily. Standard images are always unlimited.
            </p>
          </div>

          {/* Upgrade CTA */}
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <h4 className="text-sm font-medium text-orange-600 mb-1">🚀 Upgrade to Premium</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Get unlimited HD image generation</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => onGenerate(isHDEnabled)}
              disabled={isHDEnabled && remainingQuota === 0}
              className="w-full text-white py-2.5 px-4 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: accentColor.primary }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = accentColor.hover;
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = accentColor.primary;
                }
              }}
            >
              {isHDEnabled && remainingQuota === 0 ? 'HD Quota Reached - Try Standard' : isHDEnabled ? 'Generate with AI (HD)' : 'Generate with AI (Free)'}
            </button>
            <button
              onClick={onUpgrade}
              className="w-full border-2 py-2 px-4 rounded-lg transition-colors text-sm font-medium"
              style={{ borderColor: accentColor.primary, color: accentColor.primary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${accentColor.primary}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Upgrade for Unlimited HD
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

