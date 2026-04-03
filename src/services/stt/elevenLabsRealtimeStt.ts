import { env } from '../../config/env';
import { logger } from '../../utils/logger';

const ELEVENLABS_REALTIME_URL = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';

interface ElevenLabsRealtimeOptions {
  language?: string;
  timeoutMs?: number;
  previousText?: string;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to convert audio blob to base64'));
        return;
      }
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.substring(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error('FileReader failed while encoding audio'));
    reader.readAsDataURL(blob);
  });
}

async function getRealtimeCredential(): Promise<string | null> {
  try {
    const response = await fetch(`${env.supabase.url}/functions/v1/get-elevenlabs-stt-token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.supabase.anonKey}`,
        apikey: env.supabase.anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      if (typeof data?.token === 'string' && data.token.trim()) {
        return data.token.trim();
      }
    }
  } catch {
    logger.warn('[ElevenLabs STT] Token edge function unavailable, using local credential fallback');
  }

  if (env.elevenLabs.sttToken) {
    return env.elevenLabs.sttToken;
  }

  if (env.elevenLabs.apiKey) {
    logger.warn('[ElevenLabs STT] Using VITE_ELEVENLABS_API_KEY client-side fallback token');
    return env.elevenLabs.apiKey;
  }

  return null;
}

export async function transcribeWithElevenLabsRealtime(
  audioBlob: Blob,
  options: ElevenLabsRealtimeOptions = {},
): Promise<string> {
  const credential = await getRealtimeCredential();
  if (!credential) {
    throw new Error('No ElevenLabs realtime credential available');
  }

  const modelId = env.elevenLabs.sttModelId;
  const language = options.language || 'en';
  const timeoutMs = options.timeoutMs ?? 18000;
  const previousText = options.previousText || '';

  const query = new URLSearchParams({
    model_id: modelId,
    token: credential,
    language_code: language,
    commit_strategy: 'manual',
    include_timestamps: 'false',
  });

  const wsUrl = `${ELEVENLABS_REALTIME_URL}?${query.toString()}`;

  const audioBase64 = await blobToBase64(audioBlob);

  logger.info('[ElevenLabs STT] Opening realtime websocket', {
    modelId,
    language,
    blobSize: audioBlob.size,
  });

  return new Promise<string>((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    let partialTranscript = '';
    let resolved = false;

    const finish = (handler: () => void) => {
      if (resolved) {
        return;
      }
      resolved = true;
      try {
        socket.close();
      } catch {
        // ignore close errors
      }
      handler();
    };

    const timeout = window.setTimeout(() => {
      finish(() => {
        if (partialTranscript.trim()) {
          resolve(partialTranscript.trim());
        } else {
          reject(new Error('ElevenLabs realtime transcription timeout'));
        }
      });
    }, timeoutMs);

    socket.onopen = () => {
      const payload = {
        message_type: 'input_audio_chunk',
        audio_base_64: audioBase64,
        commit: true,
        sample_rate: 16000,
        previous_text: previousText,
      };

      socket.send(JSON.stringify(payload));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as {
          message_type?: string;
          text?: string;
          error?: string;
          details?: string;
        };

        const messageType = message.message_type;

        if (messageType === 'partial_transcript' && message.text) {
          partialTranscript = message.text;
          return;
        }

        if ((messageType === 'committed_transcript' || messageType === 'committed_transcript_with_timestamps') && message.text) {
          const committedText = message.text.trim();
          window.clearTimeout(timeout);
          finish(() => resolve(committedText));
          return;
        }

        if (messageType && messageType.startsWith('scribe_') && messageType.endsWith('_error')) {
          window.clearTimeout(timeout);
          const details = message.details || message.error || messageType;
          finish(() => reject(new Error(`ElevenLabs realtime error: ${details}`)));
        }
      } catch (error) {
        window.clearTimeout(timeout);
        finish(() => reject(error instanceof Error ? error : new Error('Invalid websocket message')));
      }
    };

    socket.onerror = () => {
      window.clearTimeout(timeout);
      finish(() => reject(new Error('ElevenLabs realtime websocket connection failed')));
    };

    socket.onclose = () => {
      if (resolved) {
        return;
      }
      window.clearTimeout(timeout);
      finish(() => {
        if (partialTranscript.trim()) {
          resolve(partialTranscript.trim());
        } else {
          reject(new Error('ElevenLabs realtime websocket closed without transcript'));
        }
      });
    };
  });
}
