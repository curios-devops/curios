# 🔍 Debugging Subscription Workflow

## Expected User Flow

```
┌─────────────────┐
│  Guest User     │
│  (Not signed)   │
└────────┬────────┘
         │
         │ Click "Upgrade to Premium"
         ▼
┌─────────────────┐
│  Sign In/Up     │
│  (Email/Google) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Free Tier User │
│  (Signed in)    │
└────────┬────────┘
         │
         │ Click "Upgrade to Premium"
         ▼
┌─────────────────┐
│  ProModal Opens │
│  (Stripe Setup) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Premium User   │
│  (Subscribed)   │
└─────────────────┘
```

## Console Logs to Check

### 1. **Home Page Load**
When you load the home page, look for:

```javascript
// Should show:
isGuest: false cookiesAccepted: true/false
Auth state changed: INITIAL_SESSION User signed in
```

**What this means:**
- `isGuest: false` = User IS signed in ✅
- `isGuest: true` = User is NOT signed in (guest) ❌

---

### 2. **SearchBox Rendering**
When SearchBox loads, look for:

```javascript
SearchBox - session: LOGGED IN/NOT LOGGED IN {
  hasSession: true/false,
  userId: "xxx-xxx-xxx",
  email: "user@example.com",
  subscription: { status, isActive, isPro }
}
```

**What to check:**
- If user is signed in, should show `"LOGGED IN"`
- `hasSession: true` confirms session exists
- `subscription.isActive: false` means free tier
- `subscription.isActive: true` means premium user

---

### 3. **useSubscription Fetch**
When subscription data loads, look for:

```javascript
useSubscription - fetched: {
  userId: "xxx-xxx-xxx",
  status: "inactive" or "active",
  isActive: false or true,
  isPro: false or true
}
```

**Free tier user should show:**
- `status: "inactive"`
- `isActive: false`
- `isPro: false`

**Premium user should show:**
- `status: "active"`
- `isActive: true`
- `isPro: true`

---

### 4. **ProTooltip Hover**
When you hover over the Pro Search toggle, look for:

```javascript
ProTooltip rendering: {
  isLoggedIn: true/false,
  hasSubscription: true/false,
  isActive: true/false,
  viewType: "GUEST" or "STANDARD (FREE TIER)" or "PREMIUM"
}
```

**Expected for each user type:**

| User Type | isLoggedIn | isActive | viewType | Button Shown |
|-----------|------------|----------|----------|--------------|
| Guest | `false` | N/A | `GUEST` | "Sign in for Pro Searches" |
| Free Tier | `true` | `false` | `STANDARD (FREE TIER)` | "Upgrade to Premium" ✅ |
| Premium | `true` | `true` | `PREMIUM` | No button, shows quota |

---

### 5. **Click "Upgrade to Premium"**
When you click the button, look for:

```javascript
ProTooltip onUpgrade clicked - opening ProModal
```

**Then immediately after:**

```javascript
ProModal state: {
  isOpen: true,
  hasSession: true,
  userId: "xxx-xxx-xxx",
  email: "user@example.com"
}
```

**What should happen:**
- `isOpen: true` = Modal IS opening ✅
- `hasSession: true` = User is signed in ✅
- If both are true, you should SEE the modal on screen

---

## Common Issues & Fixes

### ❌ Issue 1: ProTooltip shows "Sign in" instead of "Upgrade"
**Console shows:**
```javascript
ProTooltip rendering: {
  isLoggedIn: false,  // ❌ PROBLEM
  viewType: "GUEST"
}
```

**Cause:** Session is not being detected in SearchBox

**Check:**
```javascript
SearchBox - session: NOT LOGGED IN  // ❌ PROBLEM
```

**Fix:** Session validation is clearing the session. Check for:
- Time skew errors
- Token validation failures
- Network errors during `getUser()` call

---

### ❌ Issue 2: Button click doesn't open modal
**Console shows:**
```javascript
ProTooltip onUpgrade clicked - opening ProModal  // ✅ Click detected
ProModal state: { isOpen: false }  // ❌ Modal not opening
```

**Cause:** Modal state not updating

**Fix:** Check React state management in SearchBox
- Verify `setShowProModal(true)` is being called
- Check if modal is being unmounted/remounted

---

### ❌ Issue 3: Premium user sees upgrade button
**Console shows:**
```javascript
ProTooltip rendering: {
  isLoggedIn: true,
  isActive: true,  // Should be premium
  viewType: "STANDARD (FREE TIER)"  // ❌ WRONG
}
```

**Cause:** Subscription data not loading correctly

**Check:**
```javascript
useSubscription - fetched: {
  status: "inactive",  // ❌ Should be "active"
  isActive: false  // ❌ Should be true
}
```

**Fix:** Check Supabase `profiles` table:
- Verify `subscription_status` column value
- Verify `subscription_period_end` is in the future

---

## Testing Checklist

### Guest User (Not Signed In)
- [ ] Home page shows cookie consent banner
- [ ] Pro Search toggle shows "Sign in for Pro Searches"
- [ ] Clicking button opens ProModal with sign in/up options

### Free Tier User (Signed In)
- [ ] `isGuest: false` in console
- [ ] `SearchBox - session: LOGGED IN` in console
- [ ] `ProTooltip viewType: "STANDARD (FREE TIER)"` in console
- [ ] Pro Search toggle shows "Upgrade to Premium" ✅
- [ ] Clicking "Upgrade to Premium" logs `onUpgrade clicked`
- [ ] ProModal opens with `isOpen: true`
- [ ] Modal shows Monthly/Yearly plan options
- [ ] Stripe checkout button appears

### Premium User (Subscribed)
- [ ] `subscription.isActive: true` in console
- [ ] `ProTooltip viewType: "PREMIUM"` in console
- [ ] Pro Search toggle shows daily quota
- [ ] NO upgrade button shown
- [ ] Can use Pro Search freely

---

## Next Steps

1. **Deploy this debugging version** ✅ (Already pushed: commit `c753e2a`)
2. **Test on live site** at https://www.curiosai.com
3. **Open browser console** (F12)
4. **Sign in with Google** (marcelo@curiosai.com)
5. **Copy ALL console logs** and share them
6. **Try clicking "Upgrade to Premium"** on the Pro Search toggle
7. **Report what happens** - does modal open? Any errors?

---

## Files to Review

If debugging reveals issues:

- **Session Detection:** `src/hooks/useSession.ts`
- **Subscription Loading:** `src/hooks/useSubscription.ts`
- **SearchBox Logic:** `src/components/boxContainer/SearchBox.tsx`
- **ProTooltip Views:** `src/components/subscription/ProTooltip.tsx`
- **ProModal Rendering:** `src/components/subscription/ProModal.tsx`

---

## Expected Console Output (Free Tier User)

```javascript
// On page load
isGuest: false cookiesAccepted: true
Auth state changed: INITIAL_SESSION User signed in

// SearchBox renders
SearchBox - session: LOGGED IN {
  hasSession: true,
  userId: "abc-123-def",
  email: "marcelo@curiosai.com",
  subscription: { status: "inactive", isActive: false, isPro: false }
}

// Subscription fetched
useSubscription - fetched: {
  userId: "abc-123-def",
  status: "inactive",
  isActive: false,
  isPro: false
}

// Hover over Pro toggle
ProTooltip rendering: {
  isLoggedIn: true,
  hasSubscription: true,
  isActive: false,
  viewType: "STANDARD (FREE TIER)"
}

// Click "Upgrade to Premium"
ProTooltip onUpgrade clicked - opening ProModal

// Modal opens
ProModal state: {
  isOpen: true,
  hasSession: true,
  userId: "abc-123-def",
  email: "marcelo@curiosai.com"
}
```

**If you see this output → Everything is working correctly! ✅**
