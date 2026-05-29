# Manual Edge Function Deployment

The Supabase CLI has compatibility issues with your macOS version. Here's how to deploy manually:

## Option 1: Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Edge Functions**
4. Find `fetch-openai` function
5. Click **"Redeploy from Git"** or **"Deploy"**
6. Select the `main` branch
7. Wait for deployment to complete

## Option 2: Update Supabase CLI

```bash
# Uninstall old version
brew uninstall supabase

# Install latest version
brew install supabase/tap/supabase

# Verify version
supabase --version

# Deploy
cd supabase/functions
supabase functions deploy fetch-openai
```

## Option 3: GitHub Actions (If Available)

If your repo has GitHub Actions set up for Supabase, pushing to `main` should auto-deploy.

## After Deployment

Test the streaming by:
1. Clear browser cache
2. Go to `/fast-search?q=test`
3. Check browser console for new debug logs
4. **Check Supabase logs** for server-side stream events:
   - `[STREAM] Event without content: type=response.created`
   - `[STREAM] Forwarding content chunk: type=response.output_text.delta, length=XX`
   - `[STREAM] Response completed, sending [DONE]`

## Viewing Server Logs

In Supabase Dashboard:
1. Go to **Logs** → **Edge Functions**
2. Select `fetch-openai`
3. Watch logs in real-time while testing

The logs will show exactly what OpenAI is sending and help us debug the streaming issue.
