import { logger } from '../../utils/logger';
import { transcribeAudio as transcribeWithWhisper } from '../whisper/whisperService';
import { transcribeWithElevenLabsRealtime } from './elevenLabsRealtimeStt';

export async function transcribeAudioWithFallback(audioBlob: Blob, language = 'en'): Promise<string> {
  try {
    logger.info('[STT] Attempting ElevenLabs realtime transcription');
    const text = await transcribeWithElevenLabsRealtime(audioBlob, { language });

    if (text?.trim()) {
      logger.info('[STT] ElevenLabs realtime transcription succeeded', { textLength: text.length });
      return text;
    }

    throw new Error('Empty transcription from ElevenLabs realtime');
  } catch (elevenLabsError) {
    logger.warn('[STT] ElevenLabs realtime failed, falling back to Whisper', {
      error: elevenLabsError instanceof Error ? elevenLabsError.message : String(elevenLabsError),
    });

    const whisperText = await transcribeWithWhisper(audioBlob, language);
    logger.info('[STT] Whisper fallback transcription succeeded', { textLength: whisperText.length });
    return whisperText;
  }
}
