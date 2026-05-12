#!/bin/bash

# Deploy the fixed cloudinary-process-video edge function
# This fixes the duplicate folder path issue causing 400 errors

echo "🚀 Deploying cloudinary-process-video edge function..."
echo ""
echo "Fix applied: Removed duplicate CLOUDINARY_FOLDER prefix in publicId"
echo "This resolves the 'cinematic/veo/cinematic/veo' duplication issue"
echo ""

supabase functions deploy cloudinary-process-video --no-verify-jwt

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Deployment successful!"
  echo ""
  echo "The fix will resolve:"
  echo "  - Cloudinary 400 errors with malformed URLs"
  echo "  - Duplicate folder paths in public IDs"
  echo "  - Scene stitching/concat failures"
  echo ""
  echo "Please test by generating a new cinematic video."
else
  echo ""
  echo "❌ Deployment failed. Please check the error above."
  echo ""
  echo "If you see a symbol not found error, try updating Supabase CLI:"
  echo "  brew upgrade supabase/tap/supabase"
  echo ""
  echo "Or use the Supabase dashboard to deploy manually:"
  echo "  1. Go to https://app.supabase.com/project/_/functions"
  echo "  2. Find cloudinary-process-video function"
  echo "  3. Update the code at supabase/functions/cloudinary-process-video/index.ts"
fi
