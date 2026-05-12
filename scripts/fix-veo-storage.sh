#!/bin/bash

# Fix VEO Storage Error
# VEO uses Cloudinary for video storage (NOT Supabase Storage, NOT GCS)
# This script ensures correct configuration

set -e

echo "🔧 Fixing VEO Storage Configuration..."
echo "   VEO videos → Cloudinary (NOT Supabase Storage)"
echo

# Check if Cloudinary secrets are configured
echo "🔍 Step 1: Checking Cloudinary configuration..."
echo "   Required secrets:"
echo "   - CLOUDINARY_CLOUD_NAME"
echo "   - CLOUDINARY_API_KEY"
echo "   - CLOUDINARY_API_SECRET"
echo

read -p "   Are Cloudinary secrets already configured? (y/n): " cloudinary_configured

if [[ "$cloudinary_configured" != "y" ]]; then
  echo
  echo "⚠️  Cloudinary NOT configured!"
  echo "   Please set Cloudinary secrets first:"
  echo
  echo "   npx supabase secrets set CLOUDINARY_CLOUD_NAME=your_cloud_name"
  echo "   npx supabase secrets set CLOUDINARY_API_KEY=your_api_key"
  echo "   npx supabase secrets set CLOUDINARY_API_SECRET=your_api_secret"
  echo
  echo "   Get credentials from: https://cloudinary.com/console"
  echo
  exit 1
fi

# Step 2: Unset old/incorrect storage configs
echo
echo "📝 Step 2: Removing old storage configurations..."
npx supabase secrets unset VIDEO_STORAGE_BACKEND 2>/dev/null || true
npx supabase secrets unset SUPABASE_STORAGE_BUCKET 2>/dev/null || true
npx supabase secrets unset GCS_VIDEO_BUCKET 2>/dev/null || true
npx supabase secrets unset VERTEX_VIDEO_BUCKET 2>/dev/null || true
echo "✅ Old configs removed"
echo

# Step 3: Redeploy VEO function
echo "🚀 Step 3: Redeploying veo-generate-video function..."
npx supabase functions deploy veo-generate-video
echo "✅ Function redeployed"
echo

# Step 4: Redeploy Cloudinary processor function
echo "🚀 Step 4: Redeploying cloudinary-process-video function..."
npx supabase functions deploy cloudinary-process-video 2>/dev/null || echo "⚠️  cloudinary-process-video function not found (expected if not deployed yet)"
echo

echo "✅ VEO Storage fix complete!"
echo
echo "📌 Video Storage Architecture:"
echo "   1. VEO generates video → Temporary GCS URL"
echo "   2. Cloudinary downloads from GCS → Processes → Stores"
echo "   3. App receives Cloudinary playback URL"
echo "   4. Only URLs stored in Supabase database (NO video files)"
echo
echo "📌 Next steps:"
echo "   1. Test video generation in your app"
echo "   2. Check logs: npx supabase functions logs veo-generate-video"
echo "   3. Verify videos appear in Cloudinary dashboard"
echo
