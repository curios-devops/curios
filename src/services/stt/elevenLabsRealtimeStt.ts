import { env } from '../../config/env';
import { logger } from '../../utils/logger';

const ELEVENLABS_REALTIME_URL = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';

interface ElevenLabsRealtimeOptions {
  language?: string;
  timeoutMs?: number;
  previousText?: string;
}

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        reject(new Error('Failed to read audio blob as ArrayBuffer'));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error('FileReader failed while reading audio blob'));
    reader.readAsArrayBuffer(blob);
  });
}

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index]));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

function int16ToBase64(samples: Int16Array): string {
  const bytes = new Uint8Array(samples.buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function blobToPcm16Base64(blob: Blob, targetSampleRate = 16000): Promise<string> {
  const arrayBuffer = await blobToArrayBuffer(blob);
  const audioContext = new AudioContext();

  try {
    const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

    const sourceData = decodedBuffer.getChannelData(0);
    const sourceSampleRate = decodedBuffer.sampleRate;
    const ratio = sourceSampleRate / targetSampleRate;
    const targetLength = Math.max(1, Math.floor(sourceData.length / ratio));

    const resampled = new Float32Array(targetLength);
    for (let index = 0; index < targetLength; index += 1) {
      const sourceIndex = Math.min(sourceData.length - 1, Math.floor(index * ratio));
      resampled[index] = sourceData[sourceIndex];
    }

    const pcm16 = floatTo16BitPCM(resampled);
    return int16ToBase64(pcm16);
  } finally {
    await audioContext.close();
  }
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
  } catch (error) {
    logger.warn('[ElevenLabs STT] Token edge function request failed', {
      error: error instanceof Error ? error.message : String(error),
    });
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

  const audioBase64 = await blobToPcm16Base64(audioBlob, 16000);

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
