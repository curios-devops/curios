// Netlify Edge Function proxy for Supabase social-share
// Forces correct Content-Type header for LinkedIn compatibility

export default async (request) => {
  const url = new URL(request.url);
  
  // Forward to the canonical Netlify function instead of Supabase (Supabase social-share is deprecated).
  const netlifyFnUrl = `https://curiosai.com/.netlify/functions/social-share${url.search}`;

  const response = await fetch(netlifyFnUrl, {
    method: request.method,
    // forward a reduced set of headers to avoid leaking internal headers
    headers: {
      'User-Agent': request.headers.get('user-agent') || '',
      'Accept': request.headers.get('accept') || '*/*'
    },
  });

  // Get the HTML body
  const html = await response.text();

  // Return with forced Content-Type
  return new Response(html, {
    status: response.status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
};

export const config = {
  path: "/functions/v1/social-share",
};
