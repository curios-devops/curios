import { logger } from '../../../../utils/logger';
import { env } from '../../../../config/env';

const SUPABASE_URL = env.supabase.url;
const SUPABASE_ANON_KEY = env.supabase.anonKey;

const NARRATIVE_SYSTEM_PROMPT = `You are a friendly AI assistant that provides clear, conversational answers optimized for voice narration.

Your responses should be:
- Written in a natural, conversational tone as if speaking to someone
- Organized in clear, easy-to-follow paragraphs
- Free of special characters, markdown, or formatting
- Between 60-80 words ONLY (brief and concise for ~30 second narration)
- Friendly and engaging, like a narrator telling a story

Avoid:
- Bullet points or lists (use flowing paragraphs instead)
- Technical jargon unless necessary
- Long, complex sentences
- URLs or links

Structure:
- Start with a brief, engaging introduction
- Provide the main information in 1-2 clear sentences
- End with a natural conclusion if space permits`;

export interface NarrativeResponse {
  title: string;
  narrative: string;
}

/**
 * Generate a title for the response based on the query
 * @param query - The user's query
 * @returns A concise title
 */
async function generateTitle(query: string): Promise<string> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-openai`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Generate a short, descriptive title (5-8 words max) for the following query. Return only the title, no quotes or extra text.'
            },
            { role: 'user', content: query },
          ],
          temperature: 0.5,
          max_output_tokens: 50,
        },
      }),
    });

    if (!response.ok) {
      logger.warn('Failed to generate title, using fallback');
      return 'Response';
    }

    const data = await response.json();
    const title = data?.text ?? 'Response';
    return title.replace(/^["']|["']$/g, '').trim(); // Remove quotes if present
  } catch (error) {
    logger.warn('Error generating title, using fallback', { error });
    return 'Response';
  }
}

/**
 * Generate a narrative-friendly response using OpenAI via Supabase Edge Function
 * Different from regular search - optimized for voice narration
 * @param query - The user's query
 * @returns Object with title and narrative text suitable for TTS
 */
export async function generateNarrativeResponse(query: string): Promise<NarrativeResponse> {
  try {
    logger.info('📝 [Narrative] Starting narrative response generation', { query });

    // fetch-openai expects { prompt: { model, messages, temperature, max_output_tokens } }
    // Use stream:false and omit response_format to get plain text back as { text: string }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000); // 35 second timeout

    const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-openai`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: NARRATIVE_SYSTEM_PROMPT },
            { role: 'user', content: query },
          ],
          temperature: 0.7,
          max_output_tokens: 150,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('❌ [Narrative] fetch-openai edge function error', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`fetch-openai error: ${response.status} ${response.statusText} — ${errorText}`);
    }

    logger.info('✅ [Narrative] Got response from fetch-openai', { status: response.status });

    const data = await response.json();
    logger.info('📝 [Narrative] Parsed response JSON', { keys: Object.keys(data) });

    // fetch-openai returns { text: string, openai: {...} }
    const narrativeText: string = data?.text ?? data?.choices?.[0]?.message?.content ?? '';

    if (!narrativeText) {
      logger.error('❌ [Narrative] No narrative text in response', { data });
      throw new Error(`No narrative text generated. Response keys: ${Object.keys(data).join(', ')}`);
    }

    logger.info('✅ [Narrative] Response generated successfully', {
      length: narrativeText.length,
      preview: narrativeText.substring(0, 100),
    });

    // Generate title in parallel (don't wait for it to avoid blocking)
    const title = await generateTitle(query);
    logger.info('✅ [Narrative] Title generated', { title });

    return {
      title,
      narrative: narrativeText
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('❌ [Narrative] Generation failed', { error: errorMessage });
    throw new Error(`Failed to generate narrative response: ${errorMessage}`);
  }
}
