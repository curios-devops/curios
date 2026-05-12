# Setup TTS Secrets for Cinematic Videos

**Status:** 🔧 Configuration Required
**Date:** 2026-04-18
**Issue:** Missing TTS API keys in Supabase causing narration failures

## Problem

Both ElevenLabs and OpenAI TTS edge functions are failing because the API keys are not configured in Supabase Secrets. The keys exist in your local `.env` but edge functions run on Supabase's servers and need the keys set there.

### Error Symptoms
- ✅ Videos generate successfully
- ❌ No narration/audio in cinematic videos
- ⚠️ Console warnings about TTS failures
- ⚠️ Falls back silently but no audio plays

## Solution

### Option 1: Via Supabase Dashboard (Recommended - Works Now!)

1. **Go to Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/settings/secrets
   ```

2. **Add ElevenLabs API Key:**
   - Click "New Secret"
   - Name: `ELEVENLAB_API_KEY` (without the S!)
   - Value: `<your-elevenlabs-api-key>`
   - Click "Save"

3. **Add OpenAI API Key:**
   - Click "New Secret"
   - Name: `OPENAI_API_KEY`
   - Value: `<your-openai-api-key>`
   - Click "Save"

4. **Redeploy Edge Functions:**
   After adding secrets, redeploy both functions:
   ```bash
   npm run deploy:elevenlabs-tts
   npm run deploy:openai-tts
   ```

### Option 2: Via Supabase CLI (If you fix CLI compatibility)

```bash
cd /Users/marcelo/Documents/Curios
chmod +x scripts/setup-tts-secrets.sh
./scripts/setup-tts-secrets.sh
```

## Required Secrets

| Secret Name | Description | Current Value (from .env) |
|------------|-------------|---------------------------|
| `ELEVENLAB_API_KEY` | ElevenLabs TTS API key (primary) | `sk_78f067ad...` |
| `OPENAI_API_KEY` | OpenAI TTS API key (fallback) | `sk-proj-FpYBG...` |

## How TTS Works in Cinematic

1. **Primary:** ElevenLabs TTS
   - Voice: Sarah (Mature, Reassuring, Confident)
   - Model: `eleven_multilingual_v2`
   - Format: MP3 at 44.1kHz, 128kbps

2. **Fallback:** OpenAI TTS
   - Voice: Alloy
   - Model: `tts-1-hd`
   - Format: MP3

3. **Flow:**
   ```
   NarrationService → Try ElevenLabs → Success ✅
                   ↓ (if fails)
                   → Try OpenAI → Success ✅
                   ↓ (if fails)
                   → Error (no audio) ❌
   ```

## Testing After Setup

1. **Generate a cinematic video:**
   ```
   https://curiosai.com/cinematic-results?q=How does photosynthesis work?
   ```

2. **Verify:**
   - ✅ Videos play with visuals
   - ✅ Audio narration plays
   - ✅ No TTS errors in console
   - ✅ Check which provider was used (ElevenLabs or OpenAI)

## Troubleshooting

### ElevenLabs 401 Error
If you see `ElevenLabs account restricted for free-tier usage`:
- Your ElevenLabs account may have hit quota limits
- The system will automatically fall back to OpenAI TTS
- Consider upgrading ElevenLabs plan or using OpenAI TTS

### OpenAI TTS Error
If you see `OpenAI API key not configured`:
- Verify the key is set in Supabase Secrets
- Redeploy the `openai-tts` edge function
- Check OpenAI account has credits

### Both Fail
If both providers fail:
- Check API keys are valid and have credits
- Verify keys are set in Supabase Secrets (not just local .env)
- Check Supabase logs for detailed errors

## File References

- [NarrationService.ts](../../../src/services/cinematic/audio/NarrationService.ts) - TTS orchestration
- [elevenlabs-tts/index.ts](../../../supabase/functions/elevenlabs-tts/index.ts) - ElevenLabs edge function
- [openai-tts/index.ts](../../../supabase/functions/openai-tts/index.ts) - OpenAI edge function
- [.env](.env) - Local environment variables (not used by edge functions!)

## Important Notes

⚠️ **Edge functions do NOT read from `.env`**
- Local `.env` is only for local development
- Edge functions run on Supabase servers
- Must use Supabase Secrets for edge function environment variables

⚠️ **After adding secrets, always redeploy**
- Secrets are injected at deployment time
- Changing a secret requires redeploying the function

✅ **Secret naming is case-sensitive**
- Use `ELEVENLAB_API_KEY` (no S!) for ElevenLabs
- Use `OPENAI_API_KEY` for OpenAI

## Quick Fix Command

Once CLI is working, run:
```bash
# Set both secrets at once
echo "<your-elevenlabs-api-key>" | \
  supabase secrets set ELEVENLAB_API_KEY

echo "<your-openai-api-key>" | \
  supabase secrets set OPENAI_API_KEY

# Redeploy both functions
npm run deploy:elevenlabs-tts
npm run deploy:openai-tts
```

## Summary

✅ **Root Cause:** API keys not in Supabase Secrets
✅ **Fix:** Add secrets via dashboard or CLI
✅ **Test:** Generate cinematic video and verify audio plays
