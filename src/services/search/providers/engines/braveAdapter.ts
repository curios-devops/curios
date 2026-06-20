// Adapters that map the existing Brave search tool into Fast Search's result
// shapes. Brave is the fallback web/image engine for the Default tier and one
// of the contrapunto engines in Ask Deeper.

import { braveSearchTool } from '../../../../commonService/searchTools/braveSearchTool';
import type { WebSearchResult } from '../webSearchProvider';
import type { ImageResult, VideoResult } from '../mediaSearchProvider';

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown source';
  }
}

export async function searchBraveWeb(query: string): Promise<WebSearchResult[]> {
  try {
    const { web } = await braveSearchTool(query);
    return (web || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      content: r.content,
    }));
  } catch {
    return [];
  }
}

export async function searchBraveImages(query: string): Promise<ImageResult[]> {
  try {
    const { images } = await braveSearchTool(query);
    return (images || []).map((img) => ({
      url: img.url,
      title: img.alt || query,
      source: extractDomain(img.url),
      thumbnail: img.url,
    }));
  } catch {
    return [];
  }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gpfccicfqynahflehpqo.supabase.co';

/**
 * Lightweight Brave video search: hits the brave-web-search edge function
 * directly and extracts only the video results. Deliberately avoids
 * braveSearchTool, which also runs an images call and a 5s Brave-vs-Tavily
 * race we don't want on the always-on video path.
 */
export async function searchBraveVideos(query: string): Promise<VideoResult[]> {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/brave-web-search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];

    const data = await res.json();
    const results: Array<{ title?: string; url?: string; thumbnail?: { src?: string }; age?: string }> =
      data.videos?.results || [];

    return results
      .filter((v) => !!v.url)
      .map((v) => ({
        url: v.url as string,
        title: v.title || query,
        thumbnail: v.thumbnail?.src || '',
        source: extractDomain(v.url as string),
        duration: v.age || undefined,
      }))
      .slice(0, 10);
  } catch {
    clearTimeout(timeoutId);
    return [];
  }
}
