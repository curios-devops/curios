import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { LifeBuoy, Settings, Sparkles, User } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useAccentColor } from '../../hooks/useAccentColor.ts';
import GuestSettingsModal from './GuestSettingsModal.tsx';

// Lazy so guests don't pull in Stripe unless they open the pricing modal.
const ProModal = lazy(() => import('../subscription/ProModal.tsx'));

interface SidebarGuestSectionProps {
  isCollapsed: boolean;
  onSignInClick: () => void;
}

// Guest-only sidebar footer (see reference: ChatGPT's logged-out menu):
// "See plans and pricing", "Settings", "Help", then the sign-in card.
export default function SidebarGuestSection({ isCollapsed, onSignInClick }: SidebarGuestSectionProps) {
  const { t } = useTranslation();
  const accentColor = useAccentColor();
  const [showPricing, setShowPricing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) setShowHelp(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const helpItems = [
    { label: t('helpAndFaq'), href: '#' },
    { label: t('releaseNotes'), href: '#' },
    { label: t('termsAndPolicies'), href: '/policies' },
    { label: t('keyboardShortcuts'), href: '#' },
    { label: t('reportIllegalContent'), href: '#' },
  ];

  const rowClass = `flex items-center rounded-lg transition-colors w-full ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-2 py-2'}`;
  const rowStyle = { color: 'var(--ui-text-secondary)' } as const;
  const onEnter = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.backgroundColor = 'var(--ui-bg-elevated)'; e.currentTarget.style.color = 'var(--ui-text-primary)'; };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--ui-text-secondary)'; };

  return (
    <div className="flex flex-col gap-1">
      {/* See plans and pricing */}
      <button type="button" onClick={() => setShowPricing(true)} className={rowClass} style={rowStyle}
        onMouseEnter={onEnter} onMouseLeave={onLeave} title="See plans and pricing" aria-label="See plans and pricing">
        <Sparkles size={20} className="shrink-0" />
        {!isCollapsed && <span className="text-sm font-medium tracking-[-0.01em]">See plans and pricing</span>}
      </button>

      {/* Settings */}
      <button type="button" onClick={() => setShowSettings(true)} className={rowClass} style={rowStyle}
        onMouseEnter={onEnter} onMouseLeave={onLeave} title={t('settings') || 'Settings'} aria-label={t('settings') || 'Settings'}>
        <Settings size={20} className="shrink-0" />
        {!isCollapsed && <span className="text-sm font-medium tracking-[-0.01em]">{t('settings') || 'Settings'}</span>}
      </button>

      {/* Help (opens the same menu as the old floating "?" button) */}
      <div className="relative" ref={helpRef}>
        <button type="button" onClick={() => setShowHelp((v) => !v)} className={rowClass} style={rowStyle}
          onMouseEnter={onEnter} onMouseLeave={onLeave} title={t('help') || 'Help'} aria-label={t('help') || 'Help'}>
          <LifeBuoy size={20} className="shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium tracking-[-0.01em]">{t('help') || 'Help'}</span>}
        </button>
        {showHelp && (
          <div
            className="absolute left-0 bottom-full mb-2 w-44 rounded-xl shadow-lg border py-1 z-50 animate-fade-in"
            style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-subtle)' }}
          >
            {helpItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="block px-4 py-2 text-xs rounded-lg transition-colors"
                style={{ color: 'var(--ui-text-primary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)'; e.currentTarget.style.color = accentColor.primary; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--ui-text-primary)'; }}
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Sign-in card */}
      {isCollapsed ? (
        <div className="relative group mt-1">
          <button type="button" onClick={onSignInClick} className={rowClass} style={rowStyle}
            onMouseEnter={onEnter} onMouseLeave={onLeave} aria-label={t('logIn')}>
            <User size={22} className="shrink-0" />
          </button>
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-8 hidden group-hover:block text-sm py-1 px-2 rounded whitespace-normal"
            style={{ backgroundColor: 'var(--ui-bg-elevated)', color: 'var(--ui-text-primary)', border: '1px solid var(--ui-border-subtle)' }}
          >
            {t('logIn')}
          </div>
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--ui-border-subtle)' }}>
          <h4 className="text-sm font-semibold" style={{ color: 'var(--ui-text-primary)' }}>Get responses tailored to you</h4>
          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--ui-text-secondary)' }}>
            Log in to get answers based on saved chats, plus create images and upload files.
          </p>
          <button
            type="button"
            onClick={onSignInClick}
            className="mt-3 w-full py-2 rounded-full text-sm font-medium border transition-colors"
            style={{ color: 'var(--ui-text-primary)', borderColor: 'var(--ui-border-default)', backgroundColor: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ui-bg-elevated)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {t('logIn')}
          </button>
        </div>
      )}

      {showSettings && <GuestSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />}
      {showPricing && (
        <Suspense fallback={null}>
          <ProModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
        </Suspense>
      )}
    </div>
  );
}
