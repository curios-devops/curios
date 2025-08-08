// Edge Function for Dynamic Social Media Meta Tags
export default async function handler(request: Request, context: any) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || url.searchParams.get('query') || '';
    const snippet = url.searchParams.get('snippet') || '';

    // Get original HTML response
    const response = await context.next();
    
    // Check if this is an HTML request
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return response;
    }

    let html = await response.text();

    // Only inject meta tags if we have query parameters
    if (!query && !snippet) {
      return new Response(html, {
        headers: response.headers,
      });
    }

    // Create social sharing content
    const title = query 
      ? `${query} - CuriosAI Search Results` 
      : 'CuriosAI - AI-Powered Web Search';
      
    const description = snippet 
      ? `${snippet.slice(0, 155)}${snippet.length > 155 ? '...' : ''}`
      : query 
        ? `Search results for "${query}" - AI-powered insights and comprehensive analysis`
        : 'Discover insights with AI-powered search and analysis';

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