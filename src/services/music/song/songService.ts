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
  /** ISO 639-1 language the inspiration is sung in ("" if instrumental) → the "Original" lyrics option. */
  originalLanguage: string;
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

/** No real song: a song that explains a subject (Search → Explore further). */
export interface SongTopic { kind: 'topic'; title: string; about: string }
/** What a studio song starts from: a song / artist / album page, or a subject to explain. */
export type SongSource = MusicInfo | SongTopic;

/** What the song is inspired by, as the edge function expects it. */
export function inspirationOf(info: SongSource) {
  if (info.kind === 'topic') return { kind: 'topic', title: info.title, artist: '', genres: [], about: info.about.slice(0, 1500) };
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

export const fetchSongIdeas = (info: SongSource, language: string) =>
  call<{ ideas: string[] }>({ action: 'ideas', inspiration: inspirationOf(info), language }).then((d) => d.ideas ?? []);

export const draftSong = (info: SongSource, language: string, idea: string, style: SongStyle) =>
  call<{ song: SongDraft }>({ action: 'draft', inspiration: inspirationOf(info), language, idea, style }).then((d) => d.song);

/** A new version of one part: with a feeling (mood) or just another take. */
export const rewritePart = (info: SongSource, language: string, song: SongDraft, part: PartId, mood?: string) =>
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

// ---------- Generated songs (Creative) ----------
export interface SongCaption { text: string; start_ms: number; end_ms: number; words: { w: string; s: number; e: number }[] }
export type AnimationStyle = 'abstract' | 'drawn' | 'particles';
export interface Song {
  id: string;
  title: string;
  inspiredBy: string;
  inspiredArtist: string;
  style: string;
  voice: boolean;
  lyrics: { parts: SongPart[]; order: PartId[] } | null;
  captions: SongCaption[];
  audioUrl: string;
  instrumentalUrl: string | null;
  durationMs: number;
  palette: string[];
  animations: Partial<Record<AnimationStyle, string>>;
  votesUp: number;
  votesDown: number;
  plays: number;
  creatorId: string | null;
  creatorName: string | null;
  createdAt: string;
}

const SONG_COLUMNS = 'id, title, inspired_by, inspired_artist, style, voice, lyrics, captions, audio_url, instrumental_url, duration_ms, palette, animations, votes_up, votes_down, plays, creator_id, creator_name, created_at';

const toSong = (r: any): Song => ({
  id: r.id, title: r.title, inspiredBy: r.inspired_by ?? '', inspiredArtist: r.inspired_artist ?? '', style: r.style ?? 'original',
  voice: r.voice !== false, lyrics: r.lyrics ?? null, captions: r.captions ?? [], audioUrl: r.audio_url, instrumentalUrl: r.instrumental_url ?? null,
  durationMs: r.duration_ms ?? 0, palette: r.palette ?? [], animations: r.animations ?? {}, votesUp: r.votes_up ?? 0, votesDown: r.votes_down ?? 0,
  plays: r.plays ?? 0, creatorId: r.creator_id ?? null, creatorName: r.creator_name ?? null, createdAt: r.created_at,
});

/** Music + animations for the studio's song (≈ 40 s). Returns the new song's id. */
export function generateSong(info: SongSource, language: string, song: SongDraft, opts: { style: SongStyle; voice: boolean; length: SongLength; idea: string }) {
  const styleSound = SONG_STYLES.find((s) => s.id === opts.style)?.sound ?? '';
  return call<{ id: string }>({ action: 'generate', inspiration: inspirationOf(info), language, song, styleSound, ...opts }).then((d) => d.id);
}

export async function fetchSong(id: string): Promise<Song | null> {
  const { data, error } = await supabase.from('songs').select(SONG_COLUMNS).eq('id', id).maybeSingle();
  return error || !data ? null : toSong(data);
}

/** The accompaniment alone (voice off): separated on first use, then cached. */
export const separateVoice = (id: string) => call<{ instrumentalUrl: string }>({ action: 'stems', id }).then((d) => d.instrumentalUrl);

const SONG_VOTES_KEY = 'curios_song_votes';
const readVotes = (): Record<string, -1 | 1> => { try { return JSON.parse(localStorage.getItem(SONG_VOTES_KEY) ?? '') ?? {}; } catch { return {}; } };
export const mySongVote = (id: string): -1 | 0 | 1 => readVotes()[id] ?? 0;

/** Tapping the same thumb again removes the vote (one per device, like the games). */
export async function voteSong(id: string, vote: -1 | 1): Promise<{ up: number; down: number; mine: -1 | 0 | 1 } | null> {
  const prev = mySongVote(id);
  const next = prev === vote ? 0 : vote;
  const { data, error } = await supabase.rpc('song_vote', { song: id, vote: next, prev });
  if (error || !data?.[0]) return null;
  const votes = readVotes();
  if (next) votes[id] = next; else delete votes[id];
  try { localStorage.setItem(SONG_VOTES_KEY, JSON.stringify(votes)); } catch { /* storage blocked */ }
  return { up: data[0].votes_up, down: data[0].votes_down, mine: next };
}

/** One play, the first time it starts on a page view. */
export function countSongPlay(id: string) {
  void supabase.rpc('song_play', { song: id }).then(undefined, () => undefined);
}

/** Creative cards for songs (newest first; Creative sorts and filters them with the games). */
export async function fetchSongCatalog(limit = 200) {
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, inspired_by, style, genres, palette, votes_up, plays, creator_id, creator_name, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return error ? [] : data ?? [];
}
