// Thin JSON-mode LLM helper for Movie agents.
// Mirrors the fetch-openai channel used by cinematic's narrativeFlow (no API key in the client).

const MOVIE_LLM_MODEL = import.meta.env.VITE_MOVIE_LLM_MODEL || 'gpt-4.1-mini-2025-04-14';

async function fetchOpenAI(promptPayload: Record<string, unknown>): Promise<string> {
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

/** Call the LLM and parse a JSON object response. */
export async function callMovieLLMJson<T>(
  systemPrompt: string,
  userPrompt: string,
  schemaHint: Record<string, string>,
  temperature = 0.5,
): Promise<T> {
  const raw = await fetchOpenAI({
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `${userPrompt}\n\nReturn valid JSON only. Expected keys: ${JSON.stringify(schemaHint)}`,
      },
    ],
    model: MOVIE_LLM_MODEL,
    temperature,
    response_format: { type: 'json_object' },
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
