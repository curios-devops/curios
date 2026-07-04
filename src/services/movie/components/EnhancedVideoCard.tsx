// Home "latest enhanced" card — sits ABOVE the title + input box. Shows a logged-in user's
// NEWEST ready-but-unseen enhanced video (enhanced_videos: status='ready', seen_at IS NULL)
// as a compact card: cover image + play overlay, video title and a short snippet (the parent
// movie's description). Clicking it marks it seen and reopens the movie page rebuilt from
// Supabase (/movie-results?projectId=…) — no regeneration. Re-checks on tab focus so a job
// that finished while away appears when the user returns. Renders nothing when there's
// nothing to show.

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Play, X } from 'lucide-react';
import { useSession } from '../../../hooks/useSession.ts';
import { latestUnseenEnhanced, markEnhancedSeen, type LatestEnhancedVideo } from '../enhancedVideosService.ts';

export default function EnhancedVideoCard() {
  const { session } = useSession();
  const navigate = useNavigate();
  const userId = session?.user?.id;

  const [item, setItem] = useState<LatestEnhancedVideo | null>(null);
  const [playInline, setPlayInline] = useState(false);

  const load = useCallback(() => {
    if (!userId) { setItem(null); return; }
    latestUnseenEnhanced(userId).then(setItem);
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

  if (!userId || !item) return null;

  const open = () => {
    void markEnhancedSeen(item.id);
    if (item.project_id) {
      navigate(`/movie-results?projectId=${item.project_id}`);
    } else if (item.video_url) {
      // The movie never persisted (rare) — there's no page to reopen; play here instead.
      setPlayInline(true);
    }
  };

  const dismiss = () => {
    void markEnhancedSeen(item.id);
    setItem(null);
  };

  return (
    <div className="max-w-[720px] mx-auto px-6 sm:px-8 mb-8 home-rise">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
          <Sparkles size={14} />
          Your enhanced video is ready
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          title="Dismiss — it stays in your Discover feed below"
          className="p-1 rounded-md transition-colors"
          style={{ color: 'var(--ui-text-secondary)' }}
        >
          <X size={15} />
        </button>
      </div>

      <button
        onClick={open}
        className="block w-full text-left rounded-xl overflow-hidden transition-transform hover:scale-[1.01]"
        style={{ backgroundColor: 'var(--ui-bg-elevated)' }}
      >
        <div className="relative bg-black aspect-video">
          {playInline && item.video_url ? (
            <video src={item.video_url} controls autoPlay muted loop playsInline className="w-full h-full object-contain" />
          ) : (
            <>
              {item.image_url && (
                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
              )}
              <span className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}>
                <span className="h-12 w-12 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: 'var(--accent-primary)' }}>
                  <Play size={22} className="ml-0.5" />
                </span>
              </span>
            </>
          )}
        </div>
        <div className="px-4 py-3">
          {item.title && (
            <div className="text-sm font-medium truncate" style={{ color: 'var(--ui-text-primary)' }}>
              {item.title}
            </div>
          )}
          {item.description && (
            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--ui-text-muted)' }}>
              {item.description}
            </p>
          )}
        </div>
      </button>
    </div>
  );
}
