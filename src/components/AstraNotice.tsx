import { useState } from 'react';
import { useProCredits } from '../providers/ProCreditsProvider.tsx';

// Shown when a question deserved Astra (our most capable model) but the user had no
// Pro credit, so Sol answered. Upgrade → once a credit is available the button turns
// into "Continue with Astra", which reruns the question on Astra.
export default function AstraNotice({ onContinueWithAstra }: { onContinueWithAstra: () => void }) {
  const { tier, canUseProFeature, promptUpgrade } = useProCredits();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const action = canUseProFeature
    ? { label: 'Continue with Astra', onClick: onContinueWithAstra }
    : tier === 'pro'
      ? null // Pro users can't buy more today — credits refill tomorrow
      : { label: tier === 'guest' ? 'Sign up for Astra' : 'Upgrade for Astra', onClick: promptUpgrade };

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 mb-4 text-sm"
      style={{
        backgroundColor: 'var(--ui-bg-secondary)',
        border: '1px solid var(--ui-border-subtle)',
        color: 'var(--ui-text-secondary)',
      }}
    >
      <span className="flex-1 min-w-[12rem]">
        This question deserves <strong style={{ color: 'var(--ui-text-primary)' }}>Astra</strong>, our
        most capable model.{' '}
        {tier === 'pro' && !canUseProFeature
          ? 'You’ve used today’s Pro credits, so Sol answered it.'
          : 'You’re out of Pro credits, so Sol answered it.'}
      </span>
      <div className="flex items-center gap-2">
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}
          >
            {action.label}
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs px-3 py-1.5 rounded-full whitespace-nowrap"
          style={{ color: 'var(--ui-text-muted)' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
