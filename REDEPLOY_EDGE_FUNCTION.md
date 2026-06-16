# Redeploy Edge Function for New Pricing

## Issue
The `create-checkout` edge function is returning 500 error because it hasn't picked up the new Stripe price ID environment variables you set in Supabase.

## Solution: Manual Redeploy via Supabase Dashboard

### Method 1: Redeploy via Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/functions

2. Find the `create-checkout` function in the list

3. Click the **"..."** menu (three dots) next to the function

4. Click **"Redeploy"** or **"Deploy"**

5. Wait for deployment to complete (usually 30-60 seconds)

6. Test checkout again on your site

### Method 2: Check Environment Variables

If redeployment doesn't work, verify your environment variables:

1. Go to: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/settings/functions

2. Verify these exist and have the correct values:
   ```
   STRIPE_MONTHLY_PRICE_ID = price_XXXXX (your new $1/month price)
   STRIPE_YEARLY_PRICE_ID = price_XXXXX (your new $10/year price)
   STRIPE_SECRET_KEY = sk_XXXXX (your Stripe secret key)
   SUPABASE_URL = https://gpfccicfqynahflehpqo.supabase.co
   SUPABASE_ANON_KEY = eyJXXXXX... (your anon key)
   ```

3. If any are missing or wrong, fix them and click **Save**

4. Go back to Functions and redeploy `create-checkout`

### Method 3: Deploy via CLI (If Dashboard doesn't work)

If you have Supabase CLI installed:

```bash
cd /Users/marcelo/Documents/Curios
supabase functions deploy create-checkout
```

## Verification

After redeployment:

1. Open browser console (F12)
2. Go to your site
3. Try to upgrade to Premium
4. Check console for errors
5. Should redirect to Stripe checkout with correct $1 or $10 pricing

## Troubleshooting

### Still getting 500 error?

Check edge function logs:
1. Go to: https://supabase.com/dashboard/project/gpfccicfqynahflehpqo/logs/edge-functions
2. Filter by `create-checkout` function
3. Look for the most recent error
4. Check what line is failing

### Common errors:
- `Invalid price configuration` = Environment variables not set correctly
- `No such price` = Price ID doesn't exist in your Stripe account
- `Unauthorized` = STRIPE_SECRET_KEY is wrong

### Quick test of environment variables:

The edge function code at line 123-125 reads:
```typescript
const priceId = interval === 'year'
  ? Deno.env.get('STRIPE_YEARLY_PRICE_ID')
  : Deno.env.get('STRIPE_MONTHLY_PRICE_ID');
```

If this returns empty/null, it throws "Invalid price configuration" error.

## Notes

- Environment variables in Supabase are per-project, not per-function
- Edge functions cache env vars, so redeploy is required after changes
- Frontend doesn't need redeployment (already pushed to Netlify)
