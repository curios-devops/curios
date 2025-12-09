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

    // Enhanced bot detection - LinkedIn, Twitter, Facebook, WhatsApp crawlers
    const userAgent = req.headers.get('user-agent') || '';
    const acceptHeader = req.headers.get('accept') || '';
    
    // More comprehensive bot detection
    // If user agent contains bot/crawler keywords OR doesn't look like a browser, treat as bot
    const isBot = /linkedinbot|linkedin|facebookexternalhit|facebookbot|twitterbot|twitter|whatsapp|whatsappbot|slackbot|telegrambot|bot|crawler|spider|LinkedInBot|Facebot|postman|insomnia|curl|wget/i.test(userAgent) ||
                  userAgent === '' || // Empty user agent (some crawlers)
                  !acceptHeader.includes('text/html'); // Doesn't accept HTML (likely a crawler)

    console.log('🔍 Share Function Debug:');
    console.log('- Bot detected:', isBot);
    console.log('- User Agent:', userAgent.substring(0, 100));
    console.log('- Accept Header:', acceptHeader);
    console.log('- Query:', query);
    console.log('- Snippet length:', snippet.length);
    console.log('- Image provided:', !!image);

    // For human users with real browsers, redirect to actual search results
    // Bots and tools get the HTML with meta tags for previews
    if (!isBot && userAgent.includes('Mozilla') && acceptHeader.includes('text/html')) {
      console.log('- Redirecting human browser to search page');
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `https://curiosai.com/search?q=${encodeURIComponent(query)}`,
          'Cache-Control': 'no-cache'
        }
      });
    }
    
    console.log('- Serving HTML with meta tags to bot/crawler');

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

    // Use curiosai.com for all URLs (LinkedIn trusts this domain)
    const baseUrl = 'https://curiosai.com';

    // LinkedIn requires PNG/JPG images with exact 1200x627 dimensions (1.91:1 ratio)
    // Use proper fallback image that meets LinkedIn specifications
    let ogImage = 'https://curiosai.com/curiosai-og-image-1200x627.png';
    let imageWidth = '1200';
    let imageHeight = '627';
    
    if (image && image.startsWith('http')) {
      // Use provided image from search results
      ogImage = image;
      // Assume user images also meet LinkedIn specs
      // (In production, you'd want to fetch actual dimensions or resize)
      imageWidth = '1200';
      imageHeight = '627';
    }

    // Generate share URL (canonical for crawlers) - use curiosai.com domain
    const shareUrl = `${baseUrl}/functions/v1/social-share?query=${encodeURIComponent(q)}&snippet=${encodeURIComponent(s)}${image ? `&image=${encodeURIComponent(image)}` : ''}`;

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
  <meta name="image" property="og:image" content="${ogImage}" />

  <!-- Open Graph Meta Tags -->
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:secure_url" content="${ogImage}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:alt" content="CuriosAI preview image for: ${safeTitle}" />
  <meta property="og:image:width" content="${imageWidth}" />
  <meta property="og:image:height" content="${imageHeight}" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="CuriosAI" />

  <!-- Twitter Card - Twitter-specific tags (isolated from Open Graph for LinkedIn) -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@CuriosAI" />
  <meta name="twitter:creator" content="@CuriosAI" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${ogImage}" />
  <meta name="twitter:image:alt" content="CuriosAI Search: ${safeTitle}" />

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
