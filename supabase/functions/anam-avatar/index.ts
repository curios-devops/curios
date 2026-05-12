/**
 * Supabase Edge Function: Anam Avatar
 * Generates video avatar using Anam API with audio input
 *
 * Workflow:
 * 1. Receive audio (as base64 or URL)
 * 2. Send to Anam API to generate avatar video
 * 3. Return video URL or streaming video data
 */

// Get and sanitize API key
const rawApiKey = Deno.env.get('ANAM_API_KEY');
const ANAM_API_KEY = rawApiKey?.trim().replace(/[\r\n\s]+/g, '');
const ANAM_BASE_URL = 'https://api.anam.ai/v1';

function createJsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Debug: Log key info (safely)
console.log('[Anam] API Key Info:', {
  exists: !!rawApiKey,
  rawLength: rawApiKey?.length,
  sanitizedLength: ANAM_API_KEY?.length,
  firstChars: ANAM_API_KEY?.substring(0, 8),
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
    if (!ANAM_API_KEY) {
      console.error('[Anam] API key not configured');
      return createJsonResponse({ error: 'Anam API key not configured' }, 500, corsHeaders);
    }

    // Parse request - expecting audio as base64
    const { audioBase64, audioUrl, personaId } = await req.json();

    if (!audioBase64 && !audioUrl) {
      return createJsonResponse({ error: 'Audio data (base64 or URL) is required' }, 400, corsHeaders);
    }

    console.log('[Anam] Generating avatar video', {
      hasAudioBase64: !!audioBase64,
      hasAudioUrl: !!audioUrl,
      audioBase64Length: audioBase64?.length,
      personaId: personaId || 'default',
    });

    // Prepare audio data
    let audioData: string;
    if (audioBase64) {
      audioData = audioBase64;
    } else {
      // Fetch audio from URL and convert to base64
      console.log('[Anam] Fetching audio from URL:', audioUrl);
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio from URL: ${audioResponse.status}`);
      }
      const audioBuffer = await audioResponse.arrayBuffer();
      const uint8 = new Uint8Array(audioBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8.length; i += chunkSize) {
        binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
      }
      audioData = btoa(binary);
    }

    console.log('[Anam] Audio data prepared, size:', audioData.length);

    // Call Anam API to generate avatar video
    // Based on Anam API documentation: https://docs.anam.ai/api-reference
    const anamResponse = await fetch(
      `${ANAM_BASE_URL}/avatars/generate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ANAM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: audioData,
          persona_id: personaId || undefined, // Use default persona if not specified
          format: 'mp4',
          resolution: '512x512', // Square format for avatar display
        }),
      }
    );

    if (!anamResponse.ok) {
      const errorText = await anamResponse.text();
      console.error('[Anam] API error', {
        status: anamResponse.status,
        error: errorText,
      });

      return createJsonResponse(
        {
          error: `Anam API error: ${anamResponse.status}`,
          provider: 'anam',
          providerStatus: anamResponse.status,
          details: errorText,
        },
        502,
        corsHeaders,
      );
    }

    // Parse Anam response
    const anamData = await anamResponse.json();

    console.log('[Anam] Avatar video generated successfully', {
      videoUrl: anamData.video_url || 'embedded',
      hasVideo: !!anamData.video,
    });

    // Return video URL or embedded video data
    return createJsonResponse({
      videoUrl: anamData.video_url || null,
      video: anamData.video || null, // Base64 video if returned
      duration: anamData.duration || null,
    }, 200, corsHeaders);

  } catch (error) {
    console.error('[Anam] Function error', { error });
    return createJsonResponse({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500, corsHeaders);
  }
});
