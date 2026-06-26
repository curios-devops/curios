// Cheap topic derivation for a curiosity node: 2–4 short, lowercase topic tags.
// One tiny LLM call (cheap model, JSON mode) through the existing fetch-openai
// edge channel — no API key in the client. Always best-effort: returns [] on
// any failure so persistence never depends on it.

import { logger } from '../../utils/logger';

const TOPICS_MODEL = import.meta.env.VITE_TOPICS_LLM_MODEL || 'gpt-4.1-mini-2025-04-14';

/** URL slug for a topic, e.g. "monetary policy" -> "monetary-policy". */
export function topicSlug(topic: string): string {
  return topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Best-effort inverse for routing/display, e.g. "monetary-policy" -> "monetary policy". */
export function topicFromSlug(slug: string): string {
  return decodeURIComponent(slug).replace(/-+/g, ' ').trim().toLowerCase();
}

export async function deriveTopics(query: string, answer: string): Promise<string[]> {
  const endpoint = import.meta.env.VITE_OPENAI_API_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!endpoint || !anonKey) return [];

  const payload = {
    messages: [
      {
        role: 'system',
        content:
          'You label content with topics. Return 2-4 broad, reusable topic tags (1-2 words each, lowercase, no punctuation) that best categorize the question and answer. Prefer canonical subject names (e.g. "economics", "monetary policy", "artificial intelligence"). Return JSON only.',
      },
      {
        role: 'user',
        content: `Question: ${query}\n\nAnswer (excerpt): ${answer.slice(0, 1200)}\n\nReturn valid JSON only as {"topics": string[]}.`,
      },
    ],
    model: TOPICS_MODEL,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anonKey}` },
      body: JSON.stringify({ prompt: JSON.stringify(payload) }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();
    const raw = data.text || data.content || data.output_text || '';
    const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || '{}');
    const topics = Array.isArray(parsed.topics) ? parsed.topics : [];
    const cleaned = topics
      .map((t: unknown) => String(t).trim().toLowerCase())
      .filter((t: string) => t.length > 1 && t.length < 40);
    return [...new Set(cleaned)].slice(0, 4); // dedup, case already normalized
  } catch (error) {
    logger.warn('[topicService] deriveTopics failed', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}
