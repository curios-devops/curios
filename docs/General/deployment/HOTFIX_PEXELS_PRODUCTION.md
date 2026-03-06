# 🚨 HOTFIX: Pexels API Key Missing in Production

**Date:** February 11, 2026  
**Status:** ❌ **BLOCKING PRODUCTION**

---

## 🔥 Problem

Video generation failing in production with error:
```
[InputManager] Pexels no configurado
[InputManager] ⚠️ Todas las fuentes insuficientes, usando placeholders
```

Also:
```
POST .../storage/v1/object/videos/... 400 (Bad Request)
```

---

## 🛠️ IMMEDIATE FIX (Manual)

### Step 1: Add Pexels API Key to Netlify

1. Go to: https://app.netlify.com/sites/YOUR_SITE/settings/deploys#environment

2. Add environment variable:
   - **Key:** `VITE_PEXELS_API_KEY`
   - **Value:** `qZJZQy2z9xJYxrnlq9l20GCZXB3LFvuctVu9EvvR2SJ5BBrlob44N4No`

3. Click "Save"

4. Trigger redeploy:
   - Go to: https://app.netlify.com/sites/YOUR_SITE/deploys
   - Click "Trigger deploy" → "Clear cache and deploy site"

5. Wait ~2 minutes

6. Test at: https://curiosai.com

---

### Step 2: Fix Supabase Storage Bucket (if needed)

The 400 error might be because the `videos` bucket doesn't exist or has wrong permissions.

**Check bucket:**
1. Go to: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/storage/buckets
2. Verify `videos` bucket exists
3. Check permissions:
   - Public: `false` (videos should be private)
   - File size limit: 50 MB
   - Allowed MIME types: `video/*`

**If bucket doesn't exist, create it:**
```sql
-- Run in SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', false);

-- Add policy for authenticated uploads
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos');

-- Add policy for authenticated reads
CREATE POLICY "Authenticated users can read videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'videos');
```

---

## 🚀 LONG-TERM SOLUTION (Better Architecture)

Implement **ImageAssignmentAgent** (already coded):
- 1 búsqueda amplia de Brave (no Pexels needed)
- Filtro inteligente
- Scoring heurístico
- Distribución inteligente por LLM

**Status:** Agent coded in `src/services/studio/agents/ImageAssignmentAgent.ts`

**Next steps:**
1. Integrate agent into InputManager
2. Remove Pexels dependency
3. Test locally
4. Deploy

**ETA:** ~30 minutes

---

## ✅ Verification Checklist

After applying hotfix:

- [ ] Netlify shows `VITE_PEXELS_API_KEY` in env vars
- [ ] Redeploy completed successfully
- [ ] Test query: "¿Por qué el cielo es azul?"
- [ ] Video generates without Pexels warning
- [ ] Video uploads to Supabase Storage (no 400 error)
- [ ] Video download works

---

## 📞 If Still Failing

Check these logs in production:

**Browser Console:**
```javascript
// Verify Pexels is configured
console.log(import.meta.env.VITE_PEXELS_API_KEY ? 'Pexels OK' : 'Pexels MISSING');
```

**Netlify Build Logs:**
- Look for environment variable injection
- Should see: `VITE_PEXELS_API_KEY` in build output

**Supabase Storage Logs:**
- Go to: https://supabase.com/dashboard/project/PROJECT_ID/logs/explorer
- Filter by: `storage`
- Look for 400 errors with details

---

**Priority:** 🔴 **CRITICAL** - Blocks all video generation in production
