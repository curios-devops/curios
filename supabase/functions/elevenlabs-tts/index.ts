// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

/**
 * Supabase Edge Function: ElevenLabs TTS
 * Text-to-Speech usando ElevenLabs API (API key segura en servidor)
 */

const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLAB_API_KEY'); // Sin S
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

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
      return new Response(
        JSON.stringify({ error: 'ElevenLabs API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { text, voiceId = '21m00Tcm4TlvDq8ikWAM' } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      console.error('[ElevenLabs] API error', {
        status: response.status,
        error: errorText,
      });
      return new Response(
        JSON.stringify({
          error: `ElevenLabs API error: ${response.status}`,
          details: errorText,
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return audio as base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    console.log('[ElevenLabs] TTS generated successfully', {
      size: audioBuffer.byteLength,
      sizeKB: (audioBuffer.byteLength / 1024).toFixed(2),
    });

    return new Response(
      JSON.stringify({
        audio: base64Audio,
        size: audioBuffer.byteLength,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[ElevenLabs] Function error', { error });
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
