// Home "unseen" strip — sits ABOVE the title + input box. Shows a logged-in user's freshly
// finished enhanced videos (enhanced_videos rows: status='ready', seen_at IS NULL), newest first.
// Viewing one marks it seen (it then leaves this strip; its parent movie stays in the Discover
// feed below). Re-checks on tab focus so a job that finished while away appears when you return.
// If there are several, it's a simple carousel. Renders nothing when there's nothing to show.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useSession } from '../../../hooks/useSession.ts';
import { listUnseenEnhanced, markEnhancedSeen, type EnhancedVideo } from '../enhancedVideosService.ts';

export default function EnhancedVideosCarousel() {
  const { session } = useSession();
  const userId = session?.user?.id;

  const [items, setItems] = useState<EnhancedVideo[]>([]);
  const [index, setIndex] = useState(0);
  const seenRef = useRef<Set<string>>(new Set());

  const load = useCallback(() => {
    if (!userId) { setItems([]); return; }
    listUnseenEnhanced(userId).then(setItems);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Re-check when the user returns to the tab/window — covers "open Home later" and
  // "when the user gets back, check for finished jobs."
  useEffect(() => {
    const recheck = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, [load]);

  // Keep the index in range as items change.
  useEffect(() => {
    setIndex((i) => (i >= items.length ? Math.max(0, items.length - 1) : i));
  }, [items.length]);

  if (!userId || items.length === 0) return null;
  const current = items[index];

  const markSeen = (id: string) => {
    if (seenRef.current.has(id)) return;
    seenRef.current.add(id);
    void markEnhancedSeen(id);
  };

  const dismiss = (id: string) => {
    markSeen(id);
    setItems((prev) => prev.filter((v) => v.id !== id));
  };

  return (
    <div className="max-w-[720px] mx-auto px-6 sm:px-8 mb-8 home-rise">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
          <Sparkles size={14} />
          {items.length > 1 ? `New enhanced videos (${items.length})` : 'New enhanced video'}
        </div>
        {items.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              aria-label="Previous"
              className="p-1 rounded-md transition-colors disabled:opacity-40"
              style={{ color: 'var(--ui-text-secondary)' }}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs tabular-nums" style={{ color: 'var(--ui-text-muted)' }}>{index + 1}/{items.length}</span>
            <button
              onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
              disabled={index === items.length - 1}
              aria-label="Next"
              className="p-1 rounded-md transition-colors disabled:opacity-40"
              style={{ color: 'var(--ui-text-secondary)' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
        {current.video_url && (
          <video
            key={current.id}
            src={current.video_url}
            controls
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-contain"
            onPlay={() => markSeen(current.id)}
          />
        )}
        <button
          onClick={() => dismiss(current.id)}
          aria-label="Dismiss"
          title="Dismiss — moves to your Discover feed below"
          className="absolute top-2 right-2 p-1.5 rounded-full transition-colors"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff' }}
        >
          <X size={15} />
        </button>
      </div>

      {current.title && (
        <div className="mt-2 text-sm font-medium truncate" style={{ color: 'var(--ui-text-primary)' }}>
          {current.title}
        </div>
      )}
    </div>
  );
}
