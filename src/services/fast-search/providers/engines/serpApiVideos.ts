// SerpAPI video search — calls the `serp-videos-search` edge function
// (server-side SERPAPI_API_KEY, engine: google_videos). Fallback video engine
// for Fast Search when Brave returns nothing.

import type { VideoResult } from '../mediaSearchProvider';
import { logger } from '../../../../utils/logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface SerpVideo {
  url: string;
  title?: string;
  thumbnail?: string;
  source?: string;
  duration?: string;
}

export async function searchSerpApiVideos(query: string, count = 10): Promise<VideoResult[]> {
  if (!query?.trim()) return [];
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    logger.warn('SerpApiVideos: Supabase not configured');
    return [];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/serp-videos-search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, count }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      logger.warn('SerpApiVideos: API error', { status: res.status });
      return [];
    }

    const data = await res.json();
    if (!data.success || !Array.isArray(data.videos)) return [];

    return (data.videos as SerpVideo[])
      .filter((v) => !!v.url)
      .map((v) => ({
        url: v.url,
        title: v.title || query,
        thumbnail: v.thumbnail || '',
        source: v.source,
        duration: v.duration || undefined,
      }));
  } catch (error) {
    clearTimeout(timeoutId);
    logger.warn('SerpApiVideos: search failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}
