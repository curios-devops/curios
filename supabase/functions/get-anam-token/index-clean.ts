// Supabase Edge Function: Get Anam Token
// Genera un token temporal para que el frontend se conecte a Anam
// IMPORTANTE: El API key de Anam NUNCA se expone al frontend

const rawApiKey = Deno.env.get('ANAM_API_KEY');
const ANAM_API_KEY = rawApiKey?.trim().replace(/[\r\n\s]+/g, '');
const ANAM_API_URL = 'https://api.anam.ai/v1';

function createJsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

  try {
    if (!ANAM_API_KEY) {
      console.error('[Anam Token] API key not configured');
      return createJsonResponse({ error: 'Anam API key not configured' }, 500, corsHeaders);
    }

    const { personaId, expiresIn = 3600 } = await req.json().catch(() => ({}));

    console.log('[Anam Token] Generating token', {
      personaId: personaId || 'default',
      expiresIn,
    });

    const response = await fetch(`${ANAM_API_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        persona_id: personaId,
        stream_video: true,
        stream_audio: true,
        metadata: {
          source: 'curiosai-avatar-search',
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Anam Token] Anam API error', {
        status: response.status,
        error: errorText,
      });

      return createJsonResponse(
        {
          error: `Failed to create Anam session: ${response.status}`,
          details: errorText,
        },
        502,
        corsHeaders,
      );
    }

    const data = await response.json();

    console.log('[Anam Token] Token generated successfully', {
      sessionId: data.session_id || data.id,
      hasToken: !!data.token,
    });

    return createJsonResponse({
      sessionId: data.session_id || data.id,
      token: data.token || data.session_id,
      wsUrl: `wss://api.anam.ai/v1/streaming`,
      expiresAt: data.expires_at || new Date(Date.now() + expiresIn * 1000).toISOString(),
    }, 200, corsHeaders);

  } catch (error) {
    console.error('[Anam Token] Function error', { error });
    return createJsonResponse({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500, corsHeaders);
  }
});
