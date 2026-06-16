# Deploy New Subscription Pricing ($1/month, $10/year)

## Current Error
The checkout is failing with 500 error because the Stripe price IDs in Supabase environment variables still point to the old $5/month and $60/year prices.

## Steps to Fix

### 1. Create New Stripe Prices

Go to your Stripe Dashboard: https://dashboard.stripe.com/products

**For Monthly Plan ($1/month):**
1. Find your existing product (or create new one called "Premium Monthly")
2. Click "Add another price"
3. Configure:
   - Price: $1.00 USD
   - Billing period: Monthly
   - Recurring
4. Save and **copy the Price ID** (starts with `price_...`)

**For Yearly Plan ($10/year):**
1. Find your existing product (or create new one called "Premium Yearly")
2. Click "Add another price"
3. Configure:
   - Price: $10.00 USD
   - Billing period: Yearly
   - Recurring
4. Save and **copy the Price ID** (starts with `price_...`)

### 2. Update Supabase Environment Variables

Go to your Supabase Dashboard:
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/functions

1. Navigate to: **Edge Functions** → **Settings** → **Environment Variables**
2. Update these variables with your new Stripe Price IDs:
   - `STRIPE_MONTHLY_PRICE_ID` = `price_XXXXX` (your new $1/month price ID)
   - `STRIPE_YEARLY_PRICE_ID` = `price_XXXXX` (your new $10/year price ID)
3. Click **Save**

### 3. Verify Existing Variables

Make sure these are also set (don't change them):
- `STRIPE_SECRET_KEY` = Your Stripe secret key (starts with `sk_`)
- `SUPABASE_URL` = Your Supabase URL
- `SUPABASE_ANON_KEY` = Your Supabase anon key

### 4. Test the Checkout

1. Go to your live site
2. Click "Get Started" or upgrade button
3. Select Monthly or Yearly plan
4. Click "Upgrade to Premium"
5. Should redirect to Stripe checkout with new pricing

## Verification Checklist

- [ ] Created new $1/month Stripe price
- [ ] Created new $10/year Stripe price
- [ ] Updated `STRIPE_MONTHLY_PRICE_ID` in Supabase
- [ ] Updated `STRIPE_YEARLY_PRICE_ID` in Supabase
- [ ] Tested monthly checkout flow
- [ ] Tested yearly checkout flow
- [ ] Verified correct prices show in Stripe checkout

## Notes

- Frontend already deployed with new $1/$10 pricing display
- Edge function code doesn't need changes (it reads from env vars)
- Old price IDs will remain in Stripe but won't be used
- You can archive old prices in Stripe if desired

## Troubleshooting

If still getting 500 error:
1. Check Supabase Edge Function logs for specific error
2. Verify price IDs are correct (no typos)
3. Verify price IDs are active in Stripe
4. Try redeploying the edge function (though not required)
