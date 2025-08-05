// Netlify Edge Function for Dynamic Meta Tag Injection

export default async (request: Request, context: any) => {
  const url = new URL(request.url);
  
  // Handle multiple search page patterns
  const isSearchPage = url.pathname === '/search' || 
                      url.pathname.startsWith('/search/') ||
                      url.pathname === '/pro-search' ||
                      url.pathname === '/deep-research' ||
                      url.pathname === '/insights-results' ||
                      url.pathname === '/research-results' ||
                      url.pathname === '/researcher-results';
  
  if (!isSearchPage) {
    return; // Continue to normal page
  }
  
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  const isSocialCrawler = userAgent.includes('linkedinbot') || 
                         userAgent.includes('facebookexternalhit') || 
                         userAgent.includes('twitterbot') || 
                         userAgent.includes('whatsapp') ||
                         userAgent.includes('slackbot') ||
                         userAgent.includes('discordbot');
  
  console.log(`Edge Function: ${url.pathname}, User-Agent: ${userAgent}, isSocialCrawler: ${isSocialCrawler}`);
  
  if (!isSocialCrawler) {
    return; // Let normal users get the SPA
  }
  
  // Extract query from URL
  const query = url.searchParams.get('q') || 'Search Results';
  const snippet = url.searchParams.get('snippet') || null;
  
  // Generate dynamic meta tags for social crawlers
  const title = query;
  
  // Create teaser description to motivate clicks
  let description = '';
  if (snippet) {
    // Create teaser from AI overview snippet
    const sentences = snippet.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length >= 2) {
      // Use first two sentences as teaser
      const teaser = sentences.slice(0, 2).join('. ').trim();
      description = teaser.length > 140 ? teaser.substring(0, 137) + '...' : teaser + '...';
    } else if (sentences.length === 1) {
      // Use first sentence if substantial
      const firstSentence = sentences[0].trim();
      description = firstSentence.length > 100 ? firstSentence.substring(0, 137) + '...' : firstSentence + '...';
    } else {
      // Fallback to truncated snippet
      description = snippet.slice(0, 140) + (snippet.length > 140 ? '...' : '');
    }
  } else {
    description = `AI-powered search results for "${query}" - Comprehensive insights and analysis with expert sources and detailed information.`;
  }
  
  // Use snippet in OG image if available
  const ogImageParams = new URLSearchParams({ query });
  if (snippet) {
    ogImageParams.set('snippet', snippet.slice(0, 200));
  }
  const ogImage = `${url.origin}/.netlify/functions/og-image?${ogImageParams.toString()}`;
  const canonicalUrl = request.url;
  
  // Create HTML with proper meta tags
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} - CuriosAI</title>
    
    <!-- Open Graph meta tags for LinkedIn -->
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="CuriosAI" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/svg+xml" />
    
    <!-- Twitter Card meta tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@CuriosAI" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImage}" />
    
    <!-- Standard meta tags -->
    <meta name="description" content="${description}" />
    <meta name="author" content="CuriosAI" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${canonicalUrl}" />
    
    <!-- Refresh to actual page for crawlers that follow redirects -->
    <meta http-equiv="refresh" content="0;url=${canonicalUrl}" />
</head>
<body>
    <h1>${title}</h1>
    <p>${description}</p>
    <p>If you are not redirected automatically, <a href="${canonicalUrl}">click here</a>.</p>
    
    <script>
        // Redirect browsers to the actual SPA
        if (!navigator.userAgent.match(/LinkedInBot|facebookexternalhit|Twitterbot|WhatsApp/i)) {
            window.location.href = '${canonicalUrl}';
        }
    </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=300' // 5 minutes cache
    }
  });
};
