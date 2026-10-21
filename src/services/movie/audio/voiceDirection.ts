// Voice direction for everything ElevenLabs reads (eleven_v4_turbo): Cinematic films, the
// Magazine story and the fact sheets (films, music, games).
//
// v4 has no SSML and ignores voice_settings.speed and style; delivery is directed with audio
// tags in square brackets, placed right before the words they color. Measured 2026-10-21 on
// the same Spanish sentence (5.44 s, −19.0 dB plain), every tag below silent in the transcript:
//   pace     [slowly] +19% · [drawn out] +9% · [thoughtful, slower] +7% · [rushed] −18% · [urgent] −9%
//   volume   [whispering] −7 dB · [quietly] / [softly] / [sorrowful] −4 dB
//            Nothing makes it LOUDER ([loudly], [shouts], [projecting] only add intensity), so
//            [louder] / [quieter] are ours: the player plays that line a little up or down.
//   pauses   [short pause] 0.7 s · [pause] 1.1 s · [long pause] 1.7 s
// Only this vocabulary is kept — an unknown tag can come out as a sound effect.
import { appSettings } from '../../../config/appSettings.ts';
import { fetchOpenAI } from '../core/llm.ts';

const TONES = [
  'excited', 'optimistic', 'curious', 'awe', 'calm', 'warm', 'conversational', 'confident', 'clear',
  'informative', 'thoughtful', 'serious', 'playful', 'mysterious', 'dramatic', 'nervous', 'fearful',
  'sad', 'sorrowful', 'angry', 'urgent', 'neutral',
];
const PACE = ['slowly', 'slower', 'drawn out', 'rushed'];
const SOFT = ['whispering', 'whispers', 'quietly', 'softly'];
const INTENSE = ['shouts'];
const PAUSES = ['short pause', 'pause', 'long pause'];
const REACTIONS = ['laughs', 'sighs'];
/** Ours, applied by the player (ElevenLabs can't make a line louder). */
export const LEVELS = ['louder', 'quieter'] as const;

const VOCABULARY = new Set([...TONES, ...PACE, ...SOFT, ...INTENSE, ...PAUSES, ...REACTIONS, ...LEVELS]);

/** Keeps only tags made of known words (combinations like [warm, conversational] included). */
export function cleanDelivery(text: string): string {
  return text
    .replace(/\[([^\]]{1,40})\]/g, (_m, tag: string) => {
      const parts = tag.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);
      return parts.length > 0 && parts.length <= 3 && parts.every((p) => VOCABULARY.has(p)) ? `[${parts.join(', ')}]` : '';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** What captions and the page show: the words, without any tags. */
export function captionText(text: string): string {
  return text.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
}

// Playback level per line: a touch up or down around a base just under full scale (room for
// [louder] without clipping). +1.4 dB / −2.3 dB — a nudge, not a jump.
export const BASE_LEVEL = 0.85;
const LEVEL_GAIN: Record<(typeof LEVELS)[number], number> = { louder: 1, quieter: 0.65 };

/** The text for ElevenLabs (our level tags removed) and the gain to play it at. */
export function levelOf(text: string): { text: string; gain: number } {
  let gain = BASE_LEVEL;
  const spoken = text.replace(/\[(louder|quieter)\]/gi, (_m, l: string) => {
    gain = LEVEL_GAIN[l.toLowerCase() as (typeof LEVELS)[number]];
    return '';
  });
  return { text: spoken.replace(/\s+/g, ' ').trim(), gain };
}

/** The director's palette, with examples by kind of piece. */
export const VOICE_DIRECTION_GUIDE = `HOW TO DIRECT THE VOICE (ElevenLabs v4 audio tags)
Put a tag in square brackets right before the words it colors. Combine up to 3 words in one tag: [warm, conversational].
Palette (use only these words):
- Tone: ${TONES.map((t) => `[${t}]`).join(' ')}
- Pace: [slowly] (much slower) [drawn out] [thoughtful, slower] [rushed] (faster) [urgent]
- Volume: [whispering] (−7 dB) [quietly] [softly] (−4 dB) [quieter] (a touch down) [louder] (a touch up, use for a key reveal) [shouts] (more intensity, rarely)
- Pauses: [short pause] (0.7 s) [pause] (1.1 s) [long pause] (1.7 s)
- Reactions: [laughs] [sighs]
Punctuation directs too: "..." slows down, "—" cuts in, "!" adds energy.
A tone lasts a few sentences or until a new tag; [neutral] or [conversational] resets it.
One emotion per phrase. Be sparing: most lines need no tag; a tag should mark a real change.
Examples by kind of piece:
- Documentary / explainer: "[confident, clear] Every second, a hummingbird beats its wings eighty times. [short pause] [curious] But how does it hover?"
- Story / magazine: "[warm, conversational] It started with a letter nobody expected. [pause] [quietly] Inside, a single line..."
- Mystery / suspense: "[mysterious, slowly] Nobody has ever seen its nest. [long pause] [whispering] Until now."
- Discovery / wonder: "[awe] From up here, the whole valley glows. [louder] [excited] And it's alive!"
- Sad / historical loss: "[sorrowful, slower] The village was never rebuilt. [sighs] Only the bell tower remains."
- Fun / kids: "[playful] Meet the slowest animal on Earth... [laughs] it naps nineteen hours a day!"
- News / urgent: "[urgent] The storm turned overnight. [serious] Here's what changed."`;

export type NarrationKind = 'magazine' | 'factsheet';

const KIND_BRIEF: Record<NarrationKind, string> = {
  magazine: 'a magazine story read aloud — narrative journalism: draw the listener in, let the turns of the story breathe, land the key facts.',
  factsheet: 'a short spoken introduction to a film, song, artist or game — warm and informative, with a spark of enthusiasm for what makes it special.',
};

/**
 * The voice director for prose that wasn't written with tags (Magazine, fact sheets): one
 * fast call returns the tags to put before each sentence — the words themselves never change
 * (the code inserts the tags). Resolves to one tag string per sentence ('' = read as is).
 */
export async function directVoice(sentences: string[], kind: NarrationKind): Promise<string[]> {
  const list = sentences.slice(0, 80);
  const raw = await fetchOpenAI({
    model: appSettings.models.utility,
    reasoning: { effort: 'none' },
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are the voice director of an audio narration. You don't change any words: for each numbered sentence you only decide HOW it is said, by returning the audio tags to place before it ("" when it needs none).\n\n${VOICE_DIRECTION_GUIDE}`,
      },
      {
        role: 'user',
        content: `This is ${KIND_BRIEF[kind]}\n\nSentences:\n${list.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nReturn JSON: {"tags": [one string per sentence, same order, ${list.length} items]}`,
      },
    ],
  });
  const tags = (JSON.parse(raw) as { tags?: unknown }).tags;
  if (!Array.isArray(tags)) return [];
  // Only tags survive (any stray words are dropped), at most 2 per sentence.
  return list.map((_, i) => {
    const t = typeof tags[i] === 'string' ? cleanDelivery(tags[i] as string) : '';
    return (t.match(/\[[^\]]+\]/g) ?? []).slice(0, 2).join(' ');
  });
}
