# 🎯 BLACK FRIDAY PROMO - COMPLETE TESTING ROADMAP

## Quick Navigation

| Goal | Time | Document |
|------|------|----------|
| **Quick Overview** | 2 min | `BLACK_FRIDAY_QUICK_REFERENCE.md` |
| **Step-by-Step Testing** | 5 min | `REAL_TESTING_STEP_BY_STEP.md` ← **START HERE** |
| **Detailed Testing Guide** | 15 min | `BLACK_FRIDAY_TESTING_GUIDE.md` |
| **Automated Commands** | 2 min | `AUTOMATED_TESTING_COMMANDS.md` |
| **Technical Details** | 10 min | `BLACK_FRIDAY_PROMO_IMPLEMENTATION.md` |

---

## 🚀 Get Started in 5 Minutes

### THE FASTEST WAY

**Terminal (5 seconds):**
```bash
npm run dev
```

**Browser (5 seconds):**
1. Go to http://localhost:3000 (or 5173)
2. Press `Cmd+Option+I` (Mac) or `F12` (Windows)
3. Go to Console tab

**App (2 minutes):**
1. Sign in
2. Click "Upgrade to Premium"
3. Check if banner appears at top of modal
4. Verify price shows $1 (not $10)
5. Check console for errors

**Done! ✅**

---

## 📋 Testing Checklist

### VISUAL TESTS (What You SEE)
- [ ] **Banner appears** at top of modal
- [ ] **Diagonal stripes animate** (continuously sliding)
- [ ] **"BLACK" text is accent color** (blue/cyan)
- [ ] **"FRIDAY" text is white**
- [ ] **"Last Deal 90% Off" subtitle visible**
- [ ] **Price shows $1** (monthly) or **$10** (yearly)

### FUNCTIONAL TESTS (What You DO)
- [ ] Modal opens when clicking upgrade
- [ ] Toggle between monthly/yearly works
- [ ] Prices update instantly
- [ ] "Upgrade" button works
- [ ] Redirects to Stripe

### CONSOLE TESTS (What You READ)
- [ ] No red errors
- [ ] ProModal state shows `isOpen: true`
- [ ] Correct price ID in checkout logs

**If all 3 groups pass → ✅ EVERYTHING WORKS**

---

## 🧪 Three Testing Levels

### Level 1: Super Quick (2 minutes)
```
1. npm run dev
2. Sign in
3. Click "Upgrade"
4. Look for banner at top
5. Check price is $1 (not $10)
Done!
```

**Result:** Visual confirmation ✅

### Level 2: Standard (5 minutes)
```
1. Start dev server
2. Open DevTools Console
3. Sign in
4. Click "Upgrade"
5. Check visual: banner, prices, animation
6. Check console: look for logs
7. Click "Upgrade to Premium" button
8. Verify Stripe opens with correct amount
```

**Result:** Full functional test ✅

### Level 3: Complete (15 minutes)
```
1. Run automated checks
2. Visual tests (Level 2)
3. Price toggle test
4. Network testing
5. Stripe test purchase with test card
6. Verify subscription created in DB
```

**Result:** Complete end-to-end test ✅

---

## 🔧 Step-by-Step For Level 2 (Most Common)

### Step 1: Start Server (30 seconds)
```bash
cd /Users/marcelo/Documents/Curios
npm run dev
# Wait for: "Local: http://localhost:3000"
```

### Step 2: Open DevTools (30 seconds)
- Press `Cmd+Option+I` (Mac) or `F12` (Windows)
- Click **Console** tab
- Keep it visible

### Step 3: Sign In (1 minute)
- Click "Sign In" in app
- Use Google or Email
- Complete authentication
- Wait for app to load

### Step 4: Open Modal (30 seconds)
- Find "Upgrade to Premium" button
- Click it
- ProModal should appear

### Step 5: Check Banner (1 minute)
Look at top of modal:
```
Should see:
┌─────────────────────┐
│ Animated stripes    │
│ BLACK FRIDAY        │
│ Last Deal 90% Off   │
└─────────────────────┘
```

**Check boxes:**
- [ ] Banner visible?
- [ ] "BLACK" is accent color?
- [ ] Stripes animating?
- [ ] Price shows $1?

### Step 6: Check Prices (1 minute)
- Look at Premium plan: should show **$1**
- Click "Yearly": should show **$10**
- Click "Monthly": should show **$1** again

### Step 7: Check Console (1 minute)
Look at Console tab - you should see:
```javascript
ProModal state: { isOpen: true, hasSession: true, ... }
```

No red error messages? ✅

### Step 8: Test Checkout (1 minute)
- Click "Upgrade to Premium" button
- Check Console for:
  ```javascript
  Creating checkout session: { ... priceId: 'price_1SatRSBIQFhjr01ItbDM3mWm' }
  ```
- You should redirect to Stripe checkout

**All tests pass? → ✅ DONE!**

---

## 🎯 What to Look For

### ✅ When Everything Works

**In Browser:**
- Banner clearly visible with animation
- Prices show $1 and $10
- No visual glitches
- Smooth interactions

**In Console:**
- No red error messages
- ProModal state shows true values
- Checkout session logs appear
- Correct price ID shown

**In Stripe:**
- Amount is $1.00 or $10.00
- Interval is month or year
- Email is prefilled
- Everything looks clean

### ❌ When Something's Wrong

**Banner doesn't appear:**
```
Check: npm run dev restarted?
Fix: Hard refresh (Cmd+Shift+R)
```

**Price shows $10 instead of $1:**
```
Check: .env file has correct price IDs?
Fix: grep STRIPE_MONTHLY_PRICE_ID .env
Should be: price_1SatRSBIQFhjr01ItbDM3mWm
```

**Console shows errors:**
```
Take note of the error message
Check the troubleshooting guide
```

**Stripe checkout doesn't open:**
```
Check Network tab for failed requests
Look for Stripe key missing error
Verify you're signed in
```

---

## 📊 Test Matrix

| Feature | Level 1 | Level 2 | Level 3 |
|---------|---------|---------|---------|
| Visual Check | ✅ | ✅ | ✅ |
| Prices Check | ✅ | ✅ | ✅ |
| Console Check | ❌ | ✅ | ✅ |
| Stripe Checkout | ❌ | ✅ | ✅ |
| Test Purchase | ❌ | ❌ | ✅ |
| DB Verification | ❌ | ❌ | ✅ |
| Time Required | 2 min | 5 min | 15 min |

---

## 🚨 Common Issues & Quick Fixes

| Issue | Fix | Time |
|-------|-----|------|
| Banner doesn't appear | Hard refresh (Cmd+Shift+R) | 10 sec |
| Price shows old value | Stop/start dev server | 30 sec |
| Stripe key missing | Check .env | 1 min |
| Not signed in | Sign in again | 1 min |
| Console errors | Read error message | varies |
| Checkout doesn't open | Check Network tab | 2 min |

---

## ✨ Success Indicators

### ✅ Level 1 Success
- [ ] Banner visible at top of modal
- [ ] Price shows $1 (not $10)

### ✅ Level 2 Success
- [ ] All Level 1 checks pass
- [ ] Console shows no errors
- [ ] Stripe checkout opens
- [ ] Correct amount in Stripe

### ✅ Level 3 Success
- [ ] All Level 2 checks pass
- [ ] Test purchase completes
- [ ] Subscription created in database
- [ ] User subscription status updates

---

## 📚 Documentation Files

```
docs/
├── REAL_TESTING_STEP_BY_STEP.md       ← Start here for step-by-step
├── BLACK_FRIDAY_TESTING_GUIDE.md      ← Detailed testing guide
├── BLACK_FRIDAY_QUICK_REFERENCE.md    ← Quick overview
├── AUTOMATED_TESTING_COMMANDS.md      ← Commands to run
├── BLACK_FRIDAY_PROMO_IMPLEMENTATION.md ← Technical details
└── BLACK_FRIDAY_CONSOLE_TEST.js       ← Console script to copy/paste
```

---

## 🎬 Testing Workflow

```
START
  ↓
[1] npm run dev
  ↓
[2] Open Browser + DevTools
  ↓
[3] Sign In
  ↓
[4] Click "Upgrade to Premium"
  ↓
[5] ┌─ Visual OK? ──Yes──> Check Prices
    └─ No ──────────────> See Troubleshooting
  ↓
[6] ┌─ Prices OK? ──Yes──> Check Console
    └─ No ──────────────> Hard Refresh
  ↓
[7] ┌─ Console OK? ──Yes──> Click Checkout
    └─ No ──────────────> See Issues
  ↓
[8] ┌─ Stripe Opens? ──Yes──> DONE ✅
    └─ No ──────────────> Debug Network
```

---

## 🏁 Final Checklist Before Shipping

- [ ] Local testing completed (Level 2 minimum)
- [ ] No console errors
- [ ] Banner visually correct
- [ ] Prices updated ($1 / $10)
- [ ] Stripe integration working
- [ ] Price IDs in .env correct
- [ ] Build succeeds (`npm run build`)
- [ ] No TypeScript errors
- [ ] Ready to deploy!

---

## 🎓 Learning Resources

### Understanding the Implementation
- Read: `BLACK_FRIDAY_PROMO_IMPLEMENTATION.md`
- Understand: How banner connects to modal
- Know: How prices flow through system

### Debugging Skills
- Read: `BLACK_FRIDAY_TESTING_GUIDE.md`
- Learn: How to use DevTools
- Master: Reading console logs

### Quick Reference
- Bookmark: `BLACK_FRIDAY_QUICK_REFERENCE.md`
- Use: When you need fast answers
- Copy: Commands from testing guide

---

## 💬 If You Get Stuck

**Check in this order:**
1. Console for error messages
2. Network tab for failed requests
3. .env for configuration
4. Documentation for solutions
5. Ask specific questions with error details

**Always include:**
- The error message
- What you were doing
- What you expected
- What actually happened

---

## 🎉 You're Ready!

Everything is set up and tested. Pick your testing level and go!

**Recommended:** Start with Level 2 (5 minutes)
- Click: `REAL_TESTING_STEP_BY_STEP.md`
- Follow: Step 1-10
- Report: Results here

Good luck! 🚀
