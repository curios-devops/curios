import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('query') || 'CuriosAI - AI-Powered Search';
    const snippet = url.searchParams.get('snippet') || 'Get comprehensive AI-powered search results with insights, analysis, and curated information from multiple sources.';
    const image = url.searchParams.get('image') || '';

    // Simple bot detection
    const userAgent = req.headers.get('user-agent') || '';
    const isBot = /linkedinbot|facebookexternalhit|twitterbot|whatsapp|bot|crawler|spider|LinkedInBot/i.test(userAgent);

    console.log('🔍 Share Function Debug:');
    console.log('- Bot detected:', isBot);
    console.log('- User Agent:', userAgent);
    console.log('- Query:', query);
    console.log('- Snippet length:', snippet.length);
    console.log('- Snippet preview:', snippet.substring(0, 140) + (snippet.length > 140 ? '…' : ''));

    // Redirect humans to search page
    if (!isBot) {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `https://curiosai.com/search?q=${encodeURIComponent(query)}`,
          'Cache-Control': 'no-cache'
        }
      });
    }

    // Simple HTML sanitization
    const escapeHtml = (text: string) =>
      (text || '').replace(/[<>&"']/g, (c) => ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#39;'
      }[c] || c));

    // Build safe title (prefer concise)
    const rawTitle = (query || '').trim();
    let safeTitle = escapeHtml(rawTitle.slice(0, 100));
    if (rawTitle.length > 100) safeTitle += '…';

    // Build a LinkedIn-friendly description prioritizing the snippet (distinct from title)
    const targetMax = 200; // LinkedIn truncates around this length
    const minIdeal = 70;
    const q = (query || '').trim();
    const s = (snippet || '').trim();

    // Prefer the first sentence of the snippet if available
    const firstSentence = s.split(/[.!?]+/).map(t => t.trim()).filter(Boolean)[0] || '';
    let desc = firstSentence || s;
    if (desc.length > targetMax) desc = desc.slice(0, 197) + '…';
    if (!desc) {
      // Fallback: use query and a short tagline when no snippet
      desc = q.slice(0, Math.min(120, q.length));
      if (q.length > desc.length) desc += '…';
      const tagline = ' — Discover insights with CuriosAI';
      if (desc.length < minIdeal && desc.length + tagline.length <= targetMax) {
        desc += tagline;
      }
    } else if (desc.length < minIdeal) {
      // Lightly enhance too-short snippets
      const add = ' Discover insights with CuriosAI';
      if (desc.length + add.length <= targetMax) desc += add;
    }

    const safeDescription = escapeHtml(desc);

    // Build absolute base URL from the incoming request
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'curiosai.com';
    const base = `${proto}://${host}`;

    // Use provided image or generate dynamic SVG image with Supabase Edge Function
    const ogImage = image || `${base}/functions/v1/social-og-image?query=${encodeURIComponent(q)}&snippet=${encodeURIComponent(s.slice(0, 100))}`;

    // Generate share URL (canonical for crawlers)
    const shareUrl = `${base}/functions/v1/social-share?query=${encodeURIComponent(q)}&snippet=${encodeURIComponent(s)}${image ? `&image=${encodeURIComponent(image)}` : ''}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>

  <!-- Primary Meta -->
  <meta name="description" content="${safeDescription}" />
  <!-- Combined name+property tags as per LinkedIn Inspector guidance -->
  <meta name="title" property="og:title" content="${safeTitle}" />
  <meta name="description" property="og:description" content="${safeDescription}" />

  <!-- Open Graph Meta Tags -->
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:alt" content="CuriosAI preview image for: ${safeTitle}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="627" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="CuriosAI" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${ogImage}" />

  <link rel="canonical" href="${shareUrl}" />
</head>
<body>
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
    <h1 style="color: #0095FF; margin-bottom: 20px;">CuriosAI</h1>
    <h2 style="color: #333; margin-bottom: 16px;">${safeTitle}</h2>
    <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">${safeDescription}</p>
    <a href="https://curiosai.com/search?q=${encodeURIComponent(q)}" style="background: #0095FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500;">Explore More with CuriosAI</a>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Share function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
