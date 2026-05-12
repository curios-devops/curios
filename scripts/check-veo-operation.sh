#!/bin/bash
###############################################################################
# Check Veo Operation Status
# Verifica el status de una operación de generación de video
###############################################################################

set -e

OPERATION_FILE="CURRENT_VEO_OPERATION.txt"

if [ ! -f "$OPERATION_FILE" ]; then
  echo "❌ No operation found. File $OPERATION_FILE doesn't exist."
  exit 1
fi

OPERATION_NAME=$(cat "$OPERATION_FILE")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Checking Veo Operation Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Operation: $OPERATION_NAME"
echo ""

# Call Supabase function to check status
RESPONSE=$(curl -s -X POST \
  "https://gpfccicfqynahflehpqo.supabase.co/functions/v1/veo-generate-video" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUxNDIyMDYsImV4cCI6MjA1MDcxODIwNn0.wLnIXxThhq144sQpUFzLd_ifimgr1oetMwvchDmMF84" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"check\",
    \"operationName\": \"$OPERATION_NAME\"
  }")

echo "📥 Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if done
DONE=$(echo "$RESPONSE" | python3 -c "import json,sys; data=json.load(sys.stdin); print(data.get('done', False))" 2>/dev/null)

if [ "$DONE" = "True" ]; then
  echo "✅ Video generation COMPLETE!"
  echo ""
  echo "Check the response above for video URL."
else
  echo "⏳ Video still generating..."
  echo ""
  echo "💡 Run this script again in 1-2 minutes:"
  echo "   bash scripts/check-veo-operation.sh"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
