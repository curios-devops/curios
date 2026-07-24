import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LifeBuoy } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useAccentColor } from '../../hooks/useAccentColor.ts';
import { sidebarRowClass, sidebarRowStyle, sidebarRowEnter, sidebarRowLeave } from './sidebarMenuRow.ts';

// "Help" row + popover — same menu the old floating "?" button had. Shared by
// the guest and signed-in sidebar footers. The popover is portaled to the body
// with fixed positioning so it opens in the main window and isn't clipped by
// (or trapped inside) the sidebar — matters on the transformed mobile drawer.
export default function SidebarHelpMenu({ isCollapsed }: { isCollapsed: boolean }) {
  const { t } = useTranslation();
  const accentColor = useAccentColor();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (btnRef.current && !btnRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ left: r.left, bottom: window.innerHeight - r.top + 8 });
    }
    setOpen((v) => !v);
  };

  const items = [
    { label: t('helpAndFaq'), href: '#' },
    { label: t('releaseNotes'), href: '#' },
    { label: t('termsAndPolicies'), href: '/policies' },
    { label: t('keyboardShortcuts'), href: '#' },
    { label: t('reportIllegalContent'), href: '#' },
  ];

  return (
    <>
      <button ref={btnRef} type="button" onClick={toggle} className={sidebarRowClass(isCollapsed)} style={sidebarRowStyle}
        onMouseEnter={sidebarRowEnter} onMouseLeave={sidebarRowLeave} title={t('help') || 'Help'} aria-label={t('help') || 'Help'}>
        <LifeBuoy size={20} className="shrink-0" />
        {!isCollapsed && <span className="text-sm font-medium tracking-[-0.01em]">{t('help') || 'Help'}</span>}
      </button>
      {open && pos && createPortal(
        <div
          className="fixed w-44 rounded-xl shadow-lg border py-1 z-[210] animate-fade-in"
          style={{ left: pos.left, bottom: pos.bottom, backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-subtle)' }}
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
        </div>,
        document.body,
      )}
    </>
  );
}
