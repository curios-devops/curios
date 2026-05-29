# Deploy VEO Function Manually

Since the Supabase CLI is not working on your system, deploy via the Supabase Dashboard:

## Steps

### 1. Open Supabase Dashboard
https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/functions

### 2. Find `veo-generate-video` function
Click on the existing `veo-generate-video` function

### 3. Replace the code
Copy the entire content from:
`supabase/functions/veo-generate-video/index.ts`

### 4. Deploy
Click "Deploy" or "Save" button

## What Changed

Added debug logging to understand why VEO polling gets stuck:

```typescript
// Line 193 - Added logging to see raw VEO API response
console.log('[VEO checkStatus] Raw response:', JSON.stringify(data, null, 2));
```

This will help us see:
- What the VEO API is actually returning
- Why `data.done` might not be true
- What structure the response has

## After Deployment

1. Try generating a cinematic video again
2. Check Supabase function logs to see the VEO response
3. Share the logs to diagnose the issue

## Alternative: Use Supabase Web Editor

1. Go to https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/functions
2. Click "New Function" or edit existing "veo-generate-video"
3. Paste the code from `supabase/functions/veo-generate-video/index.ts`
4. Click Deploy

## Quick Fix Without Deployment

If you can't deploy, the client-side logging I added will still help:

The updated `cinematicService.ts` now logs:
- When polling starts
- Each polling attempt
- What status is received
- If/when it times out

Check your browser console for these logs starting with `[CinematicService]`.
