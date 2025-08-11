// Edge Function for Dynamic Social Media Meta Tags
export default async function handler(request: Request, context: any) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || url.searchParams.get('query') || '';
    const snippet = url.searchParams.get('snippet') || '';

    // Detect if this is a social media crawler - enhanced LinkedIn detection
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';
    const secFetchSite = request.headers.get('sec-fetch-site') || '';
    const secFetchMode = request.headers.get('sec-fetch-mode') || '';
    
    const isBot = /bot|crawler|spider|facebookexternalhit|twitterbot|linkedinbot|whatsapp|slackbot|linkedin/i.test(userAgent) ||
                  /linkedin\.com/i.test(referer) ||
                  !userAgent.includes('Mozilla') || // Many bots don't include Mozilla
                  userAgent === '' || // Empty user agent is likely a bot
                  // Enhanced LinkedIn detection
                  /LinkedInBot|LinkedInShareTool|LinkedInApp|LinkedInShare/i.test(userAgent) ||
                  // Sometimes LinkedIn uses generic browser-like agents, detect by other headers
                  (secFetchSite === 'cross-site' && secFetchMode === 'navigate');

    // Log for debugging
    console.log('Edge function - social-meta triggered', {
      path: url.pathname,
      query: query.slice(0, 50),
      isBot,
      userAgent: userAgent.slice(0, 100),
      referer: referer.slice(0, 100),
      secFetchSite,
      secFetchMode,
      accept: request.headers.get('accept')?.slice(0, 100)
    });

    // Get original HTML response
    const response = await context.next();
    
    // Check if this is an HTML request
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return response;
    }

    let html = await response.text();

    // Only inject meta tags if it's a bot - be more aggressive for LinkedIn
    if (!isBot) {
      return new Response(html, {
        headers: response.headers,
      });
    }

    // If no query but it's a bot on search page, provide generic fallback
    if (!query) {
      const searchFallbackTitle = "CuriosAI - AI-Powered Search";
      const searchFallbackDescription = "Discover insights with AI-powered search and comprehensive analysis";
      
      const metaTags = `
      <!-- Fallback Social Media Meta Tags -->
      <meta property="og:title" content="${searchFallbackTitle}">
      <meta property="og:description" content="${searchFallbackDescription}">
      <meta property="og:image" content="${url.origin}/og-image.png">
      <meta property="og:type" content="website">
      <meta property="og:site_name" content="CuriosAI">
      <meta property="og:url" content="${url.href}">
      
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${searchFallbackTitle}">
      <meta name="twitter:description" content="${searchFallbackDescription}">
      <meta name="twitter:image" content="${url.origin}/og-image.png">
      
      <meta name="description" content="${searchFallbackDescription}">
      <title>${searchFallbackTitle}</title>`;

      if (html.includes('</head>')) {
        html = html.replace('</head>', `${metaTags}\n</head>`);
      } else {
        html = html.replace('<head>', `<head>${metaTags}`);
      }

      return new Response(html, {
        headers: {
          ...response.headers,
          "content-type": "text/html; charset=utf-8",
        },
      });
    }

    // Create social sharing content
    const title = `${query} - CuriosAI Search Results`;
      
    const description = snippet && snippet.trim() 
      ? `${snippet.slice(0, 155)}${snippet.length > 155 ? '...' : ''}`
      : `Search results for "${query}" - AI-powered insights and comprehensive analysis`;

    // Generate dynamic OG image URL
    const baseUrl = url.origin;
    const imageUrl = query 
      ? `${baseUrl}/.netlify/functions/og-image?query=${encodeURIComponent(query)}${snippet ? `&snippet=${encodeURIComponent(snippet.slice(0, 200))}` : ''}`
      : `${baseUrl}/og-image.png`;

    // Escape content for HTML attributes
    const escapeHtml = (text: string) => 
      text.replace(/[<>&"']/g, (c) => ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#39;'
      }[c] || c));

    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeImageUrl = escapeHtml(imageUrl);
    const safeUrl = escapeHtml(url.href);

    // Create meta tags for social sharing
    const metaTags = `
    <!-- Dynamic Social Media Meta Tags -->
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDescription}">
    <meta property="og:image" content="${safeImageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="627">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="CuriosAI">
    <meta property="og:url" content="${safeUrl}">
    
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDescription}">
    <meta name="twitter:image" content="${safeImageUrl}">
    
    <meta name="description" content="${safeDescription}">
    <title>${safeTitle}</title>`;

    // Inject meta tags before </head>
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${metaTags}\n</head>`);
    } else {
      // Fallback: inject after <head> if no closing </head> found
      html = html.replace('<head>', `<head>${metaTags}`);
    }

    return new Response(html, {
      headers: {
        ...response.headers,
        "content-type": "text/html; charset=utf-8",
      },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    // Return original response on error
    return context.next();
  }
}