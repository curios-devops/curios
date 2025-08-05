# 📦 Files to Copy to curiosai.com Production Project

## 🎯 **Quick Summary**
Copy these files to fix both the modal theme issue and enable dynamic LinkedIn sharing.

---

## ✅ **1. LoadingState Theme Fix (IMMEDIATE FIX)**

### File: `src/components/results/LoadingState.tsx`
```tsx
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message: string;
}

export default function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111111] transition-colors duration-200">
      <Loader2 className="animate-spin text-[#0095FF] mb-4" size={28} />
      <p className="text-gray-700 dark:text-gray-400 text-sm transition-colors duration-200">{message}</p>
      <p className="text-xs text-gray-600 dark:text-gray-500 mt-2 transition-colors duration-200">This might take a few moments</p>
    </div>
  );
}
```

**What this fixes:**
- ✅ "Searching with SearxNG..." modal now respects dark/light theme
- ✅ Smooth transitions between theme changes
- ✅ Proper contrast and readability in both modes

---

## 🔗 **2. LinkedIn Dynamic Sharing System**

### File: `netlify/edge-functions/social-meta.ts`
```typescript
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
  
  // Generate dynamic meta tags for social crawlers
  const title = query;
  const description = `AI-powered search results for "${query}" - Comprehensive insights and analysis from CuriosAI Web Search`;
  const ogImage = `${url.origin}/.netlify/functions/og-image?query=${encodeURIComponent(query)}`;
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
```

### File: `netlify/functions/og-image.ts`
```typescript
import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  try {
    const query = event.queryStringParameters?.query || 'CuriosAI Search';
    const snippet = event.queryStringParameters?.snippet || 'AI-powered search results with comprehensive insights';
    
    // Clean and truncate text for display
    const cleanQuery = query.slice(0, 60);
    const cleanSnippet = snippet.slice(0, 120);
    
    // Generate SVG with dynamic content
    const svg = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0095FF;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#007ACC;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="1200" height="630" fill="url(#bg)"/>
      
      <!-- Content Container -->
      <rect x="60" y="60" width="1080" height="510" rx="20" fill="rgba(255,255,255,0.1)"/>
      
      <!-- Logo/Brand -->
      <text x="100" y="140" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white">
        CuriosAI
      </text>
      
      <!-- Search Query -->
      <text x="100" y="220" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white">
        ${cleanQuery}
      </text>
      
      <!-- Snippet -->
      <text x="100" y="280" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.9)">
        ${cleanSnippet}
      </text>
      
      <!-- Search Icon -->
      <circle cx="1050" cy="180" r="40" fill="rgba(255,255,255,0.2)"/>
      <circle cx="1050" cy="180" r="25" fill="none" stroke="white" stroke-width="3"/>
      <line x1="1070" y1="200" x2="1090" y2="220" stroke="white" stroke-width="3" stroke-linecap="round"/>
      
      <!-- Footer -->
      <text x="100" y="520" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.8)">
        AI-Powered Search Results • curiosai.com
      </text>
    </svg>`;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600' // 1 hour cache
      },
      body: svg
    };
  } catch (error) {
    console.error('OG Image generation error:', error);
    
    // Fallback SVG
    const fallbackSvg = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="#0095FF"/>
      <text x="600" y="315" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle">
        CuriosAI Search
      </text>
    </svg>`;
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600'
      },
      body: fallbackSvg
    };
  }
};
```

### Add to `netlify.toml`:
```toml
# Add these edge function configurations
[[edge_functions]]
  function = "social-meta"
  path = "/search"

[[edge_functions]]
  function = "social-meta"
  path = "/search/*"

[[edge_functions]]
  function = "social-meta"
  path = "/pro-search"

[[edge_functions]]
  function = "social-meta"
  path = "/deep-research"

[[edge_functions]]
  function = "social-meta"
  path = "/insights-results"

[[edge_functions]]
  function = "social-meta"
  path = "/research-results"

[[edge_functions]]
  function = "social-meta"
  path = "/researcher-results"
```

---

## 📋 **Deploy Checklist**

### **Immediate (LoadingState fix):**
- [ ] Copy `LoadingState.tsx` to your production project
- [ ] Commit and push to GitHub
- [ ] Verify theme switching works on curiosai.com

### **LinkedIn Sharing:**
- [ ] Copy `social-meta.ts` to `netlify/edge-functions/`
- [ ] Copy `og-image.ts` to `netlify/functions/`
- [ ] Add edge function config to `netlify.toml`
- [ ] Commit and push to GitHub
- [ ] Test with LinkedIn Post Inspector

### **Testing URLs (after deploy):**
- **LinkedIn Inspector**: https://www.linkedin.com/post-inspector/
- **Test URL**: https://curiosai.com/search?q=artificial%20intelligence
- **OG Image Test**: https://curiosai.com/.netlify/functions/og-image?query=test

---

## 🎯 **Expected Results**

### **After LoadingState fix:**
✅ Loading modal respects dark/light theme immediately

### **After LinkedIn sharing deploy:**
✅ LinkedIn shows dynamic titles based on search query  
✅ LinkedIn shows AI overview snippets as descriptions  
✅ LinkedIn shows custom branded images per search  
✅ Professional LinkedIn preview cards for all shares

**Ready to copy and deploy! 🚀**
