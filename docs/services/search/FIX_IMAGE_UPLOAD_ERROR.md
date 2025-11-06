# Fix: 400 Bad Request on Image Upload

## Problem
```
POST https://gpfccicfqynahflehpqo.supabase.co/storage/v1/object/reverse-image-searches/uploads/xxx.png 400 (Bad Request)
```

This means the **`reverse-image-searches` bucket doesn't exist** in your Supabase Storage.

---

## Solution: Create the Supabase Storage Bucket

### Option 1: Via Supabase Dashboard (Easiest) ⭐

1. **Go to Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/storage/buckets
   ```
   (Replace `gpfccicfqynahflehpqo` with your project ID if different)

2. **Click "New bucket"** (green button top right)

3. **Configure the bucket**:
   - **Name**: `reverse-image-searches` (exact name, no spaces)
   - **Public bucket**: ✅ **YES** (toggle ON - required for SERP API)
   - **File size limit**: `5242880` (5MB in bytes) - optional
   - **Allowed MIME types**: Leave empty or add `image/png, image/jpeg` - optional

4. **Click "Create bucket"**

5. **Done!** Try uploading an image in your app again.

---

### Option 2: Via SQL Editor (Advanced)

1. Go to: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/sql/new

2. Copy and paste this SQL:
   ```sql
   -- Create the bucket
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES (
     'reverse-image-searches',
     'reverse-image-searches',
     true,
     5242880,
     ARRAY['image/png', 'image/jpeg', 'image/jpg']
   )
   ON CONFLICT (id) DO NOTHING;

   -- Drop existing policies if they exist (to allow re-running this script)
   DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
   DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
   DROP POLICY IF EXISTS "Allow anonymous uploads" ON storage.objects;

   -- Allow authenticated users to upload
   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects
   FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'reverse-image-searches');

   -- Allow public read (required for SERP API)
   CREATE POLICY "Allow public read"
   ON storage.objects
   FOR SELECT
   TO public
   USING (bucket_id = 'reverse-image-searches');

   -- Allow anonymous uploads (for guest users)
   CREATE POLICY "Allow anonymous uploads"
   ON storage.objects
   FOR INSERT
   TO anon
   WITH CHECK (bucket_id = 'reverse-image-searches');
   ```

3. Click **"Run"**

4. Verify it worked:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'reverse-image-searches';
   ```

---

### Option 3: Test from Browser Console

1. Open your app: `http://localhost:5173`

2. Open browser console (F12)

3. Run:
   ```javascript
   // Check if bucket exists
   const { data, error } = await supabase.storage.listBuckets();
   console.log('Buckets:', data);
   
   // Look for 'reverse-image-searches' in the list
   const exists = data?.find(b => b.id === 'reverse-image-searches');
   console.log('Bucket exists?', !!exists);
   ```

4. If it doesn't exist, create it using **Option 1** above.

---

## Verify It Works

1. Refresh your app: `http://localhost:5173`

2. Click the **+** button → Select "Images"

3. Upload a test image

4. Check console - you should see:
   ```
   ✅ Uploading image to Supabase Storage { fileName: "xxx.png", ... }
   ✅ Image uploaded successfully { publicUrl: "https://..." }
   ```

5. If still failing, check console for specific error message.

---

## Common Issues

### "Bucket not found"
- **Solution**: Create bucket using Option 1 above

### "New row violates row-level security policy"
- **Solution**: Run the SQL policies from Option 2

### "Anonymous access is disabled"
- **Solution**: Enable anonymous uploads using the SQL policy for `anon` role

### "File size too large"
- **Solution**: Image is >5MB. Resize or compress the image first.

---

## Quick Checklist

After creating the bucket, verify:

- ✅ Bucket name is exactly: `reverse-image-searches`
- ✅ Bucket is **public** (toggle is ON)
- ✅ You can see it in: Storage → Buckets → reverse-image-searches
- ✅ App console shows successful upload
- ✅ You can see uploaded files in Supabase Dashboard

---

## Next Steps

Once bucket is created and working:

1. ✅ Test image-only search (upload image, no text)
2. ✅ Test combined search (upload image + enter text)
3. ✅ Verify SERP API returns results

**Need help?** Check the full SQL script at: `/scripts/setup-supabase-bucket.sql`
