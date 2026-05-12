#!/bin/bash
# Quick Deploy Script for Cinematic Video Fixes
# Deploys all updated edge functions at once

set -e

echo "🚀 Deploying Cinematic Video Fixes..."
echo ""

# Check if in correct directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from project root"
  exit 1
fi

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
  echo "❌ Error: Supabase CLI not found"
  echo "Install: https://supabase.com/docs/guides/cli"
  exit 1
fi

echo "📋 Deploying edge functions..."
echo ""

# Deploy VEO function (updated for Cloudinary)
echo "1/4 Deploying veo-generate-video..."
supabase functions deploy veo-generate-video
echo "✅ veo-generate-video deployed"
echo ""

# Deploy Cloudinary processor
echo "2/4 Deploying cloudinary-process-video..."
supabase functions deploy cloudinary-process-video
echo "✅ cloudinary-process-video deployed"
echo ""

# Deploy ElevenLabs TTS
echo "3/4 Deploying elevenlabs-tts..."
supabase functions deploy elevenlabs-tts
echo "✅ elevenlabs-tts deployed"
echo ""

# Deploy OpenAI TTS
echo "4/4 Deploying openai-tts..."
supabase functions deploy openai-tts
echo "✅ openai-tts deployed"
echo ""

echo "✅ All functions deployed successfully!"
echo ""
echo "📋 Next steps:"
echo "  1. Verify secrets are configured:"
echo "     - CLOUDINARY_CLOUD_NAME"
echo "     - CLOUDINARY_API_KEY"
echo "     - CLOUDINARY_API_SECRET"
echo "     - ELEVENLAB_API_KEY"
echo "     - OPENAI_API_KEY"
echo "     - PIXABAY_API_KEY"
echo ""
echo "  2. Test cinematic generation:"
echo "     https://curiosai.com/cinematic-results?q=test"
echo ""
echo "  3. Check console for:"
echo "     ✅ [VEO Save] Video uploaded to Cloudinary successfully"
echo "     ✅ [NarrationService] TTS generated successfully"
echo "     ❌ No 546 errors"
echo ""
echo "📖 Full deployment guide:"
echo "    docs/General/deployment/DEPLOY_CINEMATIC_FIX.md"
echo ""
