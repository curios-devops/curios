import { logger } from '../../utils/logger';
import { env } from '../../config/env';

const SUPABASE_URL = env.supabase.url;
const SUPABASE_ANON_KEY = env.supabase.anonKey;

/**
 * Transcribe audio using the Whisper Supabase Edge Function.
 * API key stays server-side — never exposed to the browser.
 * @param audioBlob - The audio blob to transcribe
 * @param language  - BCP-47 language code (default: 'en')
 * @returns The transcribed text
 */
export async function transcribeAudio(audioBlob: Blob, language = 'en'): Promise<string> {
  try {
    logger.info('Starting Whisper transcription via Supabase', { blobSize: audioBlob.size, language });

    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');
    formData.append('language', language);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/whisper-transcription`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        // Note: Do NOT set Content-Type here — the browser sets it with the correct boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('Whisper edge function error', {
        status: response.status,
        error: errorData,
      });
      throw new Error(`whisper-transcription error: ${response.status}`);
    }

    const result = await response.json();

    logger.info('Whisper transcription successful', {
      textLength: result.text?.length,
      preview: result.text?.substring(0, 50),
    });

    return result.text as string;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Whisper transcription failed', { error: errorMessage });
    throw new Error(`Failed to transcribe audio: ${errorMessage}`);
  }
}
