#!/bin/bash

# Deploy Anam Avatar Supabase Function
# This script:
# 1. Sets the ANAM_API_KEY secret in Supabase
# 2. Deploys the anam-avatar edge function

set -e

echo "🎭 Deploying Anam Avatar Edge Function..."

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
echo "🔑 Setting Supabase secret (using CLI v1.200.3)..."

# Set the secret in Supabase (using compatible version)
npx supabase@1.200.3 secrets set ANAM_API_KEY="$ANAM_API_KEY"

echo "✅ Secret configured"
echo "📦 Deploying anam-avatar function..."

# Deploy the function (using compatible version)
npx supabase@1.200.3 functions deploy anam-avatar --no-verify-jwt

echo "✅ anam-avatar function deployed successfully!"
echo ""
echo "Test the function with:"
echo "curl -X POST https://gpfccicfqynahflehpqo.supabase.co/functions/v1/anam-avatar \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"audioBase64\": \"YOUR_BASE64_AUDIO\"}'"
