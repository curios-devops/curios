# 🧪 Two-Stage SERP API Testing

## 🎯 Purpose
Isolate and test each part of the image search workflow independently:
1. **SERP API functionality** (with known-good public image)
2. **Supabase Upload → Public URL → SERP API** (full workflow)

---

## 🚀 How to Use

**Open**: http://localhost:5173/serp-test

You'll see two buttons:

### ✅ Test 1: Public Image
- **What it does**: Tests SERP API with official example image (`https://i.imgur.com/5bGzZi7.jpg`)
- **Purpose**: Verify the Edge Function and SERP API work correctly
- **Expected**: Should return web results, images, and related searches
- **Isolates**: SERP API Edge Function only

### 📤 Test 2: Upload → SERP
- **What it does**: 
  1. Uploads local `Elon Musk.png` to Supabase Storage
  2. Gets public URL from Supabase
  3. Calls SERP API with that URL
- **Purpose**: Verify the complete upload → search workflow
- **Expected**: Same as Test 1, but with uploaded image
- **Isolates**: Full workflow (upload + SERP API)

---

## 📊 Expected Output

### Test 1: Public Image
```
🔍 TEST 1: Public Image (Official SERP API Example)
Image URL: https://i.imgur.com/5bGzZi7.jpg
This tests the SERP API Edge Function with a known-good public image

Edge Function: https://gpfccicfqynahflehpqo.supabase.co/functions/v1/reverse-image-search
Anon Key: ✅ Present

📋 Direct SERP API URL (what Edge Function calls):
https://serpapi.com/search.json?engine=google_reverse_image&image_url=https%3A%2F%2Fi.imgur.com%2F5bGzZi7.jpg&api_key=...

📡 Calling Edge Function...
⏱️  Response time: 1500ms
📊 Status: 200 OK

✅ Response received successfully!

📋 Results Summary:
- Web results: 15
- Images: 20
- Related searches: 5

🌐 First 3 Web Results:
1. [Result Title]
   URL: https://...
   Content: ...
```

### Test 2: Upload → SERP
```
🔍 TEST 2: Upload to Supabase → Get Public URL → SERP API
Step 1: Uploading Elon Musk image to Supabase Storage...

✅ Image fetched: 45678 bytes, type: image/png
📤 Uploading to Supabase: uploads/test-1234567890.png
✅ Upload successful: uploads/test-1234567890.png
✅ Public URL: https://gpfccicfqynahflehpqo.supabase.co/storage/v1/object/public/reverse-image-searches/uploads/test-1234567890.png

Step 2: Calling SERP API with Supabase URL...

Edge Function: https://gpfccicfqynahflehpqo.supabase.co/functions/v1/reverse-image-search
Anon Key: ✅ Present

📋 Direct SERP API URL (what Edge Function calls):
https://serpapi.com/search.json?engine=google_reverse_image&image_url=https%3A%2F%2Fgpfccicfqynahflehpqo.supabase.co%2Fstorage%2F...

📡 Calling Edge Function...
⏱️  Response time: 1800ms
📊 Status: 200 OK

✅ Response received successfully!

📋 Results Summary:
- Web results: 12
- Images: 18
- Related searches: 4

🌐 First 3 Web Results:
1. Elon Musk - Wikipedia
   URL: https://en.wikipedia.org/wiki/Elon_Musk
   Content: Elon Reeve Musk is a businessman...
```

---

## 🔍 What Each Test Verifies

### Test 1 Verifies:
- ✅ Edge Function deployed correctly
- ✅ SERP API key valid
- ✅ Authorization header working
- ✅ Response parsing working
- ✅ SERP API accessible from Edge Function

### Test 2 Verifies:
- ✅ Supabase Storage upload working
- ✅ Public URL generation working
- ✅ RLS policies allowing uploads
- ✅ Supabase URLs accessible from SERP API
- ✅ Complete workflow end-to-end

---

## 🐛 Troubleshooting

### Test 1 Fails (Public Image)
**Problem**: Edge Function or SERP API issue

**Check**:
1. SERP API key valid? https://serpapi.com/dashboard
2. Edge Function deployed? `supabase functions list`
3. Edge Function logs: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/functions/reverse-image-search/logs

### Test 1 Succeeds, Test 2 Fails at Upload
**Problem**: Supabase Storage issue

**Check**:
1. Bucket exists? `reverse-image-searches`
2. RLS policies allow uploads?
3. Anon key valid in `.env`?

### Test 1 Succeeds, Test 2 Fails at SERP API
**Problem**: Supabase URL not accessible from SERP servers

**Check**:
1. Bucket is public?
2. URL format correct?
3. Copy SERP URL from logs and test in browser

### Both Tests Return Empty Results
**Problem**: SERP API quota or key issue

**Check**:
1. SERP API dashboard: https://serpapi.com/dashboard
2. Quota remaining?
3. API key still valid?

---

## ✅ Success Criteria

Both tests should:
- ✅ Return 200 OK status
- ✅ Return web results (10+)
- ✅ Return images (10+)
- ✅ Return related searches (3+)
- ✅ Complete in under 3 seconds

If both pass → Image search feature is ready! 🎉

---

## 🎯 Next Steps

Once both tests pass:

1. **Test the main workflow**: http://localhost:5173
2. Upload an image (no text)
3. Click Search
4. Verify:
   - Image uploads to Supabase ✅
   - SERP API called with Supabase URL ✅
   - OpenAI synthesis displayed ✅
   - Sources shown ✅

---

**Created**: 2025-10-20  
**Test URL**: http://localhost:5173/serp-test  
**Files**: `src/pages/SerpApiTest.tsx`
