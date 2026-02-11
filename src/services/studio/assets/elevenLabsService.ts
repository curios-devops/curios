/**
 * ElevenLabs TTS Service
 * Text-to-Speech usando Supabase Edge Function (API keys seguras en servidor)
 */

import { logger } from '../../../utils/logger';

export class ElevenLabsService {
  // Usar Supabase Edge Function (sin límite de timeout)
  private supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  private supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  private functionUrl = `${this.supabaseUrl}/functions/v1/elevenlabs-tts`;
  private defaultVoiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel
  
  async generateTTS(text: string): Promise<Blob | null> {
    try {
      logger.debug('[ElevenLabs] Generando TTS via Supabase', { 
        textLength: text.length,
        voiceId: this.defaultVoiceId,
        functionUrl: this.functionUrl,
        hasAnonKey: !!this.supabaseAnonKey,
        anonKeyPrefix: this.supabaseAnonKey?.substring(0, 20)
      });

      const response = await fetch(this.functionUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
          'apikey': this.supabaseAnonKey
        },
        body: JSON.stringify({ text, voiceId: this.defaultVoiceId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Supabase function error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      if (!data.audio) throw new Error('No audio data received');

      const audioBlob = this.base64ToBlob(data.audio, 'audio/mpeg');
      
      logger.info('[ElevenLabs] TTS generado via Supabase', { 
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
    return true; // Supabase function siempre disponible
  }
}
