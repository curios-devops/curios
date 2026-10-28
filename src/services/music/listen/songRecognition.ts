// Song recognition client — posts a few seconds of mic audio to the song-recognize edge function
// (Apify's Shazam actor) and says which Music page to open for the song it heard.
import { supabase } from '../../../lib/supabase.ts';

export interface HeardSong {
  title: string;
  artist: string;
  album: string | null;
  year: string | null;
  genre: string | null;
  coverUrl: string | null;
  isrc: string | null;
  shazamKey: string | null;
  appleMusicUrl: string | null;
  previewUrl: string | null;
  /** Where in the song the clip plays. */
  offsetSec: number | null;
}

export type Recognition =
  | { status: 'found'; song: HeardSong }
  | { status: 'missed' }
  | { status: 'limit'; signIn: boolean }
  | { status: 'error' };

/** When the listener sends what it has heard so far: a quick try, then the full clip (a miss is free). */
export const TRY_AT_MS = [6000, 12000] as const;

/** Never throws: a dropped connection is an 'error' the listener can offer to retry. */
export async function recognizeSong(clip: Blob): Promise<Recognition> {
  const { data, error } = await supabase.functions.invoke('song-recognize', {
    body: clip,
    headers: { 'x-audio-type': clip.type || 'audio/webm' },
  }).catch(() => ({ data: null, error: new Error('network') }));
  if (error) {
    // The function's own error code (sign_in_required, daily_limit…) travels in the response body;
    // a network failure has no response.
    const ctx = (error as { context?: unknown }).context;
    const code = String(((ctx instanceof Response ? await ctx.json().catch(() => null) : null) as { error?: unknown } | null)?.error ?? '');
    return code === 'sign_in_required' || code === 'daily_limit' ? { status: 'limit', signIn: code === 'sign_in_required' } : { status: 'error' };
  }
  return data?.found ? { status: 'found', song: data.song as HeardSong } : { status: 'missed' };
}

/** The Music page for exactly this song (kind + artist + title, no free-text guessing), with the album and year it was heard from. */
export function songPage(song: Pick<HeardSong, 'title' | 'artist' | 'album' | 'year'>): string {
  const p = new URLSearchParams({ q: `${song.title} ${song.artist}`, kind: 'track', artist: song.artist, title: song.title });
  if (song.album) p.set('album', song.album);
  if (song.year) p.set('year', song.year);
  return `/music-results?${p}`;
}
