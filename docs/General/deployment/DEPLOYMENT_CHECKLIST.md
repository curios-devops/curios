# Cinematic Video Fixes - Deployment Checklist

**Date:** 2026-04-18
**Estimated Time:** 15-20 minutes

## Pre-Deployment

### 1. Create Cloudinary Account (5 min)

- [ ] Go to https://cloudinary.com/users/register_free
- [ ] Sign up for free account (25 GB storage, 25 GB bandwidth)
- [ ] Verify email
- [ ] Copy credentials from dashboard:
  - [ ] Cloud Name: `_______________`
  - [ ] API Key: `_______________`
  - [ ] API Secret: `_______________`

### 2. Configure Supabase Secrets (5 min)

Go to: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/settings/secrets

Add these secrets:

- [ ] `CLOUDINARY_CLOUD_NAME` = `<your-cloud-name>`
- [ ] `CLOUDINARY_API_KEY` = `<your-api-key>`
- [ ] `CLOUDINARY_API_SECRET` = `<your-api-secret>`
- [ ] `ELEVENLAB_API_KEY` = `<your-elevenlabs-api-key>`
- [ ] `OPENAI_API_KEY` = `<your-openai-api-key>`
- [ ] `PIXABAY_API_KEY` = (you mentioned already added ✅)

## Deployment (5 min)

### Option A: Quick Script (Recommended)

```bash
cd /Users/marcelo/Documents/Curios
./scripts/deploy-cinematic-fixes.sh
```

### Option B: Manual Deploy

```bash
cd /Users/marcelo/Documents/Curios

supabase functions deploy veo-generate-video
supabase functions deploy cloudinary-process-video
supabase functions deploy elevenlabs-tts
supabase functions deploy openai-tts
```

### Verify Deployment

- [ ] Check Supabase Functions Dashboard
- [ ] All functions show "Deployed" status
- [ ] Latest timestamp visible

## Testing (5 min)

### 1. Basic Test

- [ ] Open: `https://curiosai.com/cinematic-results?q=How do magnets work?`
- [ ] Wait for generation (2-3 minutes)
- [ ] Videos load and play
- [ ] Audio narration plays

### 2. Console Check

Open browser DevTools → Console, verify:

- [ ] ✅ `[VEO Save] Skipping Supabase Storage, using Cloudinary directly`
- [ ] ✅ `[VEO Save] Video uploaded to Cloudinary successfully`
- [ ] ✅ `[NarrationService] TTS generated successfully`
- [ ] ❌ No 546 errors
- [ ] ❌ No TTS errors

### 3. Cloudinary Dashboard

- [ ] Go to https://cloudinary.com/console/media_library
- [ ] See uploaded videos in `cinematic/veo/` folder
- [ ] Video size reasonable (2-5 MB)

### 4. Supabase Logs

- [ ] Go to: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/logs/edge-functions
- [ ] Filter: `veo-generate-video`
- [ ] See success logs, no errors

## Validation

### Required Outcomes

- [ ] Cinematic videos generate without 546 errors
- [ ] Videos load from Cloudinary (check Network tab)
- [ ] Audio narration works (ElevenLabs or OpenAI)
- [ ] Cloudinary dashboard shows videos
- [ ] Console shows no critical errors

### Performance Check

- [ ] Video load time: < 2 seconds
- [ ] Video file size: 2-5 MB (down from 5-10 MB)
- [ ] Generation completes: 2-3 minutes
- [ ] No memory/timeout errors

## Troubleshooting

### Issue: "Cloudinary credentials not configured"

**Fix:**
1. Verify secrets in Supabase dashboard
2. Redeploy: `supabase functions deploy veo-generate-video`
3. Check secret names (case-sensitive)

### Issue: Still seeing 546 errors

**Fix:**
1. Clear browser cache
2. Force redeploy: `supabase functions deploy veo-generate-video --no-verify-jwt`
3. Check function version in dashboard

### Issue: No audio

**Fix:**
1. Check `ELEVENLAB_API_KEY` in Supabase secrets
2. Check `OPENAI_API_KEY` in Supabase secrets
3. Redeploy TTS functions
4. Check ElevenLabs account at https://elevenlabs.io

### Issue: Pixabay warning

**Fix:**
Add `PIXABAY_API_KEY` to Supabase secrets

## Post-Deployment Monitoring (24h)

### Day 1 Checks

- [ ] **Hour 1:** Generate 3 test videos, verify all working
- [ ] **Hour 4:** Check Cloudinary usage (should be < 100 MB)
- [ ] **Hour 12:** Check Supabase logs for any errors
- [ ] **Hour 24:** Review user feedback, generation success rate

### Cloudinary Usage Monitor

Check daily: https://cloudinary.com/console/usage

- **Storage:** Should grow ~5 MB per video
- **Bandwidth:** ~5 MB per video view
- **Transformations:** 2 per video

**Free Tier Limits:**
- Storage: 25 GB (~5,000 videos)
- Bandwidth: 25 GB/month (~5,000 views)
- Transformations: 25,000/month

### Alert Thresholds

Monitor and alert if:
- [ ] 546 errors reappear
- [ ] TTS failures > 5%
- [ ] Video generation failures > 10%
- [ ] Cloudinary usage > 80% of free tier

## Success Metrics

Deployment successful when:

- [x] Zero 546 errors in 24 hours
- [x] TTS success rate > 95%
- [x] Video generation success rate > 90%
- [x] Average load time < 2 seconds
- [x] User feedback positive

## Rollback (If Needed)

If critical issues:

```bash
# Rollback VEO function
cd /Users/marcelo/Documents/Curios
git checkout HEAD~1 -- supabase/functions/veo-generate-video/index.ts
supabase functions deploy veo-generate-video

# Or restore from Supabase dashboard
# Functions → veo-generate-video → Version History → Restore
```

## Documentation

Reference docs created:

- [ ] [CINEMATIC_FIX_SUMMARY.md](CINEMATIC_FIX_SUMMARY.md) - Overview
- [ ] [docs/General/guides/SETUP_CLOUDINARY.md](docs/General/guides/SETUP_CLOUDINARY.md) - Cloudinary setup
- [ ] [docs/General/guides/SETUP_TTS_SECRETS.md](docs/General/guides/SETUP_TTS_SECRETS.md) - TTS configuration
- [ ] [docs/General/deployment/DEPLOY_CINEMATIC_FIX.md](docs/General/deployment/DEPLOY_CINEMATIC_FIX.md) - Full deployment guide

## Sign-Off

Deployment completed by: `_______________`
Date: `_______________`
Time: `_______________`

All checks passed: [ ] Yes [ ] No
Issues encountered: `_______________`
Notes: `_______________`

---

**Status:** Ready to Deploy 🚀
