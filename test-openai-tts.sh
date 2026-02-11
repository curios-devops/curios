#!/bin/bash
curl -X POST "https://gpfccicfqynahflehpqo.supabase.co/functions/v1/openai-tts" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUxNDIyMDYsImV4cCI6MjA1MDcxODIwNn0.wLnIXxThhq144sQpUFzLd_ifimgr1oetMwvchDmMF84" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZmNjaWNmcXluYWhmbGVocHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUxNDIyMDYsImV4cCI6MjA1MDcxODIwNn0.wLnIXxThhq144sQpUFzLd_ifimgr1oetMwvchDmMF84" \
  -d '{"text":"Hello world test","voice":"alloy"}' \
  -w "\nHTTP Status: %{http_code}\n"
