import "jsr:@supabase/functions-js/edge-runtime.d.ts"

/**
 * Supabase Edge Function: Google Videos Search via SerpAPI
 * Searches for videos based on text queries using the google_videos engine.
 * Mirrors google-images-search; keeps SERPAPI_API_KEY server-side.
 */

const SERPAPI_API_KEY = Deno.env.get('SERPAPI_API_KEY');

interface GoogleVideosResponse {
  video_results?: Array<{
    position: number;
    title: string;
    link: string;
    displayed_link?: string;
    thumbnail?: string;
    duration?: string;
    platform?: string;
    source?: string;
  }>;
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
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    if (!SERPAPI_API_KEY) {
      console.error('[Serp Videos Search] SERPAPI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, videos: [], error: 'SerpAPI not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query, count = 10, hl = 'en', gl = 'us' } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serpApiUrl = new URL('https://serpapi.com/search');
    serpApiUrl.searchParams.set('engine', 'google_videos');
    serpApiUrl.searchParams.set('q', query);
    serpApiUrl.searchParams.set('hl', hl);
    serpApiUrl.searchParams.set('gl', gl);
    serpApiUrl.searchParams.set('api_key', SERPAPI_API_KEY);

    console.log('[Serp Videos Search] Searching:', { query, count, hl, gl });

    const response = await fetch(serpApiUrl.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Serp Videos Search] Request failed:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, videos: [], query, error: `SerpAPI error: ${response.status}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: GoogleVideosResponse = await response.json();
    const results = data.video_results || [];

    const videos = [];
    for (let i = 0; i < Math.min(results.length, count); i++) {
      const result = results[i];
      videos.push({
        url: result.link,
        title: result.title,
        thumbnail: result.thumbnail || '',
        duration: result.duration || '',
        source: result.platform || result.source || result.displayed_link || '',
      });
    }

    console.log('[Serp Videos Search] Returning:', {
      query,
      videos_returned: videos.length,
      videos_available: results.length,
    });

    return new Response(
      JSON.stringify({ success: true, query, videos, total_available: results.length, returned: videos.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Serp Videos Search] Error:', error);
    return new Response(
      JSON.stringify({ success: false, videos: [], error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
