// Netlify Edge Function proxy for Supabase social-share
// Forces correct Content-Type header for LinkedIn compatibility

export default async (request) => {
  const url = new URL(request.url);
  
  // Forward to Supabase function
  const supabaseUrl = `https://gpfccicfqynahflehpqo.supabase.co/functions/v1/social-share${url.search}`;
  
  const response = await fetch(supabaseUrl, {
    method: request.method,
    headers: request.headers,
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
