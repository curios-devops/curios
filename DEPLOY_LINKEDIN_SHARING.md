# 🚀 Deploy CuriosAI with LinkedIn Sharing

## Step 1: Connect to Netlify

```bash
# If you don't have netlify CLI installed:
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site (choose "Create & configure a new site")
netlify init
```

## Step 2: Deploy the Site

```bash
# Deploy with build
netlify deploy --build --prod

# Or if you prefer manual build:
npm run build
netlify deploy --dir=dist --prod
```

## Step 3: Test LinkedIn Sharing

After deployment, you'll get a URL like: `https://amazing-app-name.netlify.app`

### Test the Edge Function:
```bash
# Replace YOUR-SITE with your actual Netlify URL
curl -H "User-Agent: LinkedInBot/1.0" "https://YOUR-SITE.netlify.app/search?q=test"
```

**Expected Result:** Should return HTML with dynamic meta tags, not JSON/SPA content.

### Test OG Image Generation:
```bash
curl "https://YOUR-SITE.netlify.app/.netlify/functions/og-image?query=artificial%20intelligence"
```

**Expected Result:** Should return SVG with "artificial intelligence" in the title.

### Test in LinkedIn Post Inspector:
1. Go to: https://www.linkedin.com/post-inspector/
2. Enter: `https://YOUR-SITE.netlify.app/search?q=artificial%20intelligence`
3. Should show dynamic title, description, and custom OG image

## Step 4: Share on LinkedIn

1. Copy a search URL: `https://YOUR-SITE.netlify.app/search?q=climate%20change`
2. Share it on LinkedIn
3. LinkedIn should show:
   - **Title**: "climate change"
   - **Description**: "AI-powered search results for 'climate change'..."
   - **Image**: Custom generated image with query

## Step 5: Verify Environment Variables

Add these to Netlify site settings if needed:

```
OG_BASE_URL=https://YOUR-SITE.netlify.app
OG_DEFAULT_IMAGE=/og-image.svg
OG_LOGO_URL=/logo.svg
```

## 🎯 Expected LinkedIn Preview

After deployment, when you share a search URL on LinkedIn, you should see:

**Dynamic Title**: The actual search query (e.g., "Artificial Intelligence")
**Dynamic Description**: "AI-powered search results for 'Artificial Intelligence' - Comprehensive insights and analysis from CuriosAI Web Search"
**Dynamic Image**: Custom SVG with:
- Search query as title
- CuriosAI branding
- Blue gradient background
- Search icon

## 🔧 Troubleshooting

If LinkedIn previews don't work after deployment:

1. **Check Edge Function Logs** in Netlify Functions tab
2. **Test with curl** using LinkedIn User-Agent
3. **Clear LinkedIn cache** using Post Inspector
4. **Verify OG image** loads correctly
5. **Check console logs** for any errors

The implementation is ready - just needs deployment! 🎉
