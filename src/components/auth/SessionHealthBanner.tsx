import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { useSession } from '../../hooks/useSession.ts';

export default function SessionHealthBanner() {
  const { error, resetSession, isResetting } = useSession();

  if (!error) {
    return null;
  }

  return (
    <div className="bg-amber-900/40 border border-amber-500 text-amber-100 px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between rounded-lg mb-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-300" />
        <div>
          <p className="font-medium">Session needs attention</p>
          <p className="text-sm text-amber-100/80">{error}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={resetSession}
        disabled={isResetting}
        className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-400 px-3 py-1.5 text-sm font-medium text-amber-50 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCcw className="h-4 w-4" />
        {isResetting ? 'Resetting…' : 'Reset session now'}
      </button>
    </div>
  );
}
