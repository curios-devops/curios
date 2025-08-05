#!/bin/bash

# CuriosAI LinkedIn Sharing Deployment Script
echo "🚀 Deploying CuriosAI with LinkedIn Sharing Support"
echo "================================================"

# Check if netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

# Check if user is logged in
echo "📡 Checking Netlify authentication..."
if ! netlify status &> /dev/null; then
    echo "🔐 Please login to Netlify..."
    netlify login
fi

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi

# Deploy to Netlify
echo "🚀 Deploying to Netlify..."
netlify deploy --dir=dist --prod

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Deployment successful!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Copy your Netlify URL from above"
    echo "2. Test OG image: YOUR-URL/.netlify/functions/og-image?query=test"
    echo "3. Test LinkedIn: https://www.linkedin.com/post-inspector/"
    echo "4. Share a search URL on LinkedIn!"
    echo ""
    echo "🔗 Example URLs to test:"
    echo "- YOUR-URL/search?q=artificial%20intelligence"
    echo "- YOUR-URL/search?q=climate%20change"
    echo "- YOUR-URL/search?q=space%20exploration"
    echo ""
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi
