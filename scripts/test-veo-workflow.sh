#!/bin/bash
# Test script for Veo video generation workflow

set -e

FUNCTION_URL="https://gpfccicfqynahflehpqo.supabase.co/functions/v1/veo-generate-video"
ANON_KEY="your-anon-key-here"  # Replace with actual key

echo "=== Testing Veo Video Generation Workflow ==="
echo ""

# Step 1: Generate video
echo "Step 1: Generating video..."
GENERATE_RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "prompt": "A serene ocean sunset with gentle waves",
    "aspectRatio": "16:9"
  }')

echo "Generate Response: $GENERATE_RESPONSE"
echo ""

# Extract operation name
OPERATION_NAME=$(echo $GENERATE_RESPONSE | jq -r '.operation')
echo "Operation Name: $OPERATION_NAME"
echo ""

# Step 2: Check status (polling)
echo "Step 2: Checking operation status..."
echo "Note: Video generation can take 5-15 minutes. Polling every 30 seconds..."
echo ""

MAX_ATTEMPTS=40  # 40 attempts * 30s = 20 minutes max
ATTEMPT=0
VIDEO_URL=""

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))
  echo "Attempt $ATTEMPT/$MAX_ATTEMPTS..."

  CHECK_RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"action\": \"check\",
      \"operationName\": \"$OPERATION_NAME\"
    }")

  echo "Check Response: $CHECK_RESPONSE"

  # Check if done
  IS_DONE=$(echo $CHECK_RESPONSE | jq -r '.done')

  if [ "$IS_DONE" = "true" ]; then
    echo "✓ Video generation completed!"
    VIDEO_URL=$(echo $CHECK_RESPONSE | jq -r '.videoUrl')
    echo "Video URL: $VIDEO_URL"
    break
  fi

  echo "Still processing... waiting 30 seconds"
  sleep 30
done

if [ -z "$VIDEO_URL" ]; then
  echo "✗ Video generation timed out or failed"
  exit 1
fi

# Step 3: Save to Supabase Storage
echo ""
echo "Step 3: Saving video to Supabase Storage..."
USER_ID="test-user-123"  # Replace with actual user ID

SAVE_RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"save\",
    \"gcsUri\": \"$VIDEO_URL\",
    \"userId\": \"$USER_ID\"
  }")

echo "Save Response: $SAVE_RESPONSE"
echo ""

# Extract public URL
PUBLIC_URL=$(echo $SAVE_RESPONSE | jq -r '.publicUrl')
echo "✓ Video saved to Supabase Storage!"
echo "Public URL: $PUBLIC_URL"
echo ""
echo "=== Workflow Complete ==="
