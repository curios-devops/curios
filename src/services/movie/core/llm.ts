// Thin JSON-mode LLM helper for Movie agents.
// Mirrors the fetch-openai channel used by cinematic's narrativeFlow (no API key in the client).
import { appSettings } from '../../../config/appSettings';

// The current movie's answer model (Luna/Sol/Astra, chosen per question by MovieResults).
// Module-level because one movie generates at a time and every agent + narrativeFlow share it.
let movieModel = appSettings.models.sol;
// Complex questions get more time at the edge (fetch-openai caps it at 140 s).
let movieTimeoutMs: number | undefined;
export function setMovieModel(model: string, timeoutMs?: number): void {
  movieModel = model;
  movieTimeoutMs = timeoutMs;
}
export function getMovieModel(): string {
  return movieModel;
}

export async function fetchOpenAI(promptPayload: Record<string, unknown>): Promise<string> {
  const endpoint = import.meta.env.VITE_OPENAI_API_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!endpoint || !anonKey) {
    throw new Error('VITE_OPENAI_API_URL or VITE_SUPABASE_ANON_KEY is not configured');
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ prompt: JSON.stringify(promptPayload) }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI edge call failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.text || data.content || data.output_text || '';
}

// Streamed reply: `onText` gets the text so far after every chunk; resolves with the full text.
async function fetchOpenAIStreamed(promptPayload: Record<string, unknown>, onText: (soFar: string) => void): Promise<string> {
  const response = await fetch(import.meta.env.VITE_OPENAI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ prompt: JSON.stringify(promptPayload), stream: true }),
  });
  if (!response.ok || !response.body) throw new Error(`OpenAI streaming edge call failed (${response.status})`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const chunk = (JSON.parse(line.slice(6).trim()) as { content?: unknown }).content;
        if (typeof chunk === 'string' && chunk) { text += chunk; onText(text); }
      } catch { /* [DONE] or a keep-alive */ }
    }
  }
  return text;
}

/**
 * Call the LLM and parse a JSON object response. With `onText` the reply streams and
 * `onText` sees the text so far (read pieces early with partialJson); if the stream fails
 * it falls back to the normal call.
 */
export async function callMovieLLMJson<T>(
  systemPrompt: string,
  userPrompt: string,
  schemaHint: Record<string, string>,
  temperature = 0.5,
  onText?: (soFar: string) => void,
): Promise<T> {
  const request = (model: string) => (onText ? (p: Record<string, unknown>) => fetchOpenAIStreamed(p, onText).then((t) => t || fetchOpenAI(p), () => fetchOpenAI(p)) : fetchOpenAI)({
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `${userPrompt}\n\nReturn valid JSON only. Expected keys: ${JSON.stringify(schemaHint)}`,
      },
    ],
    model,
    temperature,
    response_format: { type: 'json_object' },
    ...(movieTimeoutMs ? { timeout_ms: movieTimeoutMs } : {}),
  });
  // A slow or failing Sol/Astra call (e.g. the edge timeout, 500) is retried once with Luna,
  // the fast tier, instead of failing the whole video.
  const raw = await request(movieModel).catch((err) => {
    if (movieModel === appSettings.models.luna) throw err;
    console.warn('[movie llm] retrying with Luna:', err instanceof Error ? err.message : err);
    return request(appSettings.models.luna);
  });

  if (!raw) throw new Error('OpenAI response did not include text content');

  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Failed to parse JSON response from OpenAI');
    return JSON.parse(match[0]) as T;
  }
}
