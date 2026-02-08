/**
 * Netlify Function: OpenAI TTS Proxy
 * Proxy seguro para llamadas a OpenAI TTS API
 */

import { Handler } from '@netlify/functions';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
    if (!OPENAI_API_KEY) {
      console.error('[OpenAI TTS] API key not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured' }),
      };
    }

    // Parse request
    const { text, voice = 'alloy' } = JSON.parse(event.body || '{}');

    if (!text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Text is required' }),
      };
    }

    console.log('[OpenAI TTS] Generating TTS', { 
      textLength: text.length,
      voice 
    });

    // Call OpenAI TTS API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OpenAI TTS] API error', { 
        status: response.status, 
        error: errorText 
      });
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          error: `OpenAI TTS error: ${response.status}`,
          details: errorText 
        }),
      };
    }

    // Return audio as base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    console.log('[OpenAI TTS] TTS generated successfully', { 
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
    console.error('[OpenAI TTS] Function error', { error });
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
