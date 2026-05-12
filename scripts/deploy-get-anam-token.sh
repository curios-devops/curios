#!/bin/bash

# Deploy get-anam-token Supabase Function
# This script deploys the updated function that creates session tokens

set -e

echo "🎭 Deploying get-anam-token Edge Function..."

# Check if .env file exists
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found"
  exit 1
fi

# Load ANAM_API_KEY from .env
ANAM_API_KEY=$(grep '^ANAM_API_KEY=' .env | cut -d '=' -f2)

# Check if ANAM_API_KEY is set
if [ -z "$ANAM_API_KEY" ]; then
  echo "❌ Error: ANAM_API_KEY not found in .env"
  exit 1
fi

echo "✅ ANAM_API_KEY found in .env"
echo "🔑 Setting Supabase secret..."

# Set the secret in Supabase (using compatible version)
npx supabase@1.200.3 secrets set ANAM_API_KEY="$ANAM_API_KEY"

echo "✅ Secret configured"
echo "📦 Deploying get-anam-token function..."

# Deploy the function (using compatible version)
npx supabase@1.200.3 functions deploy get-anam-token --no-verify-jwt

echo "✅ get-anam-token function deployed successfully!"
echo ""
echo "Test the function with:"
echo "curl -X POST https://gpfccicfqynahflehpqo.supabase.co/functions/v1/get-anam-token \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{}'"
echo ""
echo "Expected response:"
echo '{"sessionToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'
