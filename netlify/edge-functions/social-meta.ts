// Edge Function for Dynamic Social Media Meta Tags
export default async function handler(request: Request, context: any) {
  console.log('🔥 Edge function triggered!', {
    url: request.url,
    userAgent: request.headers.get('user-agent')?.slice(0, 100)
  });

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || url.searchParams.get('query') || '';
    const snippet = url.searchParams.get('snippet') || '';

    console.log('🔍 Edge function processing', {
      path: url.pathname,
      query: query.slice(0, 50),
      hasQuery: !!query,
      hasSnippet: !!snippet
    });

    // Get original HTML response
    const response = await context.next();
    
    // Check if this is an HTML request
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      console.log('❌ Not HTML content type:', contentType);
      return response;
    }

    let html = await response.text();
    console.log('📄 HTML length:', html.length, 'includes </head>:', html.includes('</head>'));

    // Always inject meta tags if we have a query parameter (no bot detection needed)
    if (!query) {
      console.log('❌ No query parameter, skipping meta injection');
      return new Response(html, {
        headers: response.headers,
      });
    }

    console.log('✅ Injecting meta tags for query:', query.slice(0, 30));

    // Create social sharing content - use the user query as the title
    const title = query;  // Just the user query, like "How does machine learning work"
      
    const description = snippet && snippet.trim() 
      ? `${snippet.slice(0, 155)}${snippet.length > 155 ? '...' : ''}`
      : `Search results for "${query}" - AI-powered insights and comprehensive analysis`;

    // Generate dynamic OG image URL - use .svg as fallback
    const baseUrl = url.origin;
    const imageUrl = `${baseUrl}/.netlify/functions/og-image?query=${encodeURIComponent(query)}${snippet ? `&snippet=${encodeURIComponent(snippet.slice(0, 200))}` : ''}`;

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
    <!-- Dynamic Social Media Meta Tags by Edge Function -->
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDescription}">
    <meta property="og:image" content="${safeImageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/svg+xml">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="CuriosAI">
    <meta property="og:url" content="${safeUrl}">
    
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDescription}">
    <meta name="twitter:image" content="${safeImageUrl}">
    
    <meta name="description" content="${safeDescription}">
    <title>${safeTitle}</title>`;

    console.log('🏷️ Generated meta tags length:', metaTags.length);

    // Inject meta tags before </head>
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${metaTags}\n</head>`);
      console.log('✅ Meta tags injected before </head>');
    } else {
      // Fallback: inject after <head> if no closing </head> found
      html = html.replace('<head>', `<head>${metaTags}`);
      console.log('✅ Meta tags injected after <head>');
    }

    console.log('🎉 Edge function completed successfully');

    return new Response(html, {
      headers: {
        ...response.headers,
        "content-type": "text/html; charset=utf-8",
      },
    });

  } catch (error) {
    console.error('💥 Edge function error:', error);
    // Return original response on error
    return context.next();
  }
}