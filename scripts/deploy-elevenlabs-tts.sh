#!/bin/bash
# Deploy ElevenLabs TTS Edge Function to Supabase
# This function securely proxies ElevenLabs API calls to prevent API key exposure

set -e

echo "🎬 Deploying ElevenLabs TTS Edge Function..."
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

echo "📦 Deploying elevenlabs-tts function..."
supabase functions deploy elevenlabs-tts --no-verify-jwt

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set ELEVENLAB_API_KEY secret in Supabase dashboard or via CLI:"
echo "   supabase secrets set ELEVENLAB_API_KEY=your_key_here --project-ref gpfccicfqynahflehpqo"
echo ""
echo "2. Test the function:"
echo "   curl -X POST https://gpfccicfqynahflehpqo.supabase.co/functions/v1/elevenlabs-tts \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \\"
echo "     -d '{\"text\": \"Hello world\", \"voiceId\": \"EXAVITQu4vr4xnSDxMaL\"}'"
echo ""
echo "3. Check function logs:"
echo "   supabase functions logs elevenlabs-tts"
echo ""
