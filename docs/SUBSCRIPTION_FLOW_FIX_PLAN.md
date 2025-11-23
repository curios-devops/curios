# 🔧 Subscription Flow Fix Plan

## 🎯 Goal
Simplify and fix the subscription workflow to ensure free tier users can click "Upgrade to Premium" in the Pro Search toggle.

---

## 📊 Current State Analysis

### ✅ What Works (StandardUserBanner):
```typescript
// Home.tsx
const isGuest = !session;
const isStandard = session && !subscription?.isActive;

{isStandard && <StandardUserBanner />}
```

**StandardUserBanner:**
- Only renders when user IS signed in AND has NO active subscription
- Simple button click → `setShowProModal(true)` → Opens ProModal
- No complex logic, just state management

### ❌ What's Broken (SearchBox ProTooltip):
```typescript
// SearchBox.tsx
isLoggedIn={!!session}
subscription={subscription ?? undefined}
```

**ProTooltip:**
- Checks `isLoggedIn` prop to determine view
- Checks `subscription?.isActive` to show premium vs standard view
- **Problem:** Might be receiving wrong values due to timing or state issues

---

## 🔍 Root Cause Investigation

### Issue 1: Type Mismatch
**ProTooltip expects:**
```typescript
subscription?: { isActive: boolean };
```

**SearchBox passes:**
```typescript
subscription: Subscription | null
```

**Fix Applied (already done):**
```typescript
subscription={subscription ?? undefined}
```

### Issue 2: Timing/Loading State
**Problem:** When SearchBox first renders:
- `session` might still be loading → `session = null`
- `subscription` might still be loading → `subscription = null`
- ProTooltip sees `isLoggedIn = false` → Shows **Guest view**

**Evidence from console logs:**
```javascript
SearchBox - session: NOT LOGGED IN  // ❌ Wrong!
// But user IS actually signed in
```

### Issue 3: Session Validation Clearing Session
**In useSession.ts:**
```typescript
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  await clearLocalSession();  // ❌ Clearing session!
}
```

**Time skew errors** might be causing `getUser()` to return an error, which clears the session.

---

## 🛠️ Fix Strategy

### Phase 1: Simplify State Detection ✅ (Already done)
- [x] Add time skew error tolerance in useSession
- [x] Don't clear session for time skew warnings
- [x] Continue with valid session even with clock drift

### Phase 2: Add Loading State Handling
- [ ] Check if `isLoading` from useSession
- [ ] Check if `loading` from useSubscription
- [ ] Don't render ProTooltip until both are loaded

### Phase 3: Unify Subscription Detection Pattern
- [ ] Use same pattern as Home.tsx:
  ```typescript
  const isGuest = !session;
  const isStandard = session && !subscription?.isActive;
  const isPremium = session && subscription?.isActive;
  ```

### Phase 4: Simplify ProTooltip Logic
- [ ] Remove complex conditional logic
- [ ] Three clear states: Guest, Standard, Premium
- [ ] Use consistent state detection

### Phase 5: Add Better Debugging
- [ ] Log when ProTooltip decides which view to show
- [ ] Log subscription state changes
- [ ] Track modal open/close events

---

## 📝 Implementation Plan

### Step 1: Add Loading States to SearchBox
```typescript
const { session, isLoading: sessionLoading } = useSession();
const { subscription, loading: subscriptionLoading } = useSubscription();

// Don't show tooltip until both are loaded
if (sessionLoading || subscriptionLoading) {
  return <LoadingSpinner />;
}
```

### Step 2: Use Unified State Detection
```typescript
const isGuest = !session;
const isFree = session && !subscription?.isActive;
const isPremium = session && subscription?.isActive;

// Pass clear state to ProTooltip
<ProTooltip
  userType={isGuest ? 'guest' : isFree ? 'free' : 'premium'}
  onUpgrade={() => setShowProModal(true)}
  onSignIn={() => setShowProModal(true)}
/>
```

### Step 3: Simplify ProTooltip Component
```typescript
interface ProTooltipProps {
  userType: 'guest' | 'free' | 'premium';
  remainingSearches: number;
  maxSearches: number;
  onUpgrade: () => void;
  onSignIn: () => void;
  onClose: () => void;
}

export default function ProTooltip({ 
  userType,
  remainingSearches,
  maxSearches,
  onUpgrade,
  onSignIn,
  onClose
}: ProTooltipProps) {
  // Simple switch based on userType
  if (userType === 'guest') {
    return <GuestView onSignIn={onSignIn} />;
  }
  
  if (userType === 'premium') {
    return <PremiumView remainingSearches={remainingSearches} />;
  }
  
  // Free tier user
  return <FreeView onUpgrade={onUpgrade} remainingSearches={remainingSearches} />;
}
```

### Step 4: Test User Journeys

**Journey 1: Guest → Sign Up → Free Tier**
1. Load page as guest
2. Hover over Pro toggle → See "Sign in for Pro Searches"
3. Click "Sign in" → Sign up with Google
4. After sign in, reload page
5. Hover over Pro toggle → Should see "Upgrade to Premium" ✅

**Journey 2: Free Tier → Upgrade**
1. Sign in as free tier user
2. Hover over Pro toggle → See "Upgrade to Premium"
3. Click "Upgrade to Premium" → ProModal opens ✅
4. See Monthly/Yearly plans
5. Click Stripe checkout

**Journey 3: Premium User**
1. Sign in as premium user
2. Hover over Pro toggle → See daily quota
3. No upgrade button shown ✅

---

## 🎯 Success Criteria

### Must Have:
- [ ] Free tier users see "Upgrade to Premium" button
- [ ] Clicking button opens ProModal
- [ ] ProModal shows subscription plans
- [ ] Guest users see "Sign in" prompt
- [ ] Premium users see quota display

### Should Have:
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Consistent styling across all views
- [ ] Smooth transitions between states

### Nice to Have:
- [ ] Loading states while fetching session/subscription
- [ ] Error handling for failed subscription fetch
- [ ] Graceful degradation if Supabase is down

---

## 📦 Files to Modify

1. **src/hooks/useSession.ts** ✅ (Already fixed time skew)
2. **src/hooks/useSubscription.ts** (Add loading state)
3. **src/components/boxContainer/SearchBox.tsx** (Add loading check)
4. **src/components/subscription/ProTooltip.tsx** (Simplify logic)

---

## 🚀 Deployment Plan

### Phase 1: Add Debugging (Done ✅)
- [x] Add console logs to track state
- [x] Deploy to production
- [x] Collect console output from user

### Phase 2: Apply Fixes
- [ ] Implement loading state checks
- [ ] Simplify ProTooltip logic
- [ ] Test locally
- [ ] Deploy to production

### Phase 3: Verify
- [ ] User tests the flow
- [ ] Confirm "Upgrade to Premium" works
- [ ] Remove debug logs
- [ ] Final deployment

---

## 🔗 Related Files

- `src/mainPages/Home.tsx` - Working example with isStandard
- `src/components/StandardUserBanner.tsx` - Working upgrade flow
- `src/components/subscription/ProModal.tsx` - The modal that should open
- `docs/DEBUG_SUBSCRIPTION_WORKFLOW.md` - Debugging guide

---

## 📊 Decision Log

### Decision 1: Use UserType Enum
**Chosen:** Pass `userType: 'guest' | 'free' | 'premium'` prop
**Alternative:** Pass `isLoggedIn` and `subscription` separately
**Reason:** Simpler, more explicit, less prone to timing bugs

### Decision 2: Wait for Loading States
**Chosen:** Don't show tooltip until session and subscription loaded
**Alternative:** Show tooltip immediately, update when data loads
**Reason:** Prevents flickering between guest/free views

### Decision 3: Keep Existing Modal
**Chosen:** Reuse existing ProModal component
**Alternative:** Create new modal specifically for SearchBox
**Reason:** DRY principle, already works in StandardUserBanner

---

## ✅ Next Actions

1. Review this plan with user
2. Get console logs from production to confirm root cause
3. Implement Phase 2 fixes (loading states)
4. Test locally with different user states
5. Deploy and verify
