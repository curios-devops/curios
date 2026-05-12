#!/bin/bash
# Redeploy VEO function with enhanced debugging

set -e

echo "🔧 Redeploying VEO function with enhanced error logging..."

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if secrets are set
echo "📋 Checking secrets..."
SECRETS=$(supabase secrets list 2>&1)

if echo "$SECRETS" | grep -q "VERTEX_AI_SERVICE_ACCOUNT_EMAIL"; then
    echo "✅ VERTEX_AI_SERVICE_ACCOUNT_EMAIL is set"
else
    echo "❌ VERTEX_AI_SERVICE_ACCOUNT_EMAIL is NOT set"
    echo "   Run: supabase secrets set VERTEX_AI_SERVICE_ACCOUNT_EMAIL='your-email@project.iam.gserviceaccount.com'"
    exit 1
fi

if echo "$SECRETS" | grep -q "VERTEX_AI_PRIVATE_KEY"; then
    echo "✅ VERTEX_AI_PRIVATE_KEY is set"
else
    echo "❌ VERTEX_AI_PRIVATE_KEY is NOT set"
    echo "   Run: supabase secrets set VERTEX_AI_PRIVATE_KEY='your-private-key'"
    exit 1
fi

# Deploy the function
echo "🚀 Deploying veo-generate-video function..."
supabase functions deploy veo-generate-video

echo "✅ Deployment complete!"
echo ""
echo "📊 To view logs, run:"
echo "   supabase functions logs veo-generate-video --tail 20"
echo ""
echo "🧪 To test the function, run:"
echo "   curl -X POST \"https://\$(supabase status | grep API | awk '{print \$3}')/functions/v1/veo-generate-video\" \\"
echo "     -H \"Authorization: Bearer \$SUPABASE_ANON_KEY\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"action\":\"generate\",\"prompt\":\"test\",\"aspectRatio\":\"16:9\"}'"
