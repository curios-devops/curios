#!/usr/bin/env bash

echo "🔧 Clearing Netlify cache and Supabase Edge Functions..."

# Stop any running netlify dev processes
pkill -f "netlify dev" || true
pkill -f "supabase" || true
sleep 2

# Clear caches
rm -rf .netlify/cache
rm -rf .netlify/functions-serve  
rm -rf node_modules/.cache
rm -rf dist

echo "🔄 Clearing Supabase batch..."
if command -v supabase &> /dev/null; then
  echo "📦 Deploying Supabase Edge Functions..."
  # `social-share` is deprecated in Supabase (Netlify is canonical). Deploy remaining functions only.
  # Supabase social-share and social-og-image are deprecated (Netlify is canonical). Deploy remaining functions only.
  supabase functions deploy --no-verify-jwt social-share-search brave-web-search brave-images-search fetch-openai stripe-webhook || echo "⚠️ Supabase not found or not configured"
fi

echo "🚀 Starting fresh development environment..."
npm run dev