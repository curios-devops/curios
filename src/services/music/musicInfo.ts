// Music 🎵 fact sheet client — calls the music-info edge function (Deezer + Last.fm, with
// MusicBrainz + Wikipedia as fallback) and finds the song's video on YouTube.
import { supabase } from '../../lib/supabase.ts';
import { logger } from '../../utils/logger.ts';
import { searchVideos } from '../search/providers/mediaSearchProvider.ts';
import { youTubeId } from '../movie/trailer.ts';

export type MusicKind = 'track' | 'artist' | 'album';

export interface MusicTrack { title: string; artist: string; durationSec: number | null; previewUrl: string | null; coverUrl: string | null; /** Deezer popularity. */ rank: number }

export interface MusicInfo {
  kind: MusicKind;
  source: 'deezer' | 'musicbrainz';
  title: string;
  artist: { name: string; pictureUrl: string | null };
  album?: { title: string; coverUrl: string | null; year: string };
  year?: string;
  genres?: string[];
  label?: string | null;
  durationSec?: number | null;
  trackCount?: number;
  albumCount?: number | null;
  featuring?: string[];
  featuringArtists?: { name: string; pictureUrl: string | null }[];
  previewUrl?: string | null;
  fans?: number | null;
  /** Last.fm (when its key is configured). */
  listeners: number | null;
  playcount: number | null;
  tags: string[];
  bio: string;
  link: string | null;
  lastfmUrl: string | null;
  wikipediaUrl?: string | null;
  /** Songs only: the full text when public domain, else a short quotation; null → no Lyrics tab. */
  lyrics?: { text: string; full: boolean } | null;
  /** Album tracklist (album pages). */
  tracks?: MusicTrack[];
  topTracks: MusicTrack[];
  albums: { title: string; year: string; coverUrl: string }[];
  related: { name: string; pictureUrl: string | null }[];
  /** Photos for the carousel when there is no video: covers and the artist. */
  images: string[];
}

/** What a link inside the page opens: no need to interpret free text again. */
export interface MusicTarget { kind: MusicKind; artist: string; title?: string }

/** Null when nothing matches (or the function is unavailable). */
export async function fetchMusicInfo(query: string, uiLang: string, target?: MusicTarget | null): Promise<MusicInfo | null> {
  try {
    const { data, error } = await supabase.functions.invoke('music-info', {
      body: { query, language: uiLang, ...(target ?? {}) },
    });
    if (error) throw error;
    return data?.found ? (data as MusicInfo) : null;
  } catch (error) {
    logger.warn('[MusicInfo] lookup failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/** The song's video on YouTube (official video first) that can be embedded: embed URL, or null. */
export async function findMusicVideo(artist: string, song: string): Promise<string | null> {
  const videos = await searchVideos(`${artist} ${song} official video`);
  const ids = [...new Set(videos.map((v) => youTubeId(v.url)).filter(Boolean))];
  if (!ids.length) return null;
  const { data } = await supabase.functions.invoke('music-info', { body: { videos: ids } });
  const id = (data as { id?: string | null } | null)?.id;
  return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0` : null;
}

/** "3:45" from 225; albums as "54 min" or "1 h 12 min". */
export function formatDuration(sec: number | null | undefined): string {
  if (!sec) return '';
  if (sec >= 3600) return `${Math.floor(sec / 3600)} h ${Math.round((sec % 3600) / 60)} min`;
  if (sec >= 1200) return `${Math.round(sec / 60)} min`;
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/** 1234567 → "1.2 M" (compact, in the UI language). */
export const compact = (n: number, lang: string) => new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export interface MusicPerson { name: string; pictureUrl: string | null; from: string; to: string }
/** A band and its members (song by a band), or the bands a singer played in (song by a person). */
export interface MusicLineup { group: { name: string; pictureUrl: string | null } | null; members: MusicPerson[]; groups: MusicPerson[] }

/** Null when MusicBrainz has no members / bands for the artist. */
export async function fetchMusicLineup(artist: string, pictureUrl: string | null): Promise<MusicLineup | null> {
  try {
    const { data, error } = await supabase.functions.invoke('music-info', { body: { lineup: { artist, pictureUrl } } });
    if (error) throw error;
    return (data?.lineup as MusicLineup | null) ?? null;
  } catch {
    return null;
  }
}

/** The full lyrics on a licensed site (Musixmatch). */
export const lyricsLink = (info: MusicInfo) => `https://www.musixmatch.com/search?query=${encodeURIComponent(`${info.title} ${info.artist.name}`)}`;

/** Where to listen: Deezer's own page, plus a search on the other services (no keys needed). */
export function listenOn(info: MusicInfo): { name: string; url: string; logoUrl: string }[] {
  const q = encodeURIComponent(info.kind === 'artist' ? info.artist.name : `${info.title} ${info.artist.name}`);
  const logo = (site: string) => `https://www.google.com/s2/favicons?domain=${site}&sz=64`;
  return [
    { name: 'Spotify', url: `https://open.spotify.com/search/${q}`, logoUrl: logo('spotify.com') },
    { name: 'Apple Music', url: `https://music.apple.com/search?term=${q}`, logoUrl: logo('music.apple.com') },
    { name: 'YouTube Music', url: `https://music.youtube.com/search?q=${q}`, logoUrl: logo('music.youtube.com') },
    ...(info.link ? [{ name: 'Deezer', url: info.link, logoUrl: logo('deezer.com') }] : []),
  ];
}
