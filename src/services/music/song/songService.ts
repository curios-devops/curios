// Curios Songs client: original lyrics written and edited with Luna (song-generate edge
// function). The music itself comes later from ElevenLabs Music.
import { supabase } from '../../../lib/supabase.ts';
import type { MusicInfo } from '../musicInfo.ts';

export type PartId = 'verse1' | 'chorus' | 'verse2' | 'bridge';
export interface SongPart { id: PartId; type: 'verse' | 'chorus' | 'bridge'; lines: string[] }
export interface SongDraft {
  title: string;
  /** The inspiration's sound for the music model (English, no artist names). */
  sound: string;
  instrumental: boolean;
  /** 3–5 buttons to rewrite a part with another feeling ("Más alegre"). */
  moods: string[];
  parts: SongPart[];
}
export interface LineCheck { ok: boolean; issue?: 'rhyme' | 'length'; words: string[]; shorter?: string }

export type SongLength = 'short' | 'long';
/** Short (~1 min): verse + chorus. Long (~2–3 min): every part; the chorus repeats when sung. */
export const PARTS_BY_LENGTH: Record<SongLength, PartId[]> = {
  short: ['verse1', 'chorus'],
  long: ['verse1', 'chorus', 'verse2', 'bridge'],
};

// Typical genres to perform it in; `sound` goes to the music model (English, no names).
export const SONG_STYLES = [
  { id: 'original', sound: '' },
  { id: 'rock', sound: 'energetic rock, distorted electric guitars, live drums, powerful vocals' },
  { id: 'pop', sound: 'modern pop, catchy synths, punchy drums, bright polished vocals' },
  { id: 'jazz', sound: 'swing jazz, upright bass, brushed drums, piano, saxophone, smooth vocals' },
  { id: 'classical', sound: 'full symphony orchestra, strings, brass, timpani, operatic vocals' },
  { id: 'electronic', sound: 'electronic dance, synth bass, four-on-the-floor beat, airy vocals' },
  { id: 'hiphop', sound: 'hip-hop, boom bap beat, deep bass, rap vocals' },
  { id: 'reggaeton', sound: 'reggaeton, dembow rhythm, latin urban vocals' },
  { id: 'acoustic', sound: 'acoustic folk, fingerpicked guitar, warm intimate vocals' },
] as const;
export type SongStyle = typeof SONG_STYLES[number]['id'];

/** What the song is inspired by, as the edge function expects it. */
export function inspirationOf(info: MusicInfo) {
  return {
    kind: info.kind,
    title: info.title,
    artist: info.artist.name,
    year: info.year,
    genres: [...(info.genres ?? []), ...info.tags].slice(0, 5),
    about: info.bio.slice(0, 500),
  };
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('song-generate', { body });
  if (error) throw error;
  return data as T;
}

export const fetchSongIdeas = (info: MusicInfo, language: string) =>
  call<{ ideas: string[] }>({ action: 'ideas', inspiration: inspirationOf(info), language }).then((d) => d.ideas ?? []);

export const draftSong = (info: MusicInfo, language: string, idea: string, style: SongStyle) =>
  call<{ song: SongDraft }>({ action: 'draft', inspiration: inspirationOf(info), language, idea, style }).then((d) => d.song);

/** A new version of one part: with a feeling (mood) or just another take. */
export const rewritePart = (info: MusicInfo, language: string, song: SongDraft, part: PartId, mood?: string) =>
  call<{ lines: string[] }>({ action: 'rewrite', inspiration: inspirationOf(info), language, song, part, mood }).then((d) => d.lines);

/** Guided edit: which edited lines break the part's rhyme or length, with fixes. */
export const checkLines = (language: string, part: SongPart['type'], lines: string[], original: string[]) =>
  call<{ lines: LineCheck[] }>({ action: 'check', language, part, lines, original }).then((d) => d.lines ?? []);

/** Whether music generation is switched on (its key is configured). */
export const songMusicReady = () =>
  call<{ music: boolean }>({ action: 'status' }).then((d) => d.music === true).catch(() => false);

/** Rough sung syllables (vowel groups) — a guide for keeping lines even, not a rule. */
export const syllables = (line: string) => (line.toLowerCase().match(/[aeiouyáéíóúàèìòùâêîôûäëïöüãõ]+/g) ?? []).length;

/** Swaps the last word of a line, keeping its punctuation. */
export const replaceLastWord = (line: string, word: string) => line.replace(/[^\s.,;:!?¡¿…"»)]+([.,;:!?…"»)]*)\s*$/, `${word}$1`);
