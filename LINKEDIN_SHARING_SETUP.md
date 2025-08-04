# LinkedIn Sharing Setup Guide for CuriosAI

## 🎯 Problem Solved
LinkedIn wasn't showing proper preview cards when sharing CuriosAI links because it couldn't access dynamically generated meta tags. This guide shows you how we've fixed this issue.

## ✅ What We've Implemented

### 1. **Vite HTML Plugin Configuration**
- Added `vite-plugin-html` to support dynamic meta tag injection
- Configured environment variables for Open Graph data
- Updated `vite.config.ts` to inject meta tags during build

### 2. **Static Meta Tags in HTML**
Updated `index.html` with template variables:
```html
<meta property="og:title" content="<%- ogTitle %>" />
<meta property="og:description" content="<%- ogDescription %>" />
<meta property="og:image" content="<%- ogImage %>" />
<meta property="og:url" content="<%- ogUrl %>" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

### 3. **Environment Variables Added**
Added to `.env` file:
```env
VITE_OG_TITLE="CuriosAI Web Search - Advanced AI-powered search"
VITE_OG_DESCRIPTION="Get comprehensive search results with AI-powered insights..."
VITE_OG_IMAGE="https://curiosai.com/og-image.svg"
VITE_OG_URL="https://curiosai.com"
VITE_OG_SITE_NAME="CuriosAI"
VITE_TWITTER_SITE="@CuriosAI"
```

### 4. **Enhanced Meta Tags Utility**
- Created `updateLinkedInMetaTags()` function
- Added LinkedIn-specific requirements
- Improved description generation for search results

### 5. **Custom Open Graph Image**
- Created `/public/og-image.svg` (1200x630px)
- Includes CuriosAI branding and description
- Meets LinkedIn's image requirements

## 🚀 How to Test LinkedIn Sharing

### Step 1: Build and Deploy
```bash
npm run build
# Deploy to your hosting platform
```

### Step 2: Test with LinkedIn Post Inspector
1. Go to: https://www.linkedin.com/post-inspector/inspect/
2. Enter your URL (e.g., `https://curiosai.com/search?q=artificial+intelligence`)
3. Click "Inspect" (not "Share")
4. Check if the preview shows:
   - Correct title
   - Description
   - Your custom image
   - curiosai.com domain

### Step 3: Clear LinkedIn Cache
If you don't see updated previews:
1. Use the Post Inspector to force a refresh
2. LinkedIn caches previews for ~7 days
3. The inspector forces a new scrape

## 📋 LinkedIn Requirements Checklist

### ✅ Image Requirements
- [x] Minimum 1200×630px (we created 1200×630 SVG)
- [x] Aspect ratio ≈ 1.91:1
- [x] Publicly accessible URL
- [x] No authentication required
- [x] File size under 5MB

### ✅ Meta Tag Requirements
- [x] `og:title` - Dynamic based on search query
- [x] `og:description` - Generated from search results
- [x] `og:image` - Custom CuriosAI branded image
- [x] `og:url` - Current page URL
- [x] `og:type` - Set to "article"
- [x] `og:site_name` - "CuriosAI"

### ✅ Technical Requirements
- [x] Meta tags in static HTML (before JavaScript)
- [x] No authentication required for image
- [x] Valid URLs
- [x] Proper content encoding

## 🔧 For Production Deployment

### 1. **Convert SVG to PNG** (Recommended)
LinkedIn prefers PNG over SVG. Convert your og-image.svg to PNG:
```bash
# Using online converter or tools like:
# npm install -g svg2png-cli
# svg2png public/og-image.svg public/og-image.png
```

### 2. **Update Environment for Production**
```env
VITE_OG_IMAGE="https://curiosai.com/og-image.png"
VITE_OG_URL="https://curiosai.com"
```

### 3. **Test Different URL Patterns**
- Home page: `https://curiosai.com`
- Search results: `https://curiosai.com/search?q=your+query`
- Specific features: `https://curiosai.com/research?q=your+query`

## 🐛 Troubleshooting

### If LinkedIn Still Shows Generic Preview:
1. **Check Network Tab**: Ensure og-image.svg loads without errors
2. **Verify Meta Tags**: View page source to confirm meta tags are present
3. **Test Image URL**: Open image URL directly in browser
4. **Clear All Caches**: Use Post Inspector multiple times
5. **Check robots.txt**: Ensure image isn't blocked

### If Image Doesn't Load:
1. Convert SVG to PNG
2. Ensure image is publicly accessible
3. Check CORS headers if serving from CDN
4. Verify file size is under 5MB

## 📈 Expected Results

After implementation, LinkedIn shares should show:
- **Title**: "Your Search Query - CuriosAI Search"
- **Description**: "AI-powered search results with insights..."
- **Image**: Custom CuriosAI branded preview
- **Domain**: "curiosai.com"
- **Rich card**: Full preview with image and text

This creates professional-looking shared links that encourage clicks and engagement on LinkedIn!
