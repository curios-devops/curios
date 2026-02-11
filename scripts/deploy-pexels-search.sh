#!/bin/bash
# Deploy Pexels Search Edge Function to Supabase
# This function securely proxies Pexels API calls to prevent API key exposure

set -e

echo "🎬 Deploying Pexels Search Edge Function..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found"
    echo "Install it with: brew install supabase/tap/supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Error: Not logged in to Supabase"
    echo "Run: supabase login"
    exit 1
fi

echo "📦 Deploying pexels-search function..."
supabase functions deploy pexels-search --no-verify-jwt

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set PEXELS_API_KEY secret in Supabase dashboard"
echo "2. Test the function:"
echo "   curl -X POST https://gpfccicfqynahflehpqo.supabase.co/functions/v1/pexels-search \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"query\": \"coffee\", \"type\": \"videos\", \"perPage\": 5}'"
echo ""
echo "3. Check function logs:"
echo "   supabase functions logs pexels-search"
echo ""
