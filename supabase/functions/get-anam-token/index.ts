// Supabase Edge Function: Get Anam Session Token
// Creates a session token for Anam AI SDK frontend usage

const rawApiKey = Deno.env.get('ANAM_API_KEY');
const ANAM_API_KEY = rawApiKey?.trim().replace(/[\r\n\s]+/g, '');
const ANAM_AUTH_URL = 'https://api.anam.ai/v1/auth/session-token';
const ANAM_DEFAULT_LLM_ID = '0934d97d-0c3a-4f33-91b0-5e136a0ef466';

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

    console.log('[Anam Token] Creating session token...');

    let requestedAvatarId: string | undefined;
    try {
      const body = await req.json();
      if (typeof body?.avatarId === 'string' && body.avatarId.trim()) {
        requestedAvatarId = body.avatarId.trim();
      }
    } catch {
      requestedAvatarId = undefined;
    }

    const avatarId = requestedAvatarId ?? '071b0286-4cce-4808-bee2-e642f1062de3';

    // Create session token via Anam API
    const response = await fetch(ANAM_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANAM_API_KEY}`,
      },
      body: JSON.stringify({
        personaConfig: {
          name: 'CuriosAI Assistant',
          avatarId,
          voiceId: '6bfbe25a-979d-40f3-a92b-5394170af54b',
          llmId: ANAM_DEFAULT_LLM_ID,
          systemPrompt: "[STYLE] Reply in natural speech without formatting. Add pauses using '...' and very occasionally a disfluency. [PERSONALITY] You are a helpful assistant that provides search results and answers.",
          firstMessage: '', // No greeting, stay silent until user provides input
          enableGreeting: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Anam Token] API error', {
        status: response.status,
        error: errorText,
      });
      return createJsonResponse({
        error: `Anam API error: ${response.status}`,
        details: errorText,
      }, 502, corsHeaders);
    }

    const data = await response.json();

    console.log('[Anam Token] Session token created successfully');

    return createJsonResponse({
      sessionToken: data.sessionToken,
    }, 200, corsHeaders);

  } catch (error) {
    console.error('[Anam Token] Function error', { error });
    return createJsonResponse({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, 500, corsHeaders);
  }
});
