import { lazy, Suspense, useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Sparkles, User } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation.ts';
import GuestSettingsModal from './GuestSettingsModal.tsx';
import SidebarHelpMenu from './SidebarHelpMenu.tsx';
import { sidebarRowClass, sidebarRowStyle, sidebarRowEnter, sidebarRowLeave } from './sidebarMenuRow.ts';

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
  const [showPricing, setShowPricing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      {/* See plans and pricing */}
      <button type="button" onClick={() => setShowPricing(true)} className={sidebarRowClass(isCollapsed)} style={sidebarRowStyle}
        onMouseEnter={sidebarRowEnter} onMouseLeave={sidebarRowLeave} title={t('seePlansAndPricing')} aria-label={t('seePlansAndPricing')}>
        <Sparkles size={20} className="shrink-0" />
        {!isCollapsed && <span className="text-sm font-medium tracking-[-0.01em]">{t('seePlansAndPricing')}</span>}
      </button>

      {/* Settings — compact modal (Theme, Accent, Language) for guests */}
      <button type="button" onClick={() => setShowSettings(true)} className={sidebarRowClass(isCollapsed)} style={sidebarRowStyle}
        onMouseEnter={sidebarRowEnter} onMouseLeave={sidebarRowLeave} title={t('settings') || 'Settings'} aria-label={t('settings') || 'Settings'}>
        <Settings size={20} className="shrink-0" />
        {!isCollapsed && <span className="text-sm font-medium tracking-[-0.01em]">{t('settings') || 'Settings'}</span>}
      </button>

      {/* Help */}
      <SidebarHelpMenu isCollapsed={isCollapsed} />

      {/* Sign-in card */}
      {isCollapsed ? (
        <div className="relative group mt-1">
          <button type="button" onClick={onSignInClick} className={sidebarRowClass(isCollapsed)} style={sidebarRowStyle}
            onMouseEnter={sidebarRowEnter} onMouseLeave={sidebarRowLeave} aria-label={t('logIn')}>
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
      {showPricing && createPortal(
        <Suspense fallback={null}>
          <ProModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
        </Suspense>,
        document.body,
      )}
    </div>
  );
}
