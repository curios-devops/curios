import { searchWithTavily } from '../../../commonService/searchTools/tavilyService.ts';
import { logger } from '../../../utils/logger.ts';

export interface CinematicSourceLike {
  title: string;
  url: string;
  snippet: string;
}

export interface DirectorScenePlan {
  title: string;
  narration: string;
  visualPrompt: string;
  durationSeconds?: number;
}

export interface DirectorPlan {
  title: string;
  description: string;
  scenes: DirectorScenePlan[];
  relatedTopics: string[];
}

const MAX_SCENES = 4;
const MIN_SCENES = 3;
const VEO_MAX_SECONDS_PER_SCENE = 10;
const DEFAULT_SCENE_DURATION_SECONDS = 7;
const MIN_SCENE_DURATION_SECONDS = 6;
const MAX_SCENE_DURATION_SECONDS = 8;

type NarrativePhase = 'draft' | 'final';

async function callOpenAIJson<T>(
  systemPrompt: string,
  userPrompt: string,
  schemaHint: Record<string, string>
): Promise<T> {
  const payload = {
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `${userPrompt}\n\nReturn valid JSON only. Expected keys: ${JSON.stringify(schemaHint)}`,
      },
    ],
    model: 'gpt-4.1-mini-2025-04-14',
    temperature: 0.4,
    response_format: { type: 'json_object' },
  };

  const response = await fetchOpenAI(payload);
  const raw = response.text || response.content || response.output_text || '';

  if (!raw) {
    throw new Error('OpenAI response did not include text content');
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('Failed to parse JSON response from OpenAI');
    }
    return JSON.parse(match[0]) as T;
  }
}

async function fetchOpenAI(promptPayload: Record<string, unknown>) {
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

  return response.json();
}

async function callOpenAIText(systemPrompt: string, userPrompt: string): Promise<string> {
  const payload = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: 'gpt-4.1-mini-2025-04-14',
    temperature: 0.4,
  };

  const response = await fetchOpenAI(payload);
  return response.text || response.content || response.output_text || '';
}

async function fetchOpenAIStream(
  messages: Array<{ role: string; content: string }>,
  onChunk: (chunk: string, fullText: string, isComplete: boolean) => void,
  options?: { maxOutputTokens?: number }
): Promise<string> {
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
    body: JSON.stringify({
      prompt: JSON.stringify({
        messages,
        model: 'gpt-4.1-mini-2025-04-14',
        temperature: 0.4,
        max_output_tokens: options?.maxOutputTokens ?? 1200,
      }),
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI streaming edge call failed (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error('Missing streaming response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') {
        onChunk('', fullText, true);
        continue;
      }

      try {
        const parsed = JSON.parse(payload);
        const chunk = typeof parsed.content === 'string' ? parsed.content : '';
        if (!chunk) continue;

        fullText += chunk;
        onChunk(chunk, fullText, false);
      } catch {
        continue;
      }
    }
  }

  onChunk('', fullText, true);
  return fullText;
}

export async function rewriteQueryForSearch(query: string): Promise<string> {
  const payload = await callOpenAIJson<{ rewrittenQuery?: string }>(
    'You rewrite user questions into one concise web search query optimized for trusted sources.',
    `Rewrite this question for web search in one sentence:\n\n${query}`,
    {
      rewrittenQuery: 'string',
    }
  );

  return payload.rewrittenQuery?.trim() || query;
}

export async function streamNarrative(
  query: string,
  sources: CinematicSourceLike[],
  onNarrativeChunk?: (chunk: string, fullText: string, isComplete: boolean, phase: NarrativePhase) => void
): Promise<string> {
  const sourceText = sources
    .slice(0, 6)
    .map((source, index) => `${index + 1}. ${source.title}\nURL: ${source.url}\nSnippet: ${source.snippet}`)
    .join('\n\n');

  const messages = [
    {
      role: 'system',
      content: [
        'You are a clear explainer for everyday users.',
        'Write a friendly, concise, non-technical explanation in markdown.',
        'Do not mention tools, APIs, internal systems, or implementation details.',
        'Focus on what the user should understand and why it matters.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `Question: ${query}`,
        '',
        'Trusted source excerpts:',
        sourceText || 'No sources available',
        '',
        'Write 2-4 short paragraphs with optional bullet points.',
      ].join('\n'),
    },
  ];

  try {
    return await fetchOpenAIStream(messages, (chunk, full, done) => {
      onNarrativeChunk?.(chunk, full, done, 'final');
    }, { maxOutputTokens: 1200 });
  } catch (error) {
    logger.warn('[CinematicService] Narrative streaming failed, falling back to non-streaming', {
      error: error instanceof Error ? error.message : String(error),
    });

    const fallbackText = await callOpenAIText(
      'You are a clear explainer for everyday users. Write friendly, concise markdown and avoid technical/internal references.',
      [
        `Question: ${query}`,
        '',
        'Trusted source excerpts:',
        sourceText || 'No sources available',
      ].join('\n')
    );

    onNarrativeChunk?.(fallbackText, fallbackText, true, 'final');
    return fallbackText;
  }
}

export async function streamDraftNarrative(
  query: string,
  onNarrativeChunk?: (chunk: string, fullText: string, isComplete: boolean, phase: NarrativePhase) => void
): Promise<string> {
  const messages = [
    {
      role: 'system',
      content: [
        'You are a clear explainer for everyday users.',
        'Write a short, friendly draft in markdown based only on the user question.',
        'Do not mention tools, APIs, internal systems, or implementation details.',
        'Keep it to 1 short paragraph and 2-3 bullets max.',
      ].join(' '),
    },
    {
      role: 'user',
      content: [
        `Question: ${query}`,
        '',
        'Write a quick draft the user can start reading immediately.',
      ].join('\n'),
    },
  ];

  return fetchOpenAIStream(messages, (chunk, full, done) => {
    onNarrativeChunk?.(chunk, full, done, 'draft');
  }, { maxOutputTokens: 260 });
}

export async function createDirectorPlan(query: string, sources: CinematicSourceLike[], narrative: string): Promise<DirectorPlan> {
  const sourceText = sources
    .slice(0, 6)
    .map((source, index) => `${index + 1}. ${source.title}\nURL: ${source.url}\nSnippet: ${source.snippet}`)
    .join('\n\n');

  const payload = await callOpenAIJson<DirectorPlan>(
    [
      'You are the Director Agent for cinematic explainers.',
      `Rules: create ${MIN_SCENES}-${MAX_SCENES} scenes, each scene must fit an ${VEO_MAX_SECONDS_PER_SCENE}-second Veo clip.`,
      'Prefer 4 scenes when possible; use 3 only for very simple topics.',
      'Use source-grounded facts only and avoid speculation.',
      'Return strict JSON.',
    ].join(' '),
    [
      `User question: ${query}`,
      '',
      'Narrative that will be shown to the user:',
      narrative || 'No narrative available',
      '',
      'Trusted source excerpts:',
      sourceText || 'No sources available',
      '',
      'Return JSON with fields:',
      '{',
      '  "title": "string",',
      '  "description": "string for end users",',
      '  "scenes": [{ "title": "string", "narration": "string", "visualPrompt": "string optimized for Veo", "durationSeconds": "integer from 6 to 8" }],',
      '  "relatedTopics": ["string", "string", "string", "string"]',
      '}',
      `Scene count must be between ${MIN_SCENES} and ${MAX_SCENES}.`,
      'For durationSeconds, choose between 6 and 8 seconds based on narration density (6 concise, 7 balanced, 8 dense).',
      'Use 6 or 7 when possible; reserve 8 for denser scenes.',
      'Keep each narration concise enough to fit its chosen duration naturally.',
    ].join('\n'),
    {
      title: 'string',
      description: 'string',
      scenes: 'array',
      relatedTopics: 'array',
    }
  );

  return {
    title: payload.title || query,
    description: payload.description || '',
    scenes: Array.isArray(payload.scenes) ? payload.scenes : [],
    relatedTopics: Array.isArray(payload.relatedTopics) ? payload.relatedTopics : [],
  };
}

export function normalizeScenes(rawScenes: DirectorScenePlan[]): DirectorScenePlan[] {
  const cleaned = rawScenes
    .filter((scene) => scene && scene.title && scene.narration && scene.visualPrompt)
    .slice(0, MAX_SCENES)
    .map((scene, index) => {
      const title = typeof scene.title === 'string' ? scene.title.trim() : '';
      const narration = typeof scene.narration === 'string' ? scene.narration.trim() : '';
      const visualPrompt = typeof scene.visualPrompt === 'string' ? scene.visualPrompt.trim() : '';
      const durationSeconds = resolveSceneDurationSeconds(narration, scene.durationSeconds);

      return {
        title: title || `Scene ${index + 1}`,
        narration: narration || 'This scene summarizes one key insight from the question.',
        visualPrompt: visualPrompt || 'Cinematic documentary shot, realistic lighting, subtle camera motion, high detail.',
        durationSeconds,
      };
    });

  if (cleaned.length >= MIN_SCENES) {
    return cleaned;
  }

  const fallbackCount = Math.max(MIN_SCENES, cleaned.length || 0);
  const fallback = [...cleaned];
  while (fallback.length < fallbackCount) {
    const index = fallback.length + 1;
    fallback.push({
      title: `Scene ${index}`,
      narration: 'This scene summarizes one key insight from the question.',
      visualPrompt: 'Cinematic documentary shot, realistic lighting, subtle camera motion, high detail.',
      durationSeconds: DEFAULT_SCENE_DURATION_SECONDS,
    });
  }

  return fallback;
}

function estimateDurationFromNarration(narration: string): number {
  if (!narration.trim()) {
    return DEFAULT_SCENE_DURATION_SECONDS;
  }

  const words = narration.trim().split(/\s+/).length;

  if (words <= 16) return 6;
  if (words <= 26) return 7;
  return 8;
}

function sanitizeDurationBucket(durationSeconds: number): number {
  const rounded = Math.round(durationSeconds);
  if (rounded < MIN_SCENE_DURATION_SECONDS) return MIN_SCENE_DURATION_SECONDS;
  if (rounded > MAX_SCENE_DURATION_SECONDS) return MAX_SCENE_DURATION_SECONDS;
  return rounded;
}

function resolveSceneDurationSeconds(narration: string, directorDuration?: number): number {
  if (typeof directorDuration === 'number' && Number.isFinite(directorDuration)) {
    return sanitizeDurationBucket(directorDuration);
  }

  return sanitizeDurationBucket(estimateDurationFromNarration(narration));
}

export async function enrichRelatedTopics(
  relatedTopics: string[],
  initialImages: Array<{ url: string; description?: string }>
): Promise<Array<{ title: string; imageUrl?: string }>> {
  const topics = relatedTopics.filter(Boolean).slice(0, 4);

  if (topics.length === 0) {
    return [];
  }

  const imageQueue = [...initialImages];

  return Promise.all(
    topics.map(async (topic) => {
      try {
        const queuedImage = imageQueue.shift();
        if (queuedImage?.url) {
          return { title: topic, imageUrl: queuedImage.url };
        }

        const search = await searchWithTavily(topic);
        const firstImage = search.images?.[0]?.url;
        return { title: topic, imageUrl: firstImage };
      } catch (error) {
        logger.warn('[CinematicService] Related topic image lookup failed', {
          topic,
          error: error instanceof Error ? error.message : String(error),
        });
        return { title: topic };
      }
    })
  );
}
