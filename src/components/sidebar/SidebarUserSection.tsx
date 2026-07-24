import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase.ts';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useAccentColor } from '../../hooks/useAccentColor.ts';
import { useTheme } from '../theme/ThemeContext.tsx';
import { getUserDisplayName } from '../../utils/userName.ts';
import SidebarHelpMenu from './SidebarHelpMenu.tsx';
import { sidebarRowClass, sidebarRowStyle, sidebarRowEnter, sidebarRowLeave } from './sidebarMenuRow.ts';
import type { Session } from '@supabase/supabase-js';

// Lazy so we only pull in Stripe when the user opens the pricing/upgrade modal.
const ProModal = lazy(() => import('../subscription/ProModal.tsx'));

interface SidebarUserSectionProps {
  session: Session;
  isPro: boolean;
  isCollapsed: boolean;
}

// Two-letter initials (first + last name), or the email initial as a fallback.
function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return (email[0] || '?').toUpperCase();
}

// Signed-in sidebar footer: plans (free only) + Settings + Help, then the
// account card (avatar, name, Free/Pro status, Upgrade button for free users).
export default function SidebarUserSection({ session, isPro, isCollapsed }: SidebarUserSectionProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const accentColor = useAccentColor();
  const { accentColor: selectedAccentColor } = useTheme();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showPricing, setShowPricing] = useState(false);

  const email = session.user.email || '';
  const displayName = getUserDisplayName(session.user) ?? email.split('@')[0];
  const initials = getInitials(getUserDisplayName(session.user), email);

  const isGrayAccent = selectedAccentColor === 'gray';
  const avatarBg = isGrayAccent ? accentColor.dark : accentColor.primary;
  const avatarFg = isGrayAccent ? accentColor.light : 'var(--ui-text-on-accent)';

  useEffect(() => {
    if (!session.user.id) return;
    supabase.from('profiles').select('avatar_url').eq('id', session.user.id).maybeSingle()
      .then(({ data, error }) => { if (!error && data?.avatar_url) setAvatarUrl(data.avatar_url); });
  }, [session.user.id]);

  const goSettings = () => navigate('/settings');

  const avatar = (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden"
      style={{ backgroundColor: avatarBg, color: avatarFg }}
    >
      {avatarUrl ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" /> : initials}
    </div>
  );

  return (
    <div className="flex flex-col gap-1">
      {/* See plans and pricing — free users only (premium already subscribed). */}
      {!isPro && (
        <button type="button" onClick={() => setShowPricing(true)} className={sidebarRowClass(isCollapsed)} style={sidebarRowStyle}
          onMouseEnter={sidebarRowEnter} onMouseLeave={sidebarRowLeave} title="See plans and pricing" aria-label="See plans and pricing">
          <Sparkles size={20} className="shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium tracking-[-0.01em]">See plans and pricing</span>}
        </button>
      )}

      {/* Settings — full settings page for signed-in users. */}
      <button type="button" onClick={goSettings} className={sidebarRowClass(isCollapsed)} style={sidebarRowStyle}
        onMouseEnter={sidebarRowEnter} onMouseLeave={sidebarRowLeave} title={t('settings') || 'Settings'} aria-label={t('settings') || 'Settings'}>
        <Settings size={20} className="shrink-0" />
        {!isCollapsed && <span className="text-sm font-medium tracking-[-0.01em]">{t('settings') || 'Settings'}</span>}
      </button>

      {/* Help */}
      <SidebarHelpMenu isCollapsed={isCollapsed} />

      {/* Account card */}
      {isCollapsed ? (
        <button type="button" onClick={goSettings} className={`${sidebarRowClass(true)} mt-1`} aria-label={displayName} title={displayName}>
          {avatar}
        </button>
      ) : (
        <div className="mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--ui-border-subtle)' }}>
          <button type="button" onClick={goSettings} className="flex items-center gap-2.5 min-w-0 flex-1 rounded-lg p-1 transition-colors"
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ui-bg-elevated)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
            {avatar}
            <div className="min-w-0 text-left">
              <div className="text-sm font-medium truncate" style={{ color: 'var(--ui-text-primary)' }}>{displayName}</div>
              {isPro ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#16a34a', color: '#ffffff' }}>{t('pro') || 'PRO'}</span>
                  <span className="text-xs font-medium" style={{ color: '#16a34a' }}>Account</span>
                </div>
              ) : (
                <div className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>Free</div>
              )}
            </div>
          </button>
          {!isPro && (
            <button
              type="button"
              onClick={() => setShowPricing(true)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
              style={{ color: 'var(--ui-text-primary)', borderColor: 'var(--ui-border-default)', backgroundColor: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ui-bg-elevated)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {t('upgrade') || 'Upgrade'}
            </button>
          )}
        </div>
      )}

      {showPricing && (
        <Suspense fallback={null}>
          <ProModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
        </Suspense>
      )}
    </div>
  );
}
