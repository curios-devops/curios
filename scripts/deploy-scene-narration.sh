#!/bin/bash
# Deploy add-scene-narration edge function to Supabase

set -e

echo "🚀 Deploying add-scene-narration edge function..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Deploy the function
echo "📦 Deploying function..."
supabase functions deploy add-scene-narration

echo "✅ Deployment complete!"
echo ""
echo "📝 Function URL:"
echo "   https://gpfccicfqynahflehpqo.supabase.co/functions/v1/add-scene-narration"
echo ""
echo "🧪 Test the function:"
echo '   curl -X POST https://gpfccicfqynahflehpqo.supabase.co/functions/v1/add-scene-narration \'
echo '     -H "Authorization: Bearer YOUR_ANON_KEY" \'
echo '     -H "Content-Type: application/json" \'
echo '     -d "{\"videoUrl\": \"...\", \"narrationAudio\": \"...\", \"userId\": \"test\", \"sceneId\": \"scene_1\"}"'
