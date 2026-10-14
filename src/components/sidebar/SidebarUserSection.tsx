import { lazy, Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Crown, Settings, Sparkles } from 'lucide-react';
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
  // While the subscription is still loading we don't yet know free vs pro —
  // hold back the status/upgrade UI so premium users don't flash "Upgrade".
  subLoading: boolean;
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

// OAuth providers (Google) put the profile picture in user_metadata — prefer it
// so a signed-up-with-Google user always sees their photo, not initials.
function metadataAvatar(user: Session['user']): string | null {
  const m = (user.user_metadata ?? {}) as Record<string, unknown>;
  for (const key of ['avatar_url', 'picture']) {
    const v = m[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

// Signed-in sidebar footer: plans (free only) + Settings + Help, then the
// account card (avatar, name, Free/Pro status, Upgrade button for free users).
export default function SidebarUserSection({ session, isPro, subLoading, isCollapsed }: SidebarUserSectionProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const accentColor = useAccentColor();
  const { accentColor: selectedAccentColor } = useTheme();
  // Seed from OAuth metadata so the photo shows immediately; the profiles row
  // (below) can still supply/override it. Fall back to initials only if broken.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(metadataAvatar(session.user));
  const [avatarBroken, setAvatarBroken] = useState(false);
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
      .then(({ data, error }) => { if (!error && data?.avatar_url) { setAvatarUrl(data.avatar_url); setAvatarBroken(false); } });
  }, [session.user.id]);

  const goSettings = () => navigate('/settings');

  const showPhoto = !!avatarUrl && !avatarBroken;
  const avatar = (
    <div className="relative shrink-0">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold overflow-hidden"
        style={{ backgroundColor: avatarBg, color: avatarFg }}
      >
        {showPhoto
          ? <img src={avatarUrl as string} alt={displayName} className="w-full h-full object-cover" onError={() => setAvatarBroken(true)} />
          : initials}
      </div>
      {/* Pro badge on the avatar — shown when collapsed so premium is still legible. */}
      {isPro && isCollapsed && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border"
          style={{ backgroundColor: '#16a34a', borderColor: 'var(--ui-bg-secondary)' }}
          title={t('pro') || 'PRO'}
        >
          <Crown size={8} className="text-white" />
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-1">
      {/* See plans and pricing — free users only (premium already subscribed).
          Hidden while loading so it doesn't flash in for premium users. */}
      {!subLoading && !isPro && (
        <button type="button" onClick={() => setShowPricing(true)} className={sidebarRowClass(isCollapsed)} style={sidebarRowStyle}
          onMouseEnter={sidebarRowEnter} onMouseLeave={sidebarRowLeave} title={t('seePlansAndPricing')} aria-label={t('seePlansAndPricing')}>
          <Sparkles size={20} className="shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium tracking-[-0.01em]">{t('seePlansAndPricing')}</span>}
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
              {subLoading ? (
                // Placeholder keeps the row height stable and avoids a Free→Pro flash.
                <div className="mt-1 h-3 w-10 rounded animate-pulse" style={{ backgroundColor: 'var(--ui-bg-secondary)' }} />
              ) : isPro ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#16a34a', color: '#ffffff' }}>{t('pro') || 'PRO'}</span>
                  <span className="text-xs font-medium" style={{ color: '#16a34a' }}>{t('account') || 'Account'}</span>
                </div>
              ) : (
                <div className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>{t('free') || 'Free'}</div>
              )}
            </div>
          </button>
          {!subLoading && !isPro && (
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

      {showPricing && createPortal(
        <Suspense fallback={null}>
          <ProModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
        </Suspense>,
        document.body,
      )}
    </div>
  );
}
