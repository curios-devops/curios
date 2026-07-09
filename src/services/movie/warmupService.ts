// Fire-and-forget GPU warm-up for Movie Mode's self-hosted LTX worker (RunPod).
// Pinged when a user selects Movie mode (or Auto routes to it) so the worker cold-starts
// and loads the weights while the research/storyboard phase runs — the video render then
// hits a warm worker. The endpoint's own idle timeout (5 min) puts it back to sleep, so
// no traffic means no GPU spend. If RunPod isn't configured the edge function no-ops.

import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/logger';

// The endpoint idle timeout is 300s — re-pinging more often than this is wasted money.
const WARM_INTERVAL_MS = 4 * 60 * 1000;
let lastPingAt = 0;

export function warmMovieGpu(): void {
  // Same spend gate as the actual video render.
  if (import.meta.env.VITE_ENABLE_WAVESPEED_EDGE_CALLS !== 'true') return;
  const now = Date.now();
  if (now - lastPingAt < WARM_INTERVAL_MS) return;
  lastPingAt = now;

  supabase.functions
    .invoke('generate-movie-video', { body: { warmup: true } })
    .then(({ data }) => logger.info('[Movie/Warmup] ping sent', (data as Record<string, unknown>) ?? {}))
    .catch(() => undefined); // warm-up is best-effort; never surface failures
}
