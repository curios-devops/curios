#!/bin/bash

# LinkedIn Fix Deployment & Test Script
# This script deploys the LinkedIn sharing fixes and provides testing instructions

echo "🚀 Deploying LinkedIn Sharing Fixes..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the project root directory"
    exit 1
fi

# Build the project
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix build errors first."
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Deploy to Netlify
echo "🌐 Deploying to Netlify..."
netlify deploy --prod

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed! Please check Netlify configuration."
    exit 1
fi

echo "✅ Deployment successful!"
echo ""

# Get the deployed URL
SITE_URL=$(netlify status --json | jq -r '.site.url')

if [ "$SITE_URL" = "null" ] || [ -z "$SITE_URL" ]; then
    echo "⚠️  Could not automatically detect site URL. Please check Netlify dashboard."
    echo "📋 Manual steps:"
    echo "   1. Get your site URL from Netlify dashboard"
    echo "   2. Test: [YOUR_URL]/search?q=artificial+intelligence"
    echo "   3. Use LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/"
else
    echo "🎉 Your site is deployed at: $SITE_URL"
    echo ""
    echo "🧪 Testing Instructions:"
    echo ""
    echo "1. 📋 Copy this URL for testing:"
    echo "   $SITE_URL/search?q=artificial+intelligence"
    echo ""
    echo "2. 🔍 Test with LinkedIn Post Inspector:"
    echo "   https://www.linkedin.com/post-inspector/"
    echo "   • Paste the URL above"
    echo "   • Click 'Inspect'"
    echo "   • Check if title shows 'artificial intelligence'"
    echo "   • Check if description shows AI snippet"
    echo "   • Check if custom image appears"
    echo ""
    echo "3. 🖼️ Test OG Image generation:"
    echo "   $SITE_URL/.netlify/functions/og-image?query=artificial%20intelligence"
    echo ""
    echo "4. 🔗 Test live LinkedIn sharing:"
    echo "   • Share the search URL on LinkedIn"
    echo "   • Check the preview card (not the text input)"
    echo "   • Title should be 'artificial intelligence'"
    echo "   • Description should show AI snippet"
    echo ""
    echo "5. 🧪 Additional test URLs:"
    echo "   $SITE_URL/search?q=climate+change"
    echo "   $SITE_URL/search?q=space+exploration"
    echo ""
fi

echo "📝 Debug Information:"
echo "   • Enhanced logging is enabled in browser console"
echo "   • Check Network tab for OG image loading"
echo "   • Check Elements tab for meta tag updates"
echo ""

echo "🎯 What to expect:"
echo "   ✅ LinkedIn dialog shows 'What do you want to talk about?' (normal)"
echo "   ✅ Preview card below shows dynamic title, description, image"
echo "   ✅ Title matches your search query"
echo "   ✅ Description shows AI overview snippet"
echo "   ✅ Image shows either search result or generated image"
echo ""

echo "🔧 If issues persist:"
echo "   1. Clear LinkedIn cache using Post Inspector"
echo "   2. Check browser console for debugging logs"
echo "   3. Verify OG image URL loads correctly"
echo "   4. Test with different search queries"
echo ""

echo "🎉 LinkedIn sharing fix deployment complete!"
