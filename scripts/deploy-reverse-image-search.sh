#!/bin/bash

# Deploy Reverse Image Search Edge Function
# This script adds the SERP API key as a secret and deploys the function

set -e  # Exit on error

echo "🚀 Deploying Reverse Image Search Edge Function"
echo "================================================"
echo ""

# Check if SERPAPI_API_KEY is in .env
if grep -q "SERPAPI_API_KEY" .env; then
    SERP_KEY=$(grep "SERPAPI_API_KEY" .env | cut -d '=' -f2)
    echo "✅ Found SERPAPI_API_KEY in .env"
else
    echo "❌ Error: SERPAPI_API_KEY not found in .env"
    echo "   Please add it to .env first:"
    echo "   SERPAPI_API_KEY=your_key_here"
    exit 1
fi

echo ""
echo "📝 Step 1: Adding SERP API key as Supabase secret..."
supabase secrets set SERPAPI_API_KEY="$SERP_KEY"

echo ""
echo "🔍 Step 2: Verifying secret was added..."
supabase secrets list

echo ""
echo "📦 Step 3: Deploying Edge Function..."
supabase functions deploy reverse-image-search

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🧪 Test the function:"
echo "   1. Start dev server: npm run dev"
echo "   2. Upload an image (no text)"
echo "   3. Click Search"
echo "   4. Check console for: '🔍 [REVERSE IMAGE TOOL] Response received: 200 OK'"
echo ""
echo "📖 Full docs: docs/DEPLOY_REVERSE_IMAGE_SEARCH.md"
