/**
 * ElevenLabs TTS Service
 * Text-to-Speech usando Netlify Function (API keys seguras en servidor)
 */

import { logger } from '../../../utils/logger';

export class ElevenLabsService {
  // En desarrollo: usar puerto 8888 (Netlify Dev)
  // En producción: usar URL relativa
  private netlifyFunctionUrl = import.meta.env.DEV 
    ? 'http://localhost:8888/.netlify/functions/elevenlabs-tts'
    : '/.netlify/functions/elevenlabs-tts';
  private defaultVoiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel
  
  async generateTTS(text: string): Promise<Blob | null> {
    try {
      logger.debug('[ElevenLabs] Generating TTS via Netlify Function', { 
        textLength: text.length,
        voiceId: this.defaultVoiceId 
      });

      const response = await fetch(this.netlifyFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId: this.defaultVoiceId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Netlify function error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      if (!data.audio) throw new Error('No audio data received');

      const audioBlob = this.base64ToBlob(data.audio, 'audio/mpeg');
      
      logger.info('[ElevenLabs] TTS generated via Netlify', { 
        size: audioBlob.size,
        sizeKB: (audioBlob.size / 1024).toFixed(2)
      });

      return audioBlob;
    } catch (error) {
      logger.error('[ElevenLabs] TTS generation failed', { error });
      return null;
    }
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  isConfigured(): boolean {
    return true; // Netlify function siempre disponible
  }
}
