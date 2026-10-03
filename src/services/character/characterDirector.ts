// Character director — like Cinematic/Movie, a "director" turns a question into
// a live performance: the line the character speaks, the full-body action it
// performs while speaking (Vivix VMP, English, one segment per ~5 s), and
// suggested next questions. Answers are grounded in the same web search the
// Search page uses.

import { executeWebSearch, type WebSearchResult } from '../search/providers/webSearchProvider';
import { buildSourcesText, streamLLMText } from '../search/providers/llmProvider';
import type { CharacterPreset } from './characterCatalog';
import { mark } from './timing';

export interface StageProduct {
  title: string;
  imageUrl: string;
}

export interface DirectedTurn {
  speech: string; // what the character says (plain text, user's language)
  actions: string[]; // VMP segments, joined with [SHOT_SEP] when sent
  suggestions: string[]; // 3 follow-up questions
  sources: WebSearchResult[];
}

const SEGMENT_MS = 5000;
// 40–80 spoken words ≈ 15–30 s ≈ 4 motion segments of 5 s.
const PLANNED_SEGMENTS = 4;
export const VMP_SEPARATOR = '[SHOT_SEP]';

/**
 * Parse the director's JSON (tolerates code fences / leading prose). Never
 * throws: missing parts fall back so the character always has something to do.
 */
export function parseDirectorOutput(raw: string, character: CharacterPreset): Omit<DirectedTurn, 'sources'> {
  let data: { speech?: unknown; actions?: unknown; suggestions?: unknown } = {};
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      data = JSON.parse(match[0]);
    } catch {
      data = {};
    }
  }
  const speech = typeof data.speech === 'string' && data.speech.trim() ? data.speech.trim() : raw.replace(/[{}"]/g, '').trim().slice(0, 600);
  const actions = Array.isArray(data.actions)
    ? data.actions.filter((a): a is string => typeof a === 'string' && a.trim().length > 0).map((a) => a.replace(/\[SHOT_SEP\]/g, ' ').trim())
    : [];
  const suggestions = Array.isArray(data.suggestions)
    ? data.suggestions.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim()).slice(0, 3)
    : [];
  return {
    speech,
    actions: actions.length ? actions.slice(0, 6) : [defaultAction(character)],
    suggestions,
  };
}

function defaultAction(c: CharacterPreset): string {
  return `Static full-body shot at eye level. ${c.description} Both hands begin relaxed at the sides. The character talks to the camera with open, natural hand gestures at chest height and a small step toward the camera, then ends standing relaxed with both hands visible.`;
}

/** Turn the director's segments into the Vivix response.create script event. */
export function buildScriptEvent(turn: Pick<DirectedTurn, 'speech' | 'actions'>) {
  return {
    type: 'response.create',
    response: {
      script: {
        vocal: { type: 'speech', text: turn.speech },
        visual: { prompt: turn.actions.join(VMP_SEPARATOR), duration_ms: SEGMENT_MS },
      },
    },
  };
}

export async function directTurn(params: {
  question: string;
  character: CharacterPreset;
  history: Array<{ role: 'user' | 'character'; text: string }>;
  product?: StageProduct | null;
  locale: string;
}): Promise<DirectedTurn> {
  const { question, character, history, product, locale } = params;
  mark('director: web search → start');
  const sources = (await executeWebSearch(question).catch(() => [])).slice(0, 6);
  mark('director: web search ← done', { results: sources.length });

  const productBlock = product
    ? `
SELLING MODE: the user wants to buy. A product is on stage: "${product.title}", referenced as <OBJ_0>.
In speech, present it warmly and honestly by name (never say "OBJ_0"), mention 2–3 real strengths from the sources, no invented prices or stock.
In actions, the character picks the product <OBJ_0> up from the small table beside them, holds it toward the camera, turns it to show it off, and keeps holding it. Write the tag <OBJ_0> exactly once per segment, at the product's first mention.`
    : '';

  const prompt = `You are the director of a live, full-body AI presenter on a small stage. The presenter answers the user's question out loud while acting.

Presenter: ${character.name}. Appearance and scene: ${character.description}
Personality: ${character.personality}

Conversation so far:
${history.slice(-6).map((h) => `${h.role === 'user' ? 'User' : character.name}: ${h.text}`).join('\n') || '(none)'}

User now asks: "${question}"

Search Results:
${buildSourcesText(sources)}
${productBlock}

Return ONLY a JSON object:
{
  "speech": "...",
  "actions": ["...", "..."],
  "suggestions": ["...", "...", "..."]
}

speech: what the presenter says, in language "${locale}". 40–80 words, spoken and warm, like a great TV host — accurate and grounded in the sources, no markdown, no emojis, no URLs, no citations. Answer directly; no "great question".
actions: exactly ${PLANNED_SEGMENTS} English Visual Motion Prompts, one per ~5 seconds, played in order while speaking. Each one must stand alone and include: the camera ("Static full-body shot at eye level"), a short description of the presenter and scene, the starting pose, ONE main visible movement, and the ending pose. Vary the performance with the topic: gestures that illustrate the idea, walking a few steps across the stage, turning to point, playful moves or a short dance for fun topics. Keep the whole body and both hands visible; start each segment where the previous one ended. Never describe the mouth or lips.
suggestions: 3 short, curious follow-up questions the user might ask next, in language "${locale}".`;

  const raw = await streamLLMText(prompt, 1400, () => undefined, 45000);
  mark('director: LLM ← done', { chars: raw.length });
  return { ...parseDirectorOutput(raw, character), sources };
}
