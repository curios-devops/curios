import type { MouseEvent } from 'react';

// Shared styling for the sidebar footer menu rows (guest + signed-in), so
// "See plans", "Settings" and "Help" look identical across account states.
export const sidebarRowClass = (isCollapsed: boolean) =>
  `flex items-center rounded-lg transition-colors w-full ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-2 py-2'}`;

export const sidebarRowStyle = { color: 'var(--ui-text-secondary)' } as const;

export const sidebarRowEnter = (e: MouseEvent<HTMLElement>) => {
  e.currentTarget.style.backgroundColor = 'var(--ui-bg-elevated)';
  e.currentTarget.style.color = 'var(--ui-text-primary)';
};

export const sidebarRowLeave = (e: MouseEvent<HTMLElement>) => {
  e.currentTarget.style.backgroundColor = 'transparent';
  e.currentTarget.style.color = 'var(--ui-text-secondary)';
};
