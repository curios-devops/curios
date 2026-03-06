# Quick Start Guide: Testing Reverse Image Search

## 🚀 Before You Start

### 1. Verify Environment Variables
Check `.env` file has:
```bash
VITE_APIFY_API_KEY=your_serp_api_key_here
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 2. Create Supabase Storage Bucket

**Option A: Via Supabase Dashboard**
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/storage/buckets
2. Click "New bucket"
3. Name: `reverse-image-searches`
4. Public bucket: ✅ **Yes** (required for SERP API to access images)
5. Click "Create bucket"

**Option B: Via SQL**
```sql
-- Run in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('reverse-image-searches', 'reverse-image-searches', true);
```

### 3. Set Bucket Permissions
```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'reverse-image-searches');

-- Allow public read access (required for SERP API)
CREATE POLICY "Allow public read" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'reverse-image-searches');

-- Allow users to delete their own uploads
CREATE POLICY "Allow user delete own files" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'reverse-image-searches' AND auth.uid() = owner);
```

---

## 🧪 Testing Scenarios

### Test 1: Text-Only Search (Verify Nothing Broke)
1. Open app: `npm run dev`
2. Enter query: `"Elon Musk"`
3. **Don't** upload any images
4. Click search
5. ✅ **Expected**: Normal Brave search results (as before)

---

### Test 2: Image-Only Search
1. Open app
2. **Don't** enter any text
3. Click the **+** button (attach menu)
4. Select "Images"
5. Upload 1-2 images (e.g., celebrity photo, product image)
6. Notice: Search button is now **enabled** (🎯 key feature!)
7. Click search
8. ✅ **Expected**:
   - Loading indicator appears
   - Status: "Uploading images..." → "Searching by image..."
   - Results page shows:
     - Web links related to the image
     - Related images
     - Generated answer about the image content

**Debug Console Logs to Check**:
```
🔍 Uploading images for reverse search
🔍 Images uploaded successfully
🔍 [RETRIEVER] Image-only search initiated
🔍 [REVERSE IMAGE TOOL] Starting search for: https://...
🔍 [REVERSE IMAGE TOOL] Final results: { web: X, images: Y, ... }
```

---

### Test 3: Combined Text + Image Search
1. Open app
2. Enter query: `"Tesla Model S"`
3. Upload 1 image of a Tesla car
4. Click search
5. ✅ **Expected**:
   - Loading: "Performing combined text and image search..."
   - Results page shows:
     - Web links from BOTH text search AND image search
     - More comprehensive results than either alone
     - No duplicate URLs

**Debug Console Logs to Check**:
```
🔍 [RETRIEVER] Combined search initiated
🔍 [RETRIEVER] Brave tool returned: { webCount: X, ... }
🔍 [REVERSE IMAGE TOOL] Final results: { web: Y, ... }
🔍 Combined search completed: { totalWebResults: X+Y, ... }
```

---

### Test 4: Guest User (3 Image Limit)
1. Sign out (if signed in)
2. Try to upload 4+ images
3. ✅ **Expected**: 
   - Only first 3 images accepted
   - Sign-in modal appears: "Sign in to upload more photos"

---

### Test 5: Error Handling
**Test 5a: Invalid Image Format**
1. Try to upload a PDF or text file
2. ✅ **Expected**: Error message (rejected by file input)

**Test 5b: Oversized Image**
1. Try to upload image >5MB
2. ✅ **Expected**: Error message displayed

**Test 5c: Network Failure**
1. Disable network
2. Try to search with image
3. ✅ **Expected**: Graceful error, no crash

---

## 🐛 Troubleshooting

### Issue: "Supabase Storage upload failed"
**Solution**:
- Check bucket exists: `reverse-image-searches`
- Verify bucket is **public**
- Check VITE_SUPABASE_ANON_KEY is correct

### Issue: "SERP API key not found"
**Solution**:
- Verify `.env` has `VITE_APIFY_API_KEY`
- Restart dev server after adding env variable
- Check API key is valid and has quota remaining

### Issue: "Search button stays disabled with images"
**Check**:
- Console for errors during image upload
- QueryBoxContainer state: `imageAttachments.length > 0`
- ButtonBar props: `isSearchDisabled` should be false

### Issue: "No results from reverse image search"
**Check**:
- Image URL is publicly accessible (test in browser)
- SERP API quota not exceeded
- Image is clear and recognizable (better results with famous landmarks, products, people)

### Issue: "Duplicate results in combined search"
**Check**:
- `deduplicateResults()` is called
- Console log: "After deduplication" should show reduced count
- Writer agent receives unique URLs only

---

## 📊 What to Watch in Console

### Successful Flow Should Show:
```
🔍 [QueryBoxContainer] Uploading images for reverse search { count: 2 }
🔍 [Image Upload] Uploading image to Supabase Storage { fileName: "xxx.jpg", ... }
🔍 [Image Upload] Image uploaded successfully { publicUrl: "https://..." }
🔍 [QueryBoxContainer] Images uploaded successfully { urls: ["https://...", ...] }
🔍 [RETRIEVER] SearchRetrieverAgent executing { hasImages: true, imageCount: 2, hasText: true }
🔍 [RETRIEVER] Combined search initiated { query: "...", imageCount: 2 }
🔍 [RETRIEVER] Brave tool returned { webCount: 10, imageCount: 15, ... }
🔍 [REVERSE IMAGE TOOL] Starting search for: https://...
🔍 [REVERSE IMAGE TOOL] Final results { web: 15, images: 20, ... }
🔍 [RETRIEVER] Combined search completed { totalWebResults: 25, totalImages: 35, ... }
✅ WriterAgent complete: { success: true, hasContent: true }
```

### Error Indicators:
```
❌ Image upload failed { error: "..." }
❌ SERP API reverse image search error { status: 401, ... }
❌ Both Brave and Apify failed { braveError: "...", apifyError: "..." }
```

---

## 📈 Performance Expectations

### Text-Only Search:
- Time: ~2-4 seconds (unchanged)

### Image-Only Search:
- Image upload: ~500ms-1s per image
- SERP API call: ~2-3 seconds
- Total: ~3-5 seconds for 1-2 images

### Combined Search:
- Image upload: ~500ms-1s
- Parallel searches: ~3-4 seconds (both run simultaneously!)
- Merging: <100ms
- Total: ~4-6 seconds
- **Note**: NOT 6-8 seconds (would be if sequential)

---

## ✅ Success Checklist

Before marking Task 9 complete, verify:

- [ ] Text-only search works (existing functionality preserved)
- [ ] Image-only search returns relevant results
- [ ] Combined search merges results from both sources
- [ ] Search button enables when images present (even without text)
- [ ] Guest users limited to 3 images
- [ ] Image upload errors handled gracefully
- [ ] SERP API errors don't crash the app
- [ ] No duplicate URLs in results
- [ ] Writer agent generates comprehensive articles
- [ ] Results page displays all result types (sources, images, videos)
- [ ] Console logs show correct flow
- [ ] No TypeScript errors in console
- [ ] No infinite loops or memory leaks

---

## 🎯 Quick Test Commands

```bash
# Start dev server
npm run dev

# Check environment variables
echo $VITE_APIFY_API_KEY
echo $VITE_SUPABASE_URL

# Check TypeScript errors
npx tsc --noEmit

# Check for common issues
grep -r "imageUpload" src/
grep -r "reverseImageSearchTool" src/
```

---

## 📞 Need Help?

Common questions:
1. **"Which API key for SERP?"** - Use VITE_APIFY_API_KEY (same as Apify fallback)
2. **"Bucket public or private?"** - PUBLIC (SERP API needs to access uploaded images)
3. **"How many images?"** - Guests: 3, Authenticated: 5
4. **"Which image is used?"** - First image for reverse search, others are ignored for now
5. **"Can I test without SERP API?"** - No, but you can test text-only search flow

---

**Ready to test? Start with Test 1 (Text-Only) to verify nothing broke!** 🚀
