// @ts-ignore - Deno import
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Static fallback image URL
const FALLBACK_IMAGE = 'https://curiosai.com/curiosai-og-image-1200x627.png';

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('url');
    
    // If no image URL provided, redirect to fallback
    if (!imageUrl) {
      console.log('[TWITTER-IMAGE-PROXY] No URL provided, redirecting to fallback');
      return Response.redirect(FALLBACK_IMAGE, 302);
    }

    // Validate URL
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      console.log('[TWITTER-IMAGE-PROXY] Invalid URL scheme:', imageUrl);
      return Response.redirect(FALLBACK_IMAGE, 302);
    }

    // Skip SVG images - Twitter doesn't support them well
    if (imageUrl.toLowerCase().includes('.svg') || imageUrl.includes('image/svg')) {
      console.log('[TWITTER-IMAGE-PROXY] SVG detected, redirecting to fallback');
      return Response.redirect(FALLBACK_IMAGE, 302);
    }

    console.log('[TWITTER-IMAGE-PROXY] Fetching image:', imageUrl);

    // Fetch the image with timeout and proper headers
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    try {
      const response = await fetch(imageUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'CuriosAI-TwitterProxy/1.0 (+https://curiosai.com)',
          'Accept': 'image/jpeg, image/png, image/gif, image/webp, */*',
        },
        redirect: 'follow',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is OK
      if (!response.ok) {
        console.log('[TWITTER-IMAGE-PROXY] Upstream error:', response.status, imageUrl);
        return Response.redirect(FALLBACK_IMAGE, 302);
      }

      // Get content type and validate it's an image
      const contentType = response.headers.get('content-type') || '';
      const isImage = /image\/(jpeg|jpg|png|gif|webp)/i.test(contentType);
      
      if (!isImage && !contentType.startsWith('image/')) {
        console.log('[TWITTER-IMAGE-PROXY] Not an image content-type:', contentType, imageUrl);
        return Response.redirect(FALLBACK_IMAGE, 302);
      }

      // Get the image data
      const imageData = await response.arrayBuffer();
      
      // Check if image is too small (might be a placeholder/error image)
      if (imageData.byteLength < 1000) {
        console.log('[TWITTER-IMAGE-PROXY] Image too small, likely placeholder:', imageData.byteLength, imageUrl);
        return Response.redirect(FALLBACK_IMAGE, 302);
      }

      // Check if image is too large for Twitter (5MB limit)
      if (imageData.byteLength > 5 * 1024 * 1024) {
        console.log('[TWITTER-IMAGE-PROXY] Image too large for Twitter:', imageData.byteLength, imageUrl);
        return Response.redirect(FALLBACK_IMAGE, 302);
      }

      console.log('[TWITTER-IMAGE-PROXY] Successfully fetched image:', imageData.byteLength, 'bytes');

      // Return the image with proper headers for Twitter
      return new Response(imageData, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': isImage ? contentType : 'image/jpeg',
          'Content-Length': String(imageData.byteLength),
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
          'X-Content-Type-Options': 'nosniff',
        },
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.log('[TWITTER-IMAGE-PROXY] Request timed out:', imageUrl);
      } else {
        console.log('[TWITTER-IMAGE-PROXY] Fetch error:', fetchError, imageUrl);
      }
      
      return Response.redirect(FALLBACK_IMAGE, 302);
    }

  } catch (error) {
    console.error('[TWITTER-IMAGE-PROXY] Error:', error);
    return Response.redirect(FALLBACK_IMAGE, 302);
  }
});
