#!/bin/bash
# Deploy fetch-openai edge function with tools support

set -e

echo "🚀 Deploying fetch-openai edge function..."

cd supabase/functions

# Deploy the function
supabase functions deploy fetch-openai

echo "✅ fetch-openai deployed successfully!"
echo "🔧 Tools support enabled for Responses API (web_search, etc.)"
