# CuriosAI Deployment Guide

## Environment Variables Setup

### Netlify Environment Variables (Frontend - VITE_ prefix)

Add these variables to Netlify Dashboard → Site Settings → Environment Variables:

```
# OpenAI API Configuration
VITE_OPENAI_API_URL=https://your-project-id.supabase.co/functions/v1/fetch-openai

# Search Service APIs
VITE_RAPIDAPI_KEY=your_rapidapi_key_here
VITE_TAVILY_API_KEY=your_tavily_api_key_here
VITE_APIFY_API_KEY=your_apify_api_key_here

# Stripe Configuration (Frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
VITE_STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
VITE_STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
VITE_STRIPE_MONTHLY_PRICE_ID=price_your_monthly_price_id
VITE_STRIPE_YEARLY_PRICE_ID=price_your_yearly_price_id

# Supabase Configuration (Frontend)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Open Graph / Social Media
VITE_OG_TITLE=CuriosAI Web Search - Advanced AI-powered search
VITE_OG_DESCRIPTION=Get comprehensive search results with AI-powered insights, images, and analysis from multiple sources. Discover information faster with our intelligent search engine.
VITE_OG_IMAGE=https://yourdomain.com/og-image.svg
VITE_OG_URL=https://yourdomain.com
VITE_OG_SITE_NAME=CuriosAI
VITE_TWITTER_SITE=@YourTwitterHandle
```

### Supabase Edge Function Secrets (Backend - NO VITE_ prefix)

These are already configured in Supabase Dashboard → Settings → Edge Functions → Secrets:

```
# OpenAI Configuration (Backend)
OPENAI_API_KEY=sk-proj-your_openai_api_key
OPENAI_ORG_ID=org-your_org_id
OPENAI_PROJECT_ID=proj_your_project_id
PROJECT_ID=proj_your_project_id

# Search APIs (Backend)
BRAVE_API_KEY=your_brave_api_key

# Stripe Configuration (Backend)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_MONTHLY_PRICE_ID=price_your_monthly_price_id
STRIPE_YEARLY_PRICE_ID=price_your_yearly_price_id

# Supabase Configuration (Backend)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_DB_URL=your_database_url
```

## Quick Deploy Instructions

### 1. Development Setup
```bash
# Start development environment
npm run dev

# Stop development environment  
npm run dev:stop
```

### 2. Deploy to Production

#### Step 1: Commit Changes
```bash
git add .
git commit -m "Update: [describe your changes]"
git push
```

#### Step 2: Verify Environment Variables
- **Netlify**: Ensure all `VITE_` variables are set
- **Supabase**: Ensure all backend secrets are configured

#### Step 3: Deploy Supabase Edge Functions
```bash
# Make sure Docker is running
supabase functions deploy fetch-openai
supabase functions deploy brave-web-search  
supabase functions deploy brave-images-search
supabase functions deploy stripe-webhook
supabase functions deploy social-share
supabase functions deploy social-og-image
supabase functions deploy social-share-search
```

#### Step 4: Deploy Frontend
- Netlify automatically deploys on git push
- Monitor deployment at Netlify Dashboard

#### Step 5: Verify Deployment
1. Visit `https://yourdomain.com/debug-env.html`
2. Check that `import.meta.env available: Yes`
3. Verify all required `VITE_` variables are present
4. Test OpenAI API call functionality

## Troubleshooting Production Issues

### Environment Variables Not Available
- **Symptom**: `import.meta.env available: No` in debug tool
- **Solution**: Add missing `VITE_` variables to Netlify
- **Test**: Use debug tool at `/debug-env.html`

### OpenAI API Calls Hanging/Freezing
- **Symptom**: App freezes after "WriterAgent: Calling OpenAI" log
- **Solution**: Verify `VITE_OPENAI_API_URL` is set in Netlify
- **Test**: Use "Test OpenAI Call" button in debug tool

### Images Not Loading in Search Results
- **Symptom**: Web results work but no images appear
- **Solution**: Check Supabase `BRAVE_API_KEY` is configured
- **Test**: Check Supabase function logs

## Debug Tools

### Environment Variables Debug Tool
Visit `/debug-env.html` in production to:
- Check if environment variables are properly injected
- Test OpenAI API connectivity
- Download environment report for troubleshooting

### Supabase Function Logs
```bash
supabase functions logs fetch-openai
supabase functions logs brave-web-search
supabase functions logs brave-images-search
```

## Security Notes

**✅ Safe to expose (VITE_ prefix):**
- API URLs, publishable keys, configuration values

**❌ Never expose in frontend:**
- API keys without VITE_ prefix
- Secret keys, private keys, service role keys
- OAuth client secrets

**Architecture:**
- Frontend → Calls Supabase Edge Functions (secure proxy)
- Edge Functions → Call external APIs with secret keys
- This keeps sensitive keys secure on the backend