#!/bin/bash
# Setup TTS API keys in Supabase Secrets
# This script configures both ElevenLabs and OpenAI TTS edge functions

set -e

echo "🔧 Setting up TTS API keys in Supabase secrets..."

# Check if .env file exists
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found"
  exit 1
fi

# Load environment variables
source .env

# Validate required keys
if [ -z "$ELEVENLAB_API_KEY" ]; then
  echo "❌ Error: ELEVENLAB_API_KEY not found in .env"
  exit 1
fi

if [ -z "$OPENAI_API_KEY" ]; then
  echo "❌ Error: OPENAI_API_KEY not found in .env"
  exit 1
fi

echo "✅ Found API keys in .env"

# Set ElevenLabs API key
echo "📝 Setting ELEVENLAB_API_KEY in Supabase..."
echo "$ELEVENLAB_API_KEY" | supabase secrets set ELEVENLAB_API_KEY --env-file /dev/stdin

# Set OpenAI API key
echo "📝 Setting OPENAI_API_KEY in Supabase..."
echo "$OPENAI_API_KEY" | supabase secrets set OPENAI_API_KEY --env-file /dev/stdin

echo ""
echo "✅ TTS secrets configured successfully!"
echo ""
echo "📋 Configured secrets:"
echo "  - ELEVENLAB_API_KEY (ElevenLabs TTS)"
echo "  - OPENAI_API_KEY (OpenAI TTS fallback)"
echo ""
echo "🚀 Next steps:"
echo "  1. Deploy the edge functions:"
echo "     npm run deploy:elevenlabs-tts"
echo "     npm run deploy:openai-tts"
echo "  2. Test TTS generation in the app"
echo ""
