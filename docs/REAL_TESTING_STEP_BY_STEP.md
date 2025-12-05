# ⚡ Real Testing - Step by Step (5 Minutes)

## 🚀 Get Started Now

### Step 1: Start Your Dev Server (1 min)

Open Terminal and run:
```bash
cd /Users/marcelo/Documents/Curios
npm run dev
```

**Expected Output:**
```
➜  Curios git:(main) npm run dev
> curios@0.0.1 dev
> netlify dev

◈ Netlify Dev server running on http://localhost:3000
◈ Ready for requests
```

OR if using Vite directly:
```bash
npm run dev
# Should start on http://localhost:5173
```

**✅ When you see the server running URL, move to Step 2**

---

## Step 2: Open Your App (30 seconds)

1. **Open browser:** Chrome, Firefox, or Safari
2. **Navigate to:** `http://localhost:3000` (or `http://localhost:5173`)
3. **You should see:** CuriosAI homepage

**✅ App loaded? Go to Step 3**

---

## Step 3: Open DevTools (30 seconds)

**On Mac:**
- Press `Cmd + Option + I` (or `Cmd + Option + J` for Console directly)

**On Windows/Linux:**
- Press `F12` (or `Ctrl + Shift + I`)

**You should see:** DevTools panel at bottom or side

**Click:** `Console` tab (if not already selected)

**✅ Console open? Go to Step 4**

---

## Step 4: Sign In (1-2 minutes)

1. **Click:** "Sign In" button in your app
2. **Choose method:** Google or Email
3. **Complete sign in:** Enter credentials
4. **Wait:** For page to load completely
5. **Check Console:** Should see logs like:
   ```
   Auth state changed: INITIAL_SESSION
   User signed in: user@email.com
   ```

**✅ Signed in? Go to Step 5**

---

## Step 5: Find "Upgrade to Premium" Button (30 seconds)

Look for "Upgrade to Premium" button in your app. It might be:
- In a search results section
- In a feature card
- In a hover tooltip
- In a settings menu

**Click it!**

---

## Step 6: Watch the Modal Open! ⭐ (KEY TEST)

**Look for:**
```
┌─────────────────────────────────────┐
│  X (close button)                   │
│                                     │
│  ╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱  │
│  ║ BLACK FRIDAY                    │
│  ║ Last Deal 90% Off               │
│  ╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱╱  │
│                                     │
│  Upgrade to Premium                │
│  Unlock full potential...           │
│                                     │
│  [Monthly] [Yearly] buttons         │
│                                     │
│  Standard Plan  Premium Plan        │
│  Free Forever   $1 per month       │
│                                     │
└─────────────────────────────────────┘
```

**Check these boxes:**
- [ ] Banner appears at TOP
- [ ] "BLACK" is in ACCENT color (blue/cyan)
- [ ] "FRIDAY" is WHITE
- [ ] Stripes are ANIMATING (sliding)
- [ ] Price shows **$1** (not $10!)
- [ ] "Last Deal 90% Off" is visible

---

## Step 7: Console Verification (30 seconds)

**In DevTools Console, you should see:**

```javascript
ProModal state: {
  isOpen: true,
  hasSession: true,
  userId: "some-id",
  email: "your@email.com"
}
```

**If you see this, the banner component is loading correctly! ✅**

---

## Step 8: Test Price Toggle (30 seconds)

1. **Click** "Yearly" button
2. **Price should change** to **$10** (not $50!)
3. **Click** "Monthly" button again
4. **Price should change** back to **$1**

**✅ Prices update correctly?**

---

## Step 9: Test Stripe Checkout (1-2 minutes)

1. **Click** "Upgrade to Premium" button
2. **Watch Console** - you should see:
   ```javascript
   Creating checkout session: {
     userId: "...",
     email: "...",
     interval: "month",
     priceId: "price_1SatRSBIQFhjr01ItbDM3mWm"
   }
   
   Checkout session created successfully: {
     sessionId: "cs_test_...",
     url: "https://checkout.stripe.com/pay/..."
   }
   ```

3. **You should be redirected** to Stripe checkout page
4. **Verify in Stripe:**
   - Price is **$1.00** (or $10 if you selected yearly)
   - Period is **month** (or year)
   - Your email is shown

**✅ Everything working?**

---

## Step 10: Use Test Card (Optional - to complete flow)

If you want to test the complete checkout:

1. **In Stripe checkout, enter:**
   ```
   Card: 4242 4242 4242 4242
   Expiry: 12/25
   CVC: 123
   ```

2. **Click** "Pay" button
3. **You should see** "Payment successful"

---

## ✅ VERIFICATION CHECKLIST

### Visual Tests (What you SEE)
- [ ] Banner appears at top of modal
- [ ] "BLACK" text is accent color (blue/cyan)
- [ ] "FRIDAY" text is white
- [ ] Diagonal stripes are visible and animated
- [ ] "Last Deal 90% Off" subtitle shows
- [ ] Price shows $1 (monthly) / $10 (yearly)

### Functional Tests (What you DO)
- [ ] Modal opens when clicking upgrade
- [ ] Price toggles work (monthly ↔ yearly)
- [ ] Prices update instantly when toggling
- [ ] "Upgrade to Premium" button works
- [ ] Redirects to Stripe checkout
- [ ] Stripe shows correct amount
- [ ] No errors in console

### Console Tests (What you READ)
- [ ] ProModal state shows `isOpen: true`
- [ ] Create checkout session shows correct priceId
- [ ] No red error messages
- [ ] No warnings about missing keys

---

## 🎯 If All Checks Pass = YOU'RE DONE! ✅

Everything is working perfectly!

---

## ❌ Troubleshooting Quick Fixes

### Problem: Banner doesn't appear
**Quick Fix:**
```bash
# Hard refresh (clears cache)
Cmd + Shift + R (Mac)
Ctrl + Shift + R (Windows)
```

### Problem: Price still shows $10
**Quick Fix:**
1. In Terminal, stop dev server: `Ctrl + C`
2. Run: `npm run dev` again
3. Hard refresh browser
4. Reopen modal

### Problem: Stripe checkout doesn't open
**Quick Fix:**
1. Check Console for errors (red messages)
2. Verify you're signed in
3. Look at Network tab to see if API call succeeds

### Problem: Console shows "Invalid price configuration"
**Quick Fix:**
1. Check `.env` file has correct price IDs:
   ```bash
   grep STRIPE_.*PRICE_ID .env
   ```
2. Should show:
   ```
   STRIPE_MONTHLY_PRICE_ID=price_1SatRSBIQFhjr01ItbDM3mWm
   STRIPE_YEARLY_PRICE_ID=price_1Qb95SBIQFhjr01I1r1LkJkP
   ```

---

## 📊 Test Results Template

**Copy & Fill Out:**

```
🧪 BLACK FRIDAY PROMO TEST RESULTS
Date: December 5, 2025
Tester: [Your Name]

VISUAL TESTS:
✅ Banner appears
✅ Animation works
✅ Colors correct ($1/$10 prices visible
✅ No errors

FUNCTIONAL TESTS:
✅ Modal opens
✅ Prices toggle
✅ Checkout button works
✅ Stripe opens

CONSOLE TESTS:
✅ No errors
✅ Correct logs
✅ Session working

OVERALL: ✅ ALL TESTS PASSED
```

---

## 🎬 Video Recording (Optional)

If you want to record your test:

1. **Mac:** Use QuickTime (Cmd + Shift + 5)
2. **Windows:** Use Xbox Game Bar (Win + G)
3. **Chrome:** Use DevTools recording

This helps if you need to share results or debug later.

---

## 🤝 Need Help?

**Check these files:**
- `docs/BLACK_FRIDAY_QUICK_REFERENCE.md` - Quick overview
- `docs/BLACK_FRIDAY_PROMO_IMPLEMENTATION.md` - Technical details
- `docs/BLACK_FRIDAY_TESTING_GUIDE.md` - Detailed testing guide

**Or review the code:**
- `src/components/subscription/BlackFridayBanner.tsx` - Banner component
- `src/components/subscription/ProModal.tsx` - Updated modal

---

## ✨ Ready? Start with Step 1!

Go back to **Step 1** and start testing now. You should have results in under 5 minutes! 🚀
