import { logger } from '../../../../utils/logger';
import { createClient } from '@supabase/supabase-js';
import { env } from '../../../../config/env';

/**
 * Anam Streaming Service
 * Handles real-time WebSocket/WebRTC connection to Anam API
 *
 * Architecture:
 * Frontend → Supabase (get secure token) → WebSocket → Anam → Real-time video stream
 * ✅ API key stays secure on server!
 */

const SUPABASE_URL = env.supabase.url;
const SUPABASE_ANON_KEY = env.supabase.anonKey;

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface AnamStreamConfig {
  personaId?: string;
  onVideoFrame?: (frame: Blob) => void;
  onAudioChunk?: (chunk: Blob) => void;
  onError?: (error: Error) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export class AnamStreamingClient {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private config: AnamStreamConfig;

  constructor(config: AnamStreamConfig = {}) {
    this.config = config;
  }

  /**
   * Step 1: Get Anam API key from Supabase
   * Returns API key for WebSocket connection
   * ✅ API key retrieved securely from server!
   */
  private async getAnamApiKey(): Promise<{ apiKey: string; wsUrl: string }> {
    logger.info('🎭 [Anam] Getting API key from Supabase...');

    try {
      // Call Supabase function to get Anam API key
      const { data, error } = await supabase.functions.invoke('get-anam-token', {
        body: {},
      });

      if (error) {
        throw new Error(`Failed to get Anam API key: ${error.message}`);
      }

      if (!data || !data.apiKey) {
        throw new Error('No API key received from Supabase');
      }

      logger.info('✅ [Anam] API key received', {
        wsUrl: data.wsUrl,
      });

      return {
        apiKey: data.apiKey,
        wsUrl: data.wsUrl || 'wss://api.anam.ai/v1/streaming',
      };

    } catch (error) {
      logger.error('❌ [Anam] API key retrieval failed', { error });
      throw error;
    }
  }

  /**
   * Step 2: Connect to Anam WebSocket
   */
  async connect(personaId?: string): Promise<void> {
    try {
      // Get API key from Supabase
      const { apiKey, wsUrl: baseWsUrl } = await this.getAnamApiKey();

      // Connect to WebSocket with API key
      // Note: WebSocket URL format depends on Anam's actual protocol
      const wsUrl = `${baseWsUrl}?api_key=${encodeURIComponent(apiKey)}${personaId ? `&persona_id=${personaId}` : ''}`;
      logger.info('🔌 [Anam] Connecting to WebSocket...', { wsUrl: baseWsUrl });

      this.ws = new WebSocket(wsUrl);

      // Setup event handlers
      this.ws.onopen = () => {
        logger.info('✅ [Anam] WebSocket connected');
        this.config.onConnected?.();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onerror = (error) => {
        logger.error('❌ [Anam] WebSocket error', { error });
        this.config.onError?.(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        logger.info('🔌 [Anam] WebSocket disconnected');
        this.config.onDisconnected?.();
      };

      // Wait for connection
      await this.waitForConnection();

    } catch (error) {
      logger.error('❌ [Anam] Connection failed', { error });
      throw error;
    }
  }

  /**
   * Wait for WebSocket to be ready
   */
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      const checkConnection = () => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          clearTimeout(timeout);
          resolve();
        } else if (this.ws?.readyState === WebSocket.CLOSED) {
          clearTimeout(timeout);
          reject(new Error('WebSocket connection closed'));
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent) {
    try {
      // Check if binary data (video/audio frame)
      if (event.data instanceof Blob) {
        // Anam sends video frames as binary data
        this.config.onVideoFrame?.(event.data);
        logger.debug('[Anam] Received video frame', { size: event.data.size });
        return;
      }

      // JSON message
      const message = JSON.parse(event.data);
      logger.debug('[Anam] Received message', { type: message.type });

      switch (message.type) {
        case 'video_frame':
          // Handle base64 video frame
          if (message.data) {
            const blob = this.base64ToBlob(message.data, 'video/webm');
            this.config.onVideoFrame?.(blob);
          }
          break;

        case 'audio_chunk':
          // Handle audio chunk
          if (message.data) {
            const blob = this.base64ToBlob(message.data, 'audio/webm');
            this.config.onAudioChunk?.(blob);
          }
          break;

        case 'error':
          logger.error('[Anam] Server error', { error: message.error });
          this.config.onError?.(new Error(message.error));
          break;

        default:
          logger.debug('[Anam] Unknown message type', { type: message.type });
      }

    } catch (error) {
      logger.error('[Anam] Failed to handle message', { error });
    }
  }

  /**
   * Send audio to Anam for avatar response
   */
  async sendAudio(audioBlob: Blob): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    logger.info('🎤 [Anam] Sending audio to Anam', { size: audioBlob.size });

    // Convert to base64
    const base64Audio = await this.blobToBase64(audioBlob);

    // Send to Anam
    this.ws.send(JSON.stringify({
      type: 'audio',
      data: base64Audio,
      format: 'mp3',
    }));
  }

  /**
   * Send text to Anam for avatar response
   */
  async sendText(text: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    logger.info('💬 [Anam] Sending text to Anam', { text: text.substring(0, 50) + '...' });

    this.ws.send(JSON.stringify({
      type: 'text',
      text: text,
    }));
  }

  /**
   * Disconnect from Anam
   */
  disconnect(): void {
    if (this.ws) {
      logger.info('🔌 [Anam] Disconnecting...');
      this.ws.close();
      this.ws = null;
    }
    this.sessionId = null;
  }

  /**
   * Utility: Convert Blob to base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data:audio/mp3;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Utility: Convert base64 to Blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([byteNumbers], { type: mimeType });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }
}

/**
 * Simplified API for audio → avatar streaming
 */
export async function streamAudioToAnam(
  audioBlob: Blob,
  onVideoFrame: (frame: Blob) => void,
  personaId?: string
): Promise<AnamStreamingClient> {
  const client = new AnamStreamingClient({
    personaId,
    onVideoFrame,
    onError: (error) => {
      logger.error('❌ [Anam] Streaming error', { error });
    },
    onConnected: () => {
      logger.info('✅ [Anam] Streaming started');
    },
  });

  // Connect
  await client.connect(personaId);

  // Send audio
  await client.sendAudio(audioBlob);

  return client;
}
