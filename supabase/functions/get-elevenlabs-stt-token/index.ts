import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const rawApiKey = Deno.env.get('ELEVENLAB_API_KEY');
const ELEVENLABS_API_KEY = rawApiKey?.trim().replace(/[\r\n\s]+/g, '');
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  if (!ELEVENLABS_API_KEY) {
    return jsonResponse({ error: 'ELEVENLAB_API_KEY not configured' }, 500, corsHeaders);
  }

  try {
    let tokenType = 'realtime_scribe';
    try {
      const body = await req.json();
      if (typeof body?.tokenType === 'string' && body.tokenType.trim()) {
        tokenType = body.tokenType.trim();
      }
    } catch {
      tokenType = 'realtime_scribe';
    }

    const tokenResponse = await fetch(`${ELEVENLABS_BASE_URL}/single-use-token/${encodeURIComponent(tokenType)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    const payload = await tokenResponse.json().catch(() => ({}));

    if (!tokenResponse.ok) {
      return jsonResponse(
        {
          error: `ElevenLabs token endpoint error: ${tokenResponse.status}`,
          details: payload,
        },
        502,
        corsHeaders,
      );
    }

    const token =
      (typeof payload?.token === 'string' && payload.token) ||
      (typeof payload?.single_use_token === 'string' && payload.single_use_token) ||
      (typeof payload?.auth_token === 'string' && payload.auth_token) ||
      '';

    if (!token) {
      return jsonResponse({ error: 'Token missing in ElevenLabs response', details: payload }, 502, corsHeaders);
    }

    return jsonResponse({ token, tokenType }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse(
      {
        error: 'Failed to generate ElevenLabs STT token',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
      corsHeaders,
    );
  }
});
