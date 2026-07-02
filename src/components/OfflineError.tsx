// Router errorElement — shown when a route (usually a lazy-loaded page chunk) fails to load.
// The most common cause is no/low connectivity: the dynamic `import()` can't fetch its module
// ("Importing a module script failed"). Instead of React Router's raw "Unexpected Application
// Error!", we show a friendly, on-brand offline screen (astronaut with a cut tether) + Retry.

import { useRouteError } from 'react-router-dom';
import astronaut from '../assets/astronaut-offline.png';

// Substrings that indicate a dynamic-import / network failure (varies by browser).
const NETWORK_HINTS = [
  'importing a module script failed',
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'dynamically imported module',
  'load failed',
  'networkerror',
  'failed to fetch',
];

export default function OfflineError() {
  const error = useRouteError() as { message?: string } | undefined;
  const message = (error?.message || String(error ?? '')).toLowerCase();
  const isOffline = !navigator.onLine || NETWORK_HINTS.some((hint) => message.includes(hint));

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: 'var(--ui-bg-primary)', color: 'var(--ui-text-primary)' }}
    >
      <img
        src={astronaut}
        alt=""
        draggable={false}
        className="w-52 h-52 sm:w-64 sm:h-64 object-contain mb-6 select-none"
      />
      <h1 className="text-xl sm:text-2xl font-semibold mb-2">
        {isOffline ? 'Lost connection to the ship' : 'Something drifted off course'}
      </h1>
      <p className="text-sm max-w-sm mb-6" style={{ color: 'var(--ui-text-muted)' }}>
        {isOffline
          ? "Your tether to the internet got cut, so we couldn't load this part of Curios. Reconnect and try again."
          : "We hit an unexpected bump loading this page. Check your connection and try again."}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--accent-primary)' }}
      >
        Retry
      </button>
      {isOffline && (
        <p className="text-xs mt-4" style={{ color: 'var(--ui-text-tertiary)' }}>
          Try again once your internet connection resumes.
        </p>
      )}
    </div>
  );
}
