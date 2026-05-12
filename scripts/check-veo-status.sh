#!/bin/bash
# Quick script to check Veo operation status

OPERATION_ID="projects/curios-vertex/locations/us-central1/publishers/google/models/veo-3.1-generate-001/operations/d6939894-56f0-4376-b366-b94c562ca17a"

echo "Checking Veo operation status..."
echo "Operation: $OPERATION_ID"
echo ""

curl -X POST 'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/veo-generate-video' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2MjEwNzMsImV4cCI6MjA1NDE5NzA3M30.vPdI0gZdKm28jbfmU3r6tPaRBMm-g-VWKPTn5-UMoOM' \
  -H 'Content-Type: application/json' \
  -d "{
    \"action\": \"check\",
    \"operationName\": \"$OPERATION_ID\"
  }" | jq '.'

echo ""
echo "If done=false, wait 30 seconds and run this script again."
echo "If done=true, copy the videoUrl for the next step."
