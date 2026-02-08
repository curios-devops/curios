/**
 * Netlify Function: ElevenLabs TTS Proxy
 * Proxy seguro para llamadas a ElevenLabs API
 */

import { Handler } from '@netlify/functions';

const ELEVENLABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Validar API key
    if (!ELEVENLABS_API_KEY) {
      console.error('[ElevenLabs] API key not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'ElevenLabs API key not configured' }),
      };
    }

    // Parse request
    const { text, voiceId = '21m00Tcm4TlvDq8ikWAM' } = JSON.parse(event.body || '{}');

    if (!text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Text is required' }),
      };
    }

    console.log('[ElevenLabs] Generating TTS', { 
      textLength: text.length,
      voiceId 
    });

    // Call ElevenLabs API
    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ElevenLabs] API error', { 
        status: response.status, 
        error: errorText 
      });
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `ElevenLabs API error: ${response.status}`,
          details: errorText 
        }),
      };
    }

    // Return audio as base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    console.log('[ElevenLabs] TTS generated successfully', { 
      size: audioBuffer.byteLength,
      sizeKB: (audioBuffer.byteLength / 1024).toFixed(2)
    });

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: base64Audio,
        size: audioBuffer.byteLength,
      }),
    };

  } catch (error) {
    console.error('[ElevenLabs] Function error', { error });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
