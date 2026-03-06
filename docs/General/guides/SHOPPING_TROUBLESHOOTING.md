# Shopping Feature Troubleshooting Guide

## 500 Error: "POST /.netlify/functions/search-amazon-products"

### Cause
The Netlify function is returning a 500 error, most likely because `SERPAPI_API_KEY` is not configured in Netlify.

### Solution: Add Environment Variables to Netlify

You need to add **2 environment variables** to Netlify:

#### 1. SERPAPI_API_KEY (Required)
**Steps:**
1. Go to [SerpAPI](https://serpapi.com/users/sign_up)
2. Sign up for a free account (100 searches/month free)
3. Copy your API key from the dashboard
4. Go to Netlify: **Site Settings > Environment Variables**
5. Click **Add a variable**
6. Set:
   - **Key:** `SERPAPI_API_KEY`
   - **Value:** Your SerpAPI key (example: `c25f9802be19c7974a87a148e4133ad3ee344567f2090f930689100954d18e4a`)
   - **Scopes:** All
7. Click **Save**

#### 2. AMAZON_STORE_ID (Optional)
**Steps:**
1. Sign up for [Amazon Associates](https://affiliate-program.amazon.com/)
2. Get your Store ID (format: `yourstore-20`)
3. Go to Netlify: **Site Settings > Environment Variables**
4. Click **Add a variable**
5. Set:
   - **Key:** `AMAZON_STORE_ID`
   - **Value:** Your affiliate tag (example: `curiosaiapp20-20`)
   - **Scopes:** All
6. Click **Save**

### After Adding Variables

**Important:** You must redeploy your site after adding environment variables:

1. Go to **Deploys** tab in Netlify
2. Click **Trigger deploy** > **Deploy site**
3. Wait for deployment to complete (~2 minutes)

OR simply push a new commit:
```bash
git commit --allow-empty -m "Trigger deploy after env vars"
git push origin main
```

---

## Graceful Fallback

The shopping feature is now **error-tolerant**:

✅ **If SerpAPI is not configured:** Search falls back to showing images instead of products  
✅ **If SerpAPI fails:** Search continues normally, shows images  
✅ **If API quota exceeded:** Search continues, shows images  
✅ **No 500 errors break the UI:** All errors return empty products gracefully

### Expected Behavior

**With SERPAPI_API_KEY configured:**
- Query: "best wireless headphones" → Shows 4 Amazon product cards
- Query: "how to cook pasta" → Shows images (no shopping intent)

**Without SERPAPI_API_KEY:**
- Query: "best wireless headphones" → Shows images (fallback)
- Console shows: "⚠️ API error: SerpAPI not configured"
- User experience is not broken

---

## Testing

### 1. Check Environment Variables
```bash
# In Netlify, go to Site Settings > Environment Variables
# Should see:
SERPAPI_API_KEY = c25f...
AMAZON_STORE_ID = curiosaiapp20-20
```

### 2. Check Netlify Function Logs
```bash
# In Netlify, go to Functions tab
# Click on "search-amazon-products"
# Look for logs showing:
✅ "🛍️ [SerpAPI] Searching Amazon: best headphones"
✅ "🛍️ [SerpAPI] Found products: 4"

# Or errors:
❌ "SERPAPI_API_KEY not configured"
```

### 3. Test Queries
- `"best wireless headphones 2026"` → Should show products
- `"buy iphone 15 pro"` → Should show products
- `"how to cook pasta"` → Should show images

---

## Common Issues

### Issue: "SerpAPI not configured"
**Solution:** Add `SERPAPI_API_KEY` to Netlify environment variables (see above)

### Issue: "API quota exceeded"
**Solution:** 
- Free tier: 100 searches/month
- Upgrade at [SerpAPI Pricing](https://serpapi.com/pricing)
- $50/month for 5,000 searches

### Issue: Products show but no affiliate tag
**Solution:** Add `AMAZON_STORE_ID` to Netlify environment variables

### Issue: Changes not working after deploy
**Solution:** Hard refresh browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

---

## Monitoring

### Check SerpAPI Usage
1. Go to [SerpAPI Dashboard](https://serpapi.com/dashboard)
2. View **Searches Used** counter
3. Free tier shows: X / 100 searches

### Check Netlify Function Logs
1. Netlify Dashboard → **Functions**
2. Click **search-amazon-products**
3. View real-time logs
4. Look for errors or API calls

---

## Cost Estimate

**Free Tier:**
- 100 SerpAPI searches/month = FREE
- Perfect for testing and low-volume usage

**Paid Tier:**
- $50/month = 5,000 searches
- Average: $0.01 per search
- Example: 1,000 shopping queries/month = $10

**Amazon Associates:**
- FREE to join
- Earn 1-10% commission on referred sales
- Can offset SerpAPI costs

---

## Support

If issues persist:
1. Check Netlify function logs for detailed errors
2. Verify environment variables are set correctly
3. Ensure you've redeployed after adding variables
4. Test with browser console open (F12) to see detailed logs
