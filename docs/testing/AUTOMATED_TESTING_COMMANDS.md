# 🤖 Automated Testing Commands

## Quick Commands to Run in Terminal

### 1️⃣ Check Environment Variables
```bash
# Verify price IDs are correct
grep STRIPE .env | grep PRICE_ID

# Expected Output:
# STRIPE_MONTHLY_PRICE_ID=price_1SatRSBIQFhjr01ItbDM3mWm
# STRIPE_YEARLY_PRICE_ID=price_1Qb95SBIQFhjr01I1r1LkJkP
```

### 2️⃣ Verify Files Exist
```bash
# Check if banner component exists
ls -la src/components/subscription/BlackFridayBanner.tsx

# Check if ProModal was updated
grep "BlackFridayBanner" src/components/subscription/ProModal.tsx
```

### 3️⃣ Check for TypeScript Errors
```bash
# Run type check
npm run type-check

# Or directly with TypeScript
npx tsc --noEmit
```

### 4️⃣ Start Dev Server
```bash
# Start development server
npm run dev

# Output should show:
# ➜  Local:   http://localhost:5173
# Or for Netlify:
# ◈ Netlify Dev server running on http://localhost:3000
```

### 5️⃣ Build and Check for Errors
```bash
# Build the project
npm run build

# Should complete without errors
# If there are errors, they'll be shown with line numbers
```

---

## Browser Console Testing

### Copy & Paste These Commands

#### **Check 1: Verify Banner Component Loaded**
```javascript
// Check if banner component exists in DOM
const banner = document.querySelector('[class*="h-24"][class*="mb-6"]');
console.log('Banner Found:', !!banner);
console.log('Banner Content:', banner?.textContent.trim());
```

#### **Check 2: Verify Prices Display**
```javascript
// Find all prices displayed
const prices = Array.from(document.querySelectorAll('*')).filter(el => 
  el.textContent.match(/\$[0-9]+/)
).map(el => el.textContent.trim());
console.log('Prices Found:', prices);
console.log('Contains $1:', prices.some(p => p.includes('$1')));
console.log('Contains $10:', prices.some(p => p.includes('$10')));
```

#### **Check 3: Verify Modal State**
```javascript
// Check modal state from your app
console.log('Checking ProModal...');
// The console should already show "ProModal state: {...}"
// Just look for that in the console output
```

#### **Check 4: Verify No Errors**
```javascript
// Get all error messages
const errors = window.errors || [];
console.log('Recorded Errors:', errors);
console.log('Console Errors: Check red messages above ☝️');
```

#### **Check 5: Simulate Click Test**
```javascript
// Find and log the upgrade button
const upgradeBtn = Array.from(document.querySelectorAll('button')).find(btn =>
  btn.textContent.includes('Upgrade') || btn.textContent.includes('upgrade')
);
console.log('Upgrade Button Found:', !!upgradeBtn);
console.log('Button Text:', upgradeBtn?.textContent);
```

---

## File Verification Commands

### Check Component Updates

```bash
# Verify BlackFridayBanner import exists
grep -n "import.*BlackFridayBanner" src/components/subscription/ProModal.tsx

# Expected: Line 7 should show:
# import BlackFridayBanner from './BlackFridayBanner';

# Verify banner component is used
grep -n "BlackFridayBanner" src/components/subscription/ProModal.tsx

# Expected: Line 47 should show:
# <BlackFridayBanner />

# Verify prices were updated
grep -n "\$1\|$10" src/components/subscription/ProModal.tsx

# Expected: Lines 105-106 should show:
# {selectedInterval === 'month' ? '$1' : '$10'}
```

---

## Full Validation Script

Copy and save as `test-setup.sh`, then run with `bash test-setup.sh`:

```bash
#!/bin/bash

echo "🧪 BLACK FRIDAY PROMO - SETUP VALIDATION"
echo "========================================"
echo ""

# Test 1: Check .env
echo "📝 TEST 1: Checking .env for price IDs..."
if grep -q "STRIPE_MONTHLY_PRICE_ID=price_1SatRSBIQFhjr01ItbDM3mWm" .env; then
  echo "✅ Monthly price ID correct"
else
  echo "❌ Monthly price ID missing or incorrect"
fi

if grep -q "STRIPE_YEARLY_PRICE_ID=price_1Qb95SBIQFhjr01I1r1LkJkP" .env; then
  echo "✅ Yearly price ID correct"
else
  echo "❌ Yearly price ID missing or incorrect"
fi
echo ""

# Test 2: Check files exist
echo "📂 TEST 2: Checking if files exist..."
if [ -f "src/components/subscription/BlackFridayBanner.tsx" ]; then
  echo "✅ BlackFridayBanner.tsx exists"
else
  echo "❌ BlackFridayBanner.tsx NOT FOUND"
fi

if [ -f "src/components/subscription/ProModal.tsx" ]; then
  echo "✅ ProModal.tsx exists"
else
  echo "❌ ProModal.tsx NOT FOUND"
fi
echo ""

# Test 3: Check imports
echo "🔗 TEST 3: Checking imports..."
if grep -q "import BlackFridayBanner from './BlackFridayBanner'" src/components/subscription/ProModal.tsx; then
  echo "✅ Banner import found in ProModal"
else
  echo "❌ Banner import NOT found in ProModal"
fi
echo ""

# Test 4: Check component usage
echo "⚙️  TEST 4: Checking component usage..."
if grep -q "<BlackFridayBanner />" src/components/subscription/ProModal.tsx; then
  echo "✅ Banner component used in ProModal"
else
  echo "❌ Banner component NOT used in ProModal"
fi
echo ""

# Test 5: Check prices
echo "💰 TEST 5: Checking prices..."
if grep -q "\$1" src/components/subscription/ProModal.tsx; then
  echo "✅ Monthly price ($1) found in ProModal"
else
  echo "❌ Monthly price ($1) NOT found in ProModal"
fi

if grep -q "\$10" src/components/subscription/ProModal.tsx; then
  echo "✅ Yearly price ($10) found in ProModal"
else
  echo "❌ Yearly price ($10) NOT found in ProModal"
fi
echo ""

echo "========================================"
echo "✨ Setup validation complete!"
echo ""
```

---

## Network Testing Commands

### Use cURL to Test API Endpoints

```bash
# Test create-checkout endpoint
curl -X POST http://localhost:3000/functions/v1/create-checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "test-user-id",
    "email": "test@example.com",
    "interval": "month"
  }'

# Expected response:
# {
#   "sessionId": "cs_test_...",
#   "url": "https://checkout.stripe.com/pay/..."
# }
```

---

## Performance Testing

### Check Bundle Size

```bash
# Check if BlackFridayBanner adds much size
ls -lah src/components/subscription/BlackFridayBanner.tsx

# Should be small (< 3KB)

# Build and check total size
npm run build

# Check dist folder size
du -sh dist/

# Component should only add ~1-2KB to bundle
```

---

## Database Verification (Optional)

### Check Stripe Subscription Status

```bash
# If you have direct database access:
# psql $DATABASE_URL

# Check subscription table:
# SELECT * FROM subscriptions WHERE user_id = 'your-user-id';

# Should show:
# - price_id matching new price
# - status = 'active'
# - subscription_period_end in future
```

---

## Complete Test Run (All in One)

Create `run-all-tests.sh`:

```bash
#!/bin/bash

echo "🚀 RUNNING ALL TESTS..."
echo ""

# 1. Environment check
echo "1️⃣  Environment variables..."
grep STRIPE_MONTHLY_PRICE_ID .env && echo "✅" || echo "❌"
grep STRIPE_YEARLY_PRICE_ID .env && echo "✅" || echo "❌"
echo ""

# 2. File existence
echo "2️⃣  Files exist..."
[ -f "src/components/subscription/BlackFridayBanner.tsx" ] && echo "✅" || echo "❌"
[ -f "src/components/subscription/ProModal.tsx" ] && echo "✅" || echo "❌"
echo ""

# 3. Code checks
echo "3️⃣  Code verification..."
grep -q "BlackFridayBanner" src/components/subscription/ProModal.tsx && echo "✅ Banner imported" || echo "❌"
grep -q "\$1" src/components/subscription/ProModal.tsx && echo "✅ Price $1" || echo "❌"
echo ""

# 4. Build check
echo "4️⃣  Building project..."
npm run build > /dev/null 2>&1 && echo "✅ Build successful" || echo "❌ Build failed"
echo ""

# 5. Type check
echo "5️⃣  Type checking..."
npx tsc --noEmit > /dev/null 2>&1 && echo "✅ No type errors" || echo "❌ Type errors found"
echo ""

echo "✨ All tests complete!"
```

Run with:
```bash
bash run-all-tests.sh
```

---

## Quick Summary

### What to Check
```bash
# Environment
grep STRIPE_MONTHLY_PRICE_ID .env
grep STRIPE_YEARLY_PRICE_ID .env

# Files
ls src/components/subscription/BlackFridayBanner.tsx
ls src/components/subscription/ProModal.tsx

# Code
grep BlackFridayBanner src/components/subscription/ProModal.tsx
grep "\$1" src/components/subscription/ProModal.tsx

# Build
npm run build
```

### All Should Pass ✅
If all commands above show your expected values, **you're ready to test!**

---

## Visual Test Result

After running tests, you should see:
```
✅ Environment variables correct
✅ Files exist
✅ Component imported
✅ Component used
✅ Prices updated
✅ Build succeeds
✅ No type errors
✅ Ready to test in browser!
```
