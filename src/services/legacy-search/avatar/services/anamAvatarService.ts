/**
 * Anam AI Avatar Service
 * Uses official @anam-ai/js-sdk for streaming avatar generation
 *
 * Architecture:
 * 1. Get session token from Supabase (secure)
 * 2. Initialize Anam SDK with session token
 * 3. Stream avatar to video element
 * 4. Send audio/text to generate avatar response
 */

import { createClient } from '@anam-ai/js-sdk';
import type { AnamEvent, EventCallbacks } from '@anam-ai/js-sdk/dist/module/types';
import { supabase } from '../../../../lib/supabase';
import { logger } from '../../../../utils/logger';

interface AnamSessionResponse {
  sessionToken: string;
}

interface AnamSessionRequest {
  avatarId?: string;
}

export class AnamAvatarService {
  private anamClient: any = null;
  private isInitialized = false;

  /**
   * Get session token from Supabase edge function
   */
  private async getSessionToken(request?: AnamSessionRequest): Promise<string> {
    logger.info('🎭 [Anam] Getting session token from Supabase...');

    try {
      const { data, error } = await supabase.functions.invoke<AnamSessionResponse>('get-anam-token', {
        body: request ?? {},
      });

      if (error) {
        throw new Error(`Failed to get Anam session token: ${error.message}`);
      }

      if (!data || !data.sessionToken) {
        throw new Error('No session token received from Supabase');
      }

      logger.info('✅ [Anam] Session token received');
      return data.sessionToken;

    } catch (error) {
      logger.error('❌ [Anam] Session token retrieval failed', { error });
      throw error;
    }
  }

  /**
   * Initialize Anam client with session token
   */
  async initialize(request?: AnamSessionRequest): Promise<void> {
    if (this.isInitialized) {
      logger.info('ℹ️ [Anam] Client already initialized');
      return;
    }

    try {
      logger.info('🎭 [Anam] Initializing client...');

      const sessionToken = await this.getSessionToken(request);
      this.anamClient = createClient(sessionToken);
      this.isInitialized = true;

      logger.info('✅ [Anam] Client initialized successfully');

    } catch (error) {
      logger.error('❌ [Anam] Initialization failed', { error });
      throw error;
    }
  }

  /**
   * Start streaming avatar to video element
   * @param videoElementId - ID of the video element to stream to
   */
  async startStreaming(videoElementId: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      logger.info('🎬 [Anam] Starting avatar stream to video element', { videoElementId });

      await this.anamClient.streamToVideoElement(videoElementId);

      logger.info('✅ [Anam] Avatar streaming started');

    } catch (error) {
      logger.error('❌ [Anam] Failed to start streaming', { error });
      throw error;
    }
  }

  /**
   * Send text message to avatar (avatar will speak the response)
   * @param message - Text message to send
   */
  async sendMessage(message: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Anam client not initialized. Call initialize() first.');
    }

    try {
      logger.info('💬 [Anam] Sending message to avatar', { messageLength: message.length });

      if (typeof this.anamClient.sendUserMessage === 'function') {
        this.anamClient.sendUserMessage(message);
        logger.info('✅ [Anam] User message sent successfully');
      } else if (typeof this.anamClient.talk === 'function') {
        await this.anamClient.talk(message);
        logger.info('✅ [Anam] Message sent successfully');
      } else {
        logger.warn('⚠️ [Anam] No supported text-send method available on client', {
          availableMethods: Object.keys(this.anamClient ?? {}).sort(),
        });
        throw new Error('No supported text-send method available');
      }

    } catch (error) {
      logger.error('❌ [Anam] Failed to send message', { error });
      throw error;
    }
  }

  async speakText(content: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Anam client not initialized. Call initialize() first.');
    }

    try {
      logger.info('🗣️ [Anam] Speaking scripted text', { contentLength: content.length });

      if (typeof this.anamClient.talk === 'function') {
        await this.anamClient.talk(content);
        logger.info('✅ [Anam] Scripted text sent successfully');
      } else if (typeof this.anamClient.sendUserMessage === 'function') {
        this.anamClient.sendUserMessage(content);
        logger.info('✅ [Anam] Scripted text sent via sendUserMessage fallback');
      } else {
        logger.warn('⚠️ [Anam] No supported speak method available on client', {
          availableMethods: Object.keys(this.anamClient ?? {}).sort(),
        });
        throw new Error('No supported speak method available');
      }
    } catch (error) {
      logger.error('❌ [Anam] Failed to speak scripted text', { error });
      throw error;
    }
  }

  /**
   * Send audio to avatar (for audio passthrough mode)
   * @param audioBlob - Audio blob to send
   */
  async sendAudio(audioBlob: Blob): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Anam client not initialized. Call initialize() first.');
    }

    try {
      logger.info('🎤 [Anam] Sending audio to avatar', { size: audioBlob.size });

      // Check if the client has a sendAudio method
      if (typeof this.anamClient.sendAudio === 'function') {
        await this.anamClient.sendAudio(audioBlob);
        logger.info('✅ [Anam] Audio sent successfully');
      } else {
        logger.warn('⚠️ [Anam] sendAudio method not available on client');
        throw new Error('sendAudio method not available');
      }

    } catch (error) {
      logger.error('❌ [Anam] Failed to send audio', { error });
      throw error;
    }
  }

  /**
   * Stop streaming and cleanup
   */
  async stop(): Promise<void> {
    if (!this.isInitialized) {
      logger.info('ℹ️ [Anam] Client not initialized, nothing to stop');
      return;
    }

    try {
      logger.info('🛑 [Anam] Stopping avatar stream...');

      if (typeof this.anamClient.stopStreaming === 'function') {
        await this.anamClient.stopStreaming();
      } else if (typeof this.anamClient.disconnect === 'function') {
        await this.anamClient.disconnect();
      } else if (typeof this.anamClient.stop === 'function') {
        await this.anamClient.stop();
      }

      this.isInitialized = false;
      this.anamClient = null;

      logger.info('✅ [Anam] Avatar stream stopped');

    } catch (error) {
      logger.error('❌ [Anam] Failed to stop streaming', { error });
      throw error;
    }
  }

  /**
   * Check if client is initialized and ready
   */
  isReady(): boolean {
    return this.isInitialized && this.anamClient !== null;
  }

  addListener<K extends AnamEvent>(event: K, callback: EventCallbacks[K]): void {
    if (!this.anamClient || typeof this.anamClient.addListener !== 'function') {
      throw new Error('Anam client does not support event listeners');
    }

    this.anamClient.addListener(event, callback);
  }

  removeListener<K extends AnamEvent>(event: K, callback: EventCallbacks[K]): void {
    if (!this.anamClient || typeof this.anamClient.removeListener !== 'function') {
      return;
    }

    this.anamClient.removeListener(event, callback);
  }
}

// Export singleton instance
export const anamAvatarService = new AnamAvatarService();
