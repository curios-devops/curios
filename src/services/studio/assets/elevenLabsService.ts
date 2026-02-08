/**
 * ElevenLabs TTS Service
 * Text-to-Speech usando ElevenLabs API
 */

import { logger } from '../../../utils/logger';

export class ElevenLabsService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  
  // Voice IDs de ElevenLabs (Rachel - clara y natural)
  private defaultVoiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel
  
  constructor() {
    this.apiKey = import.meta.env.ELEVEN_LABS_API_KEY || '';
    
    if (!this.apiKey) {
      logger.warn('[ElevenLabs] API key not configured');
    }
  }

  /**
   * Generar audio TTS
   */
  async generateTTS(text: string): Promise<Blob | null> {
    if (!this.apiKey) {
      logger.warn('[ElevenLabs] API key missing, cannot generate TTS');
      return null;
    }

    try {
      logger.debug('[ElevenLabs] Generating TTS', { 
        textLength: text.length,
        voiceId: this.defaultVoiceId 
      });

      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${this.defaultVoiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      const audioBlob = await response.blob();
      
      logger.info('[ElevenLabs] TTS generated successfully', { 
        size: audioBlob.size,
        sizeKB: (audioBlob.size / 1024).toFixed(2)
      });

      return audioBlob;

    } catch (error) {
      logger.error('[ElevenLabs] TTS generation failed', { error });
      return null;
    }
  }

  /**
   * Verificar si el servicio está configurado
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
