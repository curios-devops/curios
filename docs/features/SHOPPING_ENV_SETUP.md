# Shopping Feature - Environment Variables Setup

## Required Environment Variables

To enable the shopping feature with real Amazon product data via SerpAPI, you need to set up the following environment variables:

### 1. SERPAPI_API_KEY (Required)

**What it is:** API key for SerpAPI Amazon Search  
**Where to get it:** https://serpapi.com/  
**How to set it:**

```bash
# In Netlify Dashboard:
# Site Settings → Environment Variables → Add variable

SERPAPI_API_KEY=your_serpapi_api_key_here
```

**Free Tier:** SerpAPI offers 100 free searches per month

### 2. VITE_AMAZON_STORE_ID (Optional)

**What it is:** Your Amazon Associates affiliate tag  
**Where to get it:** https://affiliate-program.amazon.com/  
**How to set it:**

```bash
VITE_AMAZON_STORE_ID=your_amazon_associate_tag
```

**Purpose:** Adds your affiliate tag to product URLs so you earn commission on clicks

---

## Setup Steps

### Step 1: Get SerpAPI Key

1. Go to https://serpapi.com/
2. Sign up for free account
3. Get your API key from dashboard
4. Copy the key

### Step 2: Add to Netlify

1. Go to your Netlify site dashboard
2. Navigate to: **Site Settings → Environment Variables**
3. Click **Add variable**
4. Add:
   - **Key:** `SERPAPI_API_KEY`
   - **Value:** Your SerpAPI key
   - **Scopes:** All (or select Production/Deploy previews)
5. Click **Save**

### Step 3: (Optional) Add Amazon Affiliate Tag

1. Sign up for Amazon Associates program
2. Get your associate tag (e.g., `yourstore-20`)
3. Add to Netlify environment variables:
   - **Key:** `VITE_AMAZON_STORE_ID`
   - **Value:** Your associate tag
   - **Scopes:** All
4. Click **Save**

### Step 4: Redeploy

After adding environment variables, you need to redeploy your site:
- Trigger a new deploy from Netlify dashboard
- Or push a new commit to trigger auto-deploy

---

## Testing Locally

To test shopping feature locally, create a `.env` file in the project root:

```bash
# .env (DO NOT commit this file!)
SERPAPI_API_KEY=your_serpapi_api_key_here
VITE_AMAZON_STORE_ID=yourstore-20
```

Then run:
```bash
netlify dev
```

This will load environment variables and run Netlify Functions locally.

---

## Verification

After setup, test the shopping feature:

1. Search for: "best wireless headphones"
2. Open browser console (F12)
3. Look for logs:
   ```
   🛍️ [SHOPPING STREAMING] Intent detection: {isShoppingIntent: true, confidence: 45}
   🛍️ [SHOPPING STREAMING] Starting product search in parallel...
   🔍 [Amazon API] Searching for: "best wireless headphones"
   🛍️ [Amazon API] Success! Found 4 products
   ```
4. Product cards should appear with real Amazon data!

---

## Troubleshooting

### Products not showing?

1. **Check environment variables are set** in Netlify
2. **Verify SerpAPI key is valid** - test at https://serpapi.com/playground
3. **Check browser console** for error messages
4. **Verify query triggers shopping intent** (confidence > 40%)

### "Amazon search failed" error?

- Check SerpAPI quota (100 free searches/month)
- Verify API key is correct
- Check Netlify Function logs for detailed errors

### Placeholder images showing?

- This means SerpAPI returned products without thumbnails
- Try different search queries
- Some products may not have images in SerpAPI results

---

## Cost Considerations

**SerpAPI Pricing:**
- Free: 100 searches/month
- Developer: $50/month for 5,000 searches
- Production: $250/month for 30,000 searches

**Recommendation:** Start with free tier to test, upgrade based on traffic

**Without SerpAPI:**
- Shopping feature will fail silently
- Users will see images instead (graceful fallback)
- No errors shown to users

---

## Security Notes

- ✅ API keys are stored in Netlify (server-side only)
- ✅ Keys are never exposed to client browser
- ✅ Netlify Functions act as secure proxy
- ✅ All requests go through your backend

**Never commit API keys to git!**

Add to `.gitignore`:
```
.env
.env.local
.env.*.local
```
