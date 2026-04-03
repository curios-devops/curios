// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";

/**
 * Supabase Edge Function: ElevenLabs TTS
 * Text-to-Speech usando ElevenLabs API (API key segura en servidor)
 */

// Get and sanitize API key (remove any whitespace, newlines, or invisible characters)
const rawApiKey = Deno.env.get('ELEVENLAB_API_KEY'); // Sin S
const ELEVENLABS_API_KEY = rawApiKey?.trim().replace(/[\r\n\s]+/g, '');
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

function createJsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function parseProviderError(errorText: string) {
  try {
    return JSON.parse(errorText);
  } catch {
    return null;
  }
}

// Debug: Log key info (safely)
console.log('[ElevenLabs] API Key Info:', {
  exists: !!rawApiKey,
  rawLength: rawApiKey?.length,
  sanitizedLength: ELEVENLABS_API_KEY?.length,
  hasNewlines: rawApiKey?.includes('\n'),
  hasCarriageReturns: rawApiKey?.includes('\r'),
  hasSpaces: rawApiKey?.includes(' '),
  firstChars: ELEVENLABS_API_KEY?.substring(0, 3),
  lastChars: ELEVENLABS_API_KEY?.substring(ELEVENLABS_API_KEY.length - 3),
});

Deno.serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    // Validate API key
    if (!ELEVENLABS_API_KEY) {
      console.error('[ElevenLabs] API key not configured');
      return createJsonResponse({ error: 'ElevenLabs API key not configured' }, 500, corsHeaders);
    }

    // Parse request
    const { text, voiceId = 'EXAVITQu4vr4xnSDxMaL' } = await req.json(); // Sarah - Mature, Reassuring, Confident

    if (!text) {
      return createJsonResponse({ error: 'Text is required' }, 400, corsHeaders);
    }

    console.log('[ElevenLabs] Generating TTS', {
      textLength: text.length,
      voiceId,
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
          model_id: 'eleven_multilingual_v2', // Modelo más confiable y compatible con free tier
          output_format: 'mp3_44100_128',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      const providerError = parseProviderError(errorText);
      const providerCode = providerError?.detail?.status ?? null;
      const providerMessage = providerError?.detail?.message ?? errorText;
      const isRestrictedFreeTier = response.status === 401 && providerCode === 'detected_unusual_activity';

      console.error('[ElevenLabs] API error', {
        status: response.status,
        providerCode,
        error: errorText,
      });

      return createJsonResponse(
        {
          error: isRestrictedFreeTier
            ? 'ElevenLabs account restricted for free-tier usage'
            : `ElevenLabs API error: ${response.status}`,
          provider: 'elevenlabs',
          providerStatus: response.status,
          providerCode,
          providerMessage,
          details: errorText,
        },
        isRestrictedFreeTier ? 503 : 502,
        corsHeaders,
      );
    }

    // Return audio as base64
    const audioBuffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(audioBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
    }
    const base64Audio = btoa(binary);

    console.log('[ElevenLabs] TTS generated successfully', {
      size: audioBuffer.byteLength,
      sizeKB: (audioBuffer.byteLength / 1024).toFixed(2),
    });

    return createJsonResponse({
      audio: base64Audio,
      size: audioBuffer.byteLength,
    }, 200, corsHeaders);
  } catch (error) {
    console.error('[ElevenLabs] Function error', { error });
    return createJsonResponse({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500, corsHeaders);
  }
});
