#!/bin/bash
# Test ElevenLabs TTS edge function directly

SUPABASE_URL="https://gpfccicfqynahflehpqo.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUxNDIyMDYsImV4cCI6MjA1MDcxODIwNn0.wLnIXxThhq144sQpUFzLd_ifimgr1oetMwvchDmMF84"

echo "🧪 Testing ElevenLabs TTS Edge Function..."
echo ""

curl -v -X POST "${SUPABASE_URL}/functions/v1/elevenlabs-tts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "apikey: ${ANON_KEY}" \
  -d '{"text": "Hello world test", "voiceId": "EXAVITQu4vr4xnSDxMaL"}'

echo ""
echo ""
echo "✅ Test complete - check the response above"
