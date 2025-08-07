// Edge Function for Dynamic Social Media Meta Tags

export default async function handler(request: Request, context: any) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || url.searchParams.get('query') || '';
  const snippet = url.searchParams.get('snippet') || '';

  // Get original HTML
  const response = await context.next();
  let html = await response.text();

  // Extract title and description for social sharing
  const title = query 
    ? `${query} - CuriosAI Search Results` 
    : 'CuriosAI - AI-Powered Web Search';
    
  const description = snippet 
    ? `${snippet.slice(0, 155)}...`
    : `Search results for "${query}" - AI-powered insights and comprehensive analysis`;

  // Generate dynamic OG image URL with LinkedIn optimization
  const baseUrl = url.origin;
  const imageUrl = query 
    ? `${baseUrl}/.netlify/functions/og-image?query=${encodeURIComponent(query)}${snippet ? `&snippet=${encodeURIComponent(snippet.slice(0, 200))}` : ''}`
    : `${baseUrl}/og-image.png`;

  // Inject LinkedIn-optimized meta tags
  const metaTags = `
    <meta property="og:title" content="${title.replace(/"/g, '&quot;')}">
    <meta property="og:description" content="${description.replace(/"/g, '&quot;')}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="627">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="CuriosAI">
    <meta property="og:url" content="${url.href}">
    
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">
    <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}">
    <meta name="twitter:image" content="${imageUrl}">
    
    <title>${title.replace(/"/g, '&quot;')}</title>
  `;

  // Replace existing meta tags or inject before </head>
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${metaTags}</head>`);
  }

  return new Response(html, {
    headers: {
      ...response.headers,
      "content-type": "text/html; charset=utf-8",
    },
  });
}