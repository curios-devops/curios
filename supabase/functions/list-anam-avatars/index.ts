const rawApiKey = Deno.env.get('ANAM_API_KEY');
const ANAM_API_KEY = rawApiKey?.trim().replace(/[\r\n\s]+/g, '');
const ANAM_AVATARS_URL = 'https://api.anam.ai/v1/avatars';

interface AnamAvatarRecord {
  id: string;
  displayName?: string;
  name?: string;
  gender?: string;
  variantName?: string;
  imageUrl?: string;
}

function inferGenderFromName(name: string): 'male' | 'female' | 'unspecified' {
  const normalized = name.trim().toLowerCase();
  const femaleNames = new Set(['mia', 'liv', 'anne', 'bella', 'emma', 'olivia', 'ava', 'sophia', 'isabella']);
  const maleNames = new Set(['gabriel', 'liam', 'noah', 'jack', 'lucas', 'ethan', 'mason']);

  if (femaleNames.has(normalized)) {
    return 'female';
  }

  if (maleNames.has(normalized)) {
    return 'male';
  }

  return 'unspecified';
}

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return createJsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  try {
    if (!ANAM_API_KEY) {
      return createJsonResponse({ error: 'Anam API key not configured' }, 500, corsHeaders);
    }

    const url = new URL(ANAM_AVATARS_URL);
    url.searchParams.set('page', '1');
    url.searchParams.set('perPage', '5');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ANAM_API_KEY}`,
      },
    });

    if (!response.ok) {
      const details = await response.text();
      return createJsonResponse({ error: `Anam API error: ${response.status}`, details }, 502, corsHeaders);
    }

    const data = await response.json();
    const avatars = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

    const simplified = avatars
      .slice(0, 5)
      .map((avatar: AnamAvatarRecord) => {
        const name = avatar.displayName || avatar.name || 'Avatar';
        const inferredGender = typeof avatar.gender === 'string'
          ? avatar.gender.toLowerCase()
          : inferGenderFromName(name);
        const variant = avatar.variantName || 'default';
        const genderLabel = inferredGender === 'unspecified'
          ? 'Unspecified'
          : inferredGender === 'male'
            ? 'Male'
            : 'Female';

        return {
          id: avatar.id,
          name,
          gender: inferredGender,
          description: `${genderLabel} avatar · ${variant} style`,
          imageUrl: avatar.imageUrl || undefined,
        };
      });

    return createJsonResponse({ avatars: simplified }, 200, corsHeaders);
  } catch (error) {
    return createJsonResponse(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
      corsHeaders,
    );
  }
});
