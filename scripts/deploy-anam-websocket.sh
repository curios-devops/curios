#!/bin/bash

# Deploy Anam WebSocket Setup
# Deploys the secure token function for WebSocket streaming

set -e

echo "🎭 Deploying Anam WebSocket Infrastructure..."
echo ""

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
echo ""

echo "📋 Deployment Steps:"
echo "   1. Deploy get-anam-token function to Supabase"
echo "   2. Configure ANAM_API_KEY secret (if not already done)"
echo "   3. Test token generation"
echo ""

# Deploy via Supabase Dashboard
echo "🌐 Please deploy via Supabase Dashboard:"
echo ""
echo "   1. Go to: https://app.supabase.com/project/gpfccicfqynahflehpqo/functions"
echo "   2. Click 'Create a new function'"
echo "   3. Name: get-anam-token"
echo "   4. Copy code from: supabase/functions/get-anam-token/index.ts"
echo "   5. Deploy"
echo "   6. Disable JWT verification in settings"
echo ""
echo "   ANAM_API_KEY secret should already be configured from earlier"
echo ""

# Test endpoint after deployment
echo "📝 After deployment, test with:"
echo ""
echo "   curl -X POST \\"
echo "     https://gpfccicfqynahflehpqo.supabase.co/functions/v1/get-anam-token \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{}'"
echo ""
echo "   Expected: {\"sessionId\":\"...\",\"token\":\"...\",\"wsUrl\":\"...\"}"
echo ""

echo "✅ Review docs/Search/architecture/ANAM_WEBSOCKET_ARCHITECTURE.md for details"
