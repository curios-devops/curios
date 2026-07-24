import { useEffect, useRef, useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useAccentColor } from '../../hooks/useAccentColor.ts';
import { sidebarRowClass, sidebarRowStyle, sidebarRowEnter, sidebarRowLeave } from './sidebarMenuRow.ts';

// "Help" row + popover — same menu the old floating "?" button had. Shared by
// the guest and signed-in sidebar footers.
export default function SidebarHelpMenu({ isCollapsed }: { isCollapsed: boolean }) {
  const { t } = useTranslation();
  const accentColor = useAccentColor();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const items = [
    { label: t('helpAndFaq'), href: '#' },
    { label: t('releaseNotes'), href: '#' },
    { label: t('termsAndPolicies'), href: '/policies' },
    { label: t('keyboardShortcuts'), href: '#' },
    { label: t('reportIllegalContent'), href: '#' },
  ];

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className={sidebarRowClass(isCollapsed)} style={sidebarRowStyle}
        onMouseEnter={sidebarRowEnter} onMouseLeave={sidebarRowLeave} title={t('help') || 'Help'} aria-label={t('help') || 'Help'}>
        <LifeBuoy size={20} className="shrink-0" />
        {!isCollapsed && <span className="text-sm font-medium tracking-[-0.01em]">{t('help') || 'Help'}</span>}
      </button>
      {open && (
        <div
          className="absolute left-0 bottom-full mb-2 w-44 rounded-xl shadow-lg border py-1 z-50 animate-fade-in"
          style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-subtle)' }}
        >
          {items.map((item) => (
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
  );
}
