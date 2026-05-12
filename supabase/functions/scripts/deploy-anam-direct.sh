#!/bin/bash

# Direct deployment to Supabase using Management API
# This bypasses the CLI and Docker requirement

set -e

echo "🎭 Direct deployment of Anam Avatar function..."

# Read function code
FUNCTION_CODE=$(cat supabase/functions/anam-avatar/index.ts)

# You'll need to get your Supabase access token from:
# https://app.supabase.com/account/tokens

echo ""
echo "⚠️  This script requires a Supabase Access Token"
echo "📋 Get it from: https://app.supabase.com/account/tokens"
echo ""
read -p "Enter your Supabase Access Token: " SUPABASE_ACCESS_TOKEN

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ No access token provided"
  exit 1
fi

PROJECT_REF="gpfccicfqynahflehpqo"

echo ""
echo "📦 Deploying function via Management API..."

# Create or update function
curl -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/anam-avatar" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"slug\": \"anam-avatar\",
    \"name\": \"anam-avatar\",
    \"body\": $(echo "$FUNCTION_CODE" | jq -Rs .),
    \"verify_jwt\": false
  }"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Note: You still need to set the ANAM_API_KEY secret in the dashboard:"
echo "   https://app.supabase.com/project/gpfccicfqynahflehpqo/settings/vault"
