// @ts-ignore - Deno import
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get query parameters
    const url = new URL(req.url);
    const query = url.searchParams.get('query');
    const snippet = url.searchParams.get('snippet');
    const imageUrl = url.searchParams.get('image'); // Optional: use provided image
    
    // If a valid image URL is provided, redirect to it (Twitter prefers real images)
    if (imageUrl && imageUrl.startsWith('http')) {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': imageUrl,
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    
    if (!query) {
      // Fallback to static brand image
      return new Response(null, {
        status: 302,
        headers: {
          'Location': 'https://curiosai.com/curiosai-og-image-1200x627.png',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    
    // Process snippet for display - create teaser
    let displaySnippet = '';
    if (snippet) {
      const sentences = snippet.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length >= 1) {
        const teaser = sentences[0].trim();
        displaySnippet = teaser.length > 90 ? teaser.substring(0, 87) + '...' : teaser + '...';
      } else {
        displaySnippet = snippet.slice(0, 90) + (snippet.length > 90 ? '...' : '');
      }
    }
    
    // Escape HTML entities for SVG
    const escapeHtml = (text: string) => 
      text.replace(/[<>&"']/g, (c) => ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#39;'
      }[c] || c));
    
    const safeQuery = escapeHtml(query.slice(0, 55));
    const safeSnippet = escapeHtml(displaySnippet);
    
    // Generate SVG - Twitter CAN display SVG if properly formatted
    // The key is proper Content-Type and no external dependencies
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="627" viewBox="0 0 1200 627" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0095FF" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#0095FF" stop-opacity="0.05"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0095FF"/>
      <stop offset="100%" stop-color="#0080FF"/>
    </linearGradient>
  </defs>
  
  <rect width="1200" height="627" fill="white"/>
  <rect width="1200" height="627" fill="url(#bg)"/>
  <rect width="1200" height="6" fill="url(#accent)"/>
  
  <circle cx="120" cy="120" r="35" fill="#0095FF" fill-opacity="0.1"/>
  <text x="120" y="135" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="bold" fill="#0095FF">C</text>
  
  <text x="180" y="105" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="bold" fill="#0095FF">CuriosAI</text>
  <text x="180" y="135" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#666666">AI-Powered Search</text>
  
  <text x="100" y="280" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="bold" fill="#1a1a1a">${safeQuery}</text>
  
  ${safeSnippet ? `<text x="100" y="350" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#666666">${safeSnippet}</text>` : ''}
  
  <rect x="100" y="480" width="80" height="4" fill="url(#accent)" rx="2"/>
  <text x="100" y="530" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#999999">Discover insights with AI</text>
  
  <circle cx="1050" cy="150" r="60" fill="#0095FF" fill-opacity="0.03"/>
  <circle cx="1100" cy="500" r="40" fill="#0095FF" fill-opacity="0.03"/>
</svg>`;

    // Return SVG with proper headers
    // Note: If Twitter still doesn't render this, the fallback is the static PNG
    return new Response(svg, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      }
    });
  } catch (error) {
    console.error('Twitter OG image generation error:', error);
    // Fallback to static image on any error
    return new Response(null, {
      status: 302,
      headers: {
        'Location': 'https://curiosai.com/curiosai-og-image-1200x627.png',
        'Cache-Control': 'no-cache'
      }
    });
  }
});
