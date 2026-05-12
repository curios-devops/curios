/**
 * Veo Vertex AI Provider (via Supabase Edge Function)
 * Genera videos usando Google Vertex AI Veo 3.1 a través de Supabase
 */

import { supabase } from '../../../lib/supabase';
import { logger } from '../../../utils/logger';
import { VideoGenerationRequest, VideoGenerationResult } from '../types';

export interface VeoOperationStatus {
  operation: string;
  done: boolean;
  message?: string;
  videoUrl?: string;
  videoBase64?: string;
  mimeType?: string;
  error?: string;
}

export interface VeoSaveResult {
  storagePath: string;
  publicUrl: string;
}

export class VeoVertexProvider {
  private functionUrl: string;
  private static readonly MAX_INLINE_SAVE_BASE64_CHARS = 8_000_000;

  constructor() {
    // URL de la Supabase Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL not configured');
    }

    this.functionUrl = `${supabaseUrl}/functions/v1/veo-generate-video`;
  }

  /**
   * Genera un video con Veo 3.1
   */
  async generate(request: VideoGenerationRequest): Promise<{ operation: string }> {
    logger.debug('[VeoVertex] Generating video', {
      promptPreview: request.prompt.slice(0, 50),
      aspectRatio: request.aspectRatio || '16:9',
    });

    try {
      const { data, error } = await supabase.functions.invoke('veo-generate-video', {
        body: {
          action: 'generate',
          prompt: request.prompt,
          aspectRatio: request.aspectRatio || '16:9',
        },
      });

      if (error) {
        logger.error('[VeoVertex] Supabase function invoke error', { error });
        throw new Error(`Supabase function error: ${error.message}`);
      }

      if (!data) {
        logger.error('[VeoVertex] No data returned from function');
        throw new Error('No response data from video generation function');
      }

      if (!data.success) {
        logger.error('[VeoVertex] Video generation failed', { error: data.error });

        // Check for common errors and provide helpful messages
        if (data.error?.includes('Service Account credentials not configured')) {
          throw new Error('Vertex AI credentials not configured. Please set up VERTEX_AI_SERVICE_ACCOUNT_EMAIL and VERTEX_AI_PRIVATE_KEY in Supabase secrets.');
        }

        if (data.error?.includes('Failed to get access token')) {
          throw new Error('Failed to authenticate with Google Cloud. Please check your Vertex AI credentials.');
        }

        throw new Error(`Video generation failed: ${data.error || 'Unknown error'}`);
      }

      logger.info('[VeoVertex] Video generation started', { operation: data.operation });

      return {
        operation: data.operation,
      };
    } catch (error) {
      logger.error('[VeoVertex] Generation failed', { error });

      // Log additional debugging info
      if (error instanceof Error) {
        logger.debug('[VeoVertex] Error details', {
          message: error.message,
          stack: error.stack,
        });
      }

      throw new Error(
        `Veo generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Consulta el status de una operación
   * NOTA: El polling de Veo tiene limitaciones conocidas.
   * Para producción, implementar webhook o consultar en Google Cloud Console.
   */
  async checkStatus(operationName: string): Promise<VeoOperationStatus> {
    logger.debug('[VeoVertex] Checking operation status', { operation: operationName });

    try {
      const { data, error } = await supabase.functions.invoke('veo-generate-video', {
        body: {
          action: 'check',
          operationName,
        },
      });

      if (error) {
        throw new Error(`Supabase function error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(`Status check failed: ${data.error}`);
      }

      return {
        operation: operationName,
        done: data.done || false,
        message: data.message,
        videoUrl: data.videoUrl,
        videoBase64: data.videoBase64,
        mimeType: data.mimeType,
        error: data.error,
      };
    } catch (error) {
      logger.error('[VeoVertex] Status check failed', { error, operation: operationName });
      throw new Error(
        `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async saveVideo(params: {
    userId: string;
    gcsUri?: string;
    videoBase64?: string;
    mimeType?: string;
    operationName?: string;
  }): Promise<VeoSaveResult> {
    const { userId, gcsUri, videoBase64, mimeType, operationName } = params;

    const attemptSave = async (payload: {
      gcsUri?: string;
      videoBase64?: string;
      mimeType?: string;
      operationName?: string;
    }): Promise<VeoSaveResult> => {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Video save timeout (60s) - edge function may have crashed')), 60000);
      });

      const savePromise = supabase.functions.invoke('veo-generate-video', {
        body: {
          action: 'save',
          userId,
          ...payload,
        },
      });

      const { data, error } = await Promise.race([savePromise, timeoutPromise]);

      if (error) {
        const errorWithContext = error as { message: string; context?: unknown };
        if (errorWithContext.context instanceof Response) {
          const status = errorWithContext.context.status;

          // Handle specific error codes
          if (status === 546 || status === 500) {
            throw new Error(
              `Edge function failed (${status}) - likely timeout or memory issue. Video may be too large. Try again or wait for processing to complete.`
            );
          }

          let bodyText = '';
          try {
            bodyText = await errorWithContext.context.clone().text();
          } catch {
            bodyText = '';
          }

          throw new Error(
            `Supabase function error (${status}): ${errorWithContext.message}${bodyText ? ` | ${bodyText.slice(0, 240)}` : ''}`
          );
        }

        throw new Error(`Supabase function error: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(`Video save failed: ${data?.error || 'Unknown save error'}`);
      }

      if (data.pending) {
        throw new Error('VIDEO_SAVE_PENDING');
      }

      return {
        storagePath: data.storagePath,
        publicUrl: data.publicUrl,
      };
    };

    const isRetryableSaveError = (error: unknown): boolean => {
      const message = error instanceof Error ? error.message : String(error);
      return (
        message.includes('VIDEO_SAVE_PENDING') ||
        message.includes('Edge function failed (546)') ||
        message.includes('Edge function failed (500)') ||
        message.includes('timeout')
      );
    };

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const attemptWithRetry = async (
      payload: {
        gcsUri?: string;
        videoBase64?: string;
        mimeType?: string;
        operationName?: string;
      },
      options: { maxAttempts?: number; delayMs?: number } = {}
    ): Promise<VeoSaveResult> => {
      const maxAttempts = options.maxAttempts ?? 4;
      const delayMs = options.delayMs ?? 3000;

      let lastError: unknown;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await attemptSave(payload);
        } catch (error) {
          lastError = error;

          if (!isRetryableSaveError(error) || attempt === maxAttempts) {
            throw error;
          }

          logger.warn('[VeoVertex] Save attempt failed, retrying', {
            attempt,
            maxAttempts,
            error: error instanceof Error ? error.message : String(error),
            hasOperationName: !!payload.operationName,
          });

          await wait(delayMs);
        }
      }

      throw lastError instanceof Error ? lastError : new Error(String(lastError));
    };

    const canUseInlineBase64 =
      !!videoBase64 && videoBase64.length <= VeoVertexProvider.MAX_INLINE_SAVE_BASE64_CHARS;

    if (gcsUri) {
      try {
        return await attemptWithRetry({ gcsUri, mimeType });
      } catch (primaryError) {
        if (operationName) {
          try {
            return await attemptWithRetry({ operationName });
          } catch {
            // continue to other fallbacks
          }
        }

        if (!canUseInlineBase64) {
          throw primaryError;
        }
      }
    }

    if (canUseInlineBase64 && videoBase64 && !operationName) {
      return attemptWithRetry({ videoBase64, mimeType });
    }

    if (operationName) {
      return attemptWithRetry({ operationName });
    }

    if (videoBase64 && !canUseInlineBase64) {
      throw new Error('Inline video payload is too large to save automatically');
    }

    throw new Error('No video payload available to save');
  }

  /**
   * Genera un video y espera (polling básico)
   * ADVERTENCIA: Veo tarda 2-5 minutos. No usar en producción sin optimizaciones.
   */
  async generateAndWait(
    request: VideoGenerationRequest,
    options: {
      pollInterval?: number; // ms entre checks (default: 30s)
      maxAttempts?: number; // max intentos (default: 20 = 10 minutos)
      onProgress?: (message: string) => void;
    } = {}
  ): Promise<VideoGenerationResult> {
    const { pollInterval = 30000, maxAttempts = 20, onProgress } = options;

    // Iniciar generación
    const { operation } = await this.generate(request);

    onProgress?.('Video generation started...');

    // Polling
    let attempts = 0;
    while (attempts < maxAttempts) {
      await this.sleep(pollInterval);

      const status = await this.checkStatus(operation);

      attempts++;
      onProgress?.(
        `Checking status... (attempt ${attempts}/${maxAttempts}): ${status.message || 'Processing...'}`
      );

      if (status.done) {
        if (status.videoUrl) {
          logger.info('[VeoVertex] Video ready', { operation, videoUrl: status.videoUrl });

          return {
            videoUrl: status.videoUrl,
            duration: request.duration || 5,
            width: this.getWidthFromAspectRatio(request.aspectRatio),
            height: this.getHeightFromAspectRatio(request.aspectRatio),
            generationId: operation,
          };
        } else if (status.error) {
          throw new Error(`Video generation failed: ${status.error}`);
        }
      }
    }

    throw new Error(
      `Video generation timeout (exceeded ${(maxAttempts * pollInterval) / 1000 / 60} minutes)`
    );
  }

  /**
   * Genera múltiples videos en paralelo (batched)
   */
  async generateBatch(
    requests: VideoGenerationRequest[],
    maxParallel: number = 2
  ): Promise<{ operation: string }[]> {
    logger.info('[VeoVertex] Generating batch', {
      count: requests.length,
      maxParallel,
    });

    const results: { operation: string }[] = [];

    for (let i = 0; i < requests.length; i += maxParallel) {
      const batch = requests.slice(i, i + maxParallel);
      logger.debug('[VeoVertex] Processing batch', {
        batchIndex: Math.floor(i / maxParallel) + 1,
        totalBatches: Math.ceil(requests.length / maxParallel),
        batchSize: batch.length,
      });

      const batchResults = await Promise.all(batch.map((req) => this.generate(req)));

      results.push(...batchResults);
    }

    logger.info('[VeoVertex] Batch started', { operationCount: results.length });
    return results;
  }

  /**
   * Health check de la función de Supabase
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Hacer un request simple para verificar que la función responde
      const response = await fetch(this.functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({ action: 'check', operationName: 'health-check' }),
      });

      return response.ok || response.status === 500; // 500 es OK (función existe pero falla por input inválido)
    } catch (error) {
      logger.warn('[VeoVertex] Health check failed', { error });
      return false;
    }
  }

  private getWidthFromAspectRatio(aspectRatio?: string): number {
    switch (aspectRatio) {
      case '9:16':
        return 1080;
      case '16:9':
        return 1920;
      case '1:1':
        return 1080;
      default:
        return 1920;
    }
  }

  private getHeightFromAspectRatio(aspectRatio?: string): number {
    switch (aspectRatio) {
      case '9:16':
        return 1920;
      case '16:9':
        return 1080;
      case '1:1':
        return 1080;
      default:
        return 1080;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
