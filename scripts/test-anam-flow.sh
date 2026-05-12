#!/bin/bash

# Test the complete TTS -> Anam flow

set -e

echo "🧪 Testing Anam Avatar Flow..."
echo ""

# Step 1: Generate TTS audio
echo "1️⃣ Generating TTS audio with ElevenLabs..."
TTS_RESPONSE=$(curl -s -X POST \
  'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/elevenlabs-tts' \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "Hello! This is a test of the Anam avatar system.",
    "voiceId": "EXAVITQu4vr4xnSDxMaL"
  }')

# Check if TTS succeeded
if echo "$TTS_RESPONSE" | grep -q '"audio"'; then
  echo "✅ TTS audio generated successfully"

  # Extract audio base64 (just first 100 chars for display)
  AUDIO_PREVIEW=$(echo "$TTS_RESPONSE" | grep -o '"audio":"[^"]*"' | cut -d'"' -f4 | head -c 100)
  echo "   Audio base64 preview: ${AUDIO_PREVIEW}..."

  # Extract full audio
  AUDIO_BASE64=$(echo "$TTS_RESPONSE" | grep -o '"audio":"[^"]*"' | cut -d'"' -f4)
  AUDIO_LENGTH=${#AUDIO_BASE64}
  echo "   Audio base64 length: $AUDIO_LENGTH characters"

  # Step 2: Send to Anam
  echo ""
  echo "2️⃣ Sending audio to Anam for avatar generation..."
  echo "   ⏳ This may take 10-30 seconds..."

  ANAM_RESPONSE=$(curl -s -X POST \
    'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/anam-avatar' \
    -H 'Content-Type: application/json' \
    -d "{\"audioBase64\": \"$AUDIO_BASE64\"}")

  echo ""
  echo "3️⃣ Anam Response:"
  echo "$ANAM_RESPONSE" | head -50

  # Check result
  if echo "$ANAM_RESPONSE" | grep -q '"videoUrl"'; then
    echo ""
    echo "✅ SUCCESS! Avatar video generated"
    VIDEO_URL=$(echo "$ANAM_RESPONSE" | grep -o '"videoUrl":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$VIDEO_URL" ]; then
      echo "   Video URL: $VIDEO_URL"
    else
      echo "   Video returned as base64 data"
    fi
  elif echo "$ANAM_RESPONSE" | grep -q '"error"'; then
    echo ""
    echo "❌ Anam returned an error:"
    echo "$ANAM_RESPONSE"
  else
    echo ""
    echo "⚠️  Unexpected response from Anam"
  fi

else
  echo "❌ TTS failed:"
  echo "$TTS_RESPONSE"
fi
