# Session Restoration Premature Logout Fix

## Problem
The 10-second timeout added to fix the session restoration freeze was too aggressive. It caused users to be logged out even when their session was valid, simply because the profile/subscription data was still loading.

### User Experience
1. User signs in
2. User closes browser
3. User reopens app
4. App shows loading for a few seconds
5. **User gets logged out** (even though session is valid)
6. User has to sign in again

## Root Cause
The timeout in `useSession` was designed to prevent infinite freezes, but it treated slow profile loading the same as a true session failure. The timeout would fire after 10 seconds regardless of whether:
- The session was invalid (should logout)
- The profile was just taking time to load (should keep session)

## Solution: Coordinated Loading States

### Architecture Changes

1. **useSession Hook** (`/src/hooks/useSession.ts`)
   - Added `markSessionLoaded` callback method
   - Session restoration now waits for signal from profile/subscription
   - Timeout (15s) only triggers if `markSessionLoaded` is never called
   - Loading state only shows during initial auth check, not profile fetch

2. **useSubscription Hook** (`/src/hooks/useSubscription.ts`)
   - Accepts optional `markSessionLoaded` callback parameter
   - Calls callback when profile/subscription loading completes (success or failure)
   - Signals completion even for guest users and timeouts

3. **SessionCoordinator Component** (`/src/components/SessionCoordinator.tsx`)
   - New wrapper component that coordinates the two hooks
   - Passes `markSessionLoaded` from useSession to useSubscription
   - Shows loading UI only during session validation, not profile fetch
   - Integrated into app root in `main.tsx`

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        App Reopens                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ useSession: Fetch and validate session                           │
│ - Get session from Supabase                                      │
│ - Validate token with getUser()                                  │
│ - Check profile exists with ensureProfileExists()                │
│ - Start 15s timeout (fallback for true failures)                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ useSubscription: Fetch profile & subscription                    │
│ - Query profiles table                                           │
│ - Get subscription status                                        │
│ - Has its own 5s timeout for profile fetch                       │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ useSubscription: Calls markSessionLoaded()                       │
│ - Signals completion to useSession                               │
│ - Clears the 15s timeout                                         │
│ - Sets isLoading = false                                         │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ User stays logged in! ✅                                         │
│ - Session is preserved                                           │
│ - Profile/subscription data loaded                               │
│ - No premature timeout/logout                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Timeout Protection

The solution maintains freeze protection through layered timeouts:

1. **useSubscription timeout (5s)**
   - Protects against slow profile queries
   - Falls back to free tier if timeout
   - Still calls `markSessionLoaded` (keeps session active)

2. **useSession timeout (15s)**
   - Protects against catastrophic failures
   - Only triggers if `markSessionLoaded` is never called
   - Stops loading UI but keeps session if valid

3. **Coordination via callback**
   - `markSessionLoaded` signals completion
   - Clears timeout when profile loading finishes
   - Decouples session validation from profile fetching

## Implementation Details

### useSession Changes

```typescript
// Add callback reference
const isSessionLoadedRef = useRef(false);
const SESSION_RESTORE_TIMEOUT = 15000; // 15 seconds

// Start timeout AFTER session is found
timeoutRef.current = setTimeout(() => {
  if (isLoading && !isSessionLoadedRef.current) {
    console.warn('⏰ Session restoration taking >15s - keeping session but stopping loading UI');
    setIsLoading(false);
  }
}, SESSION_RESTORE_TIMEOUT);

// Provide callback method
const markSessionLoaded = useCallback(() => {
  console.log('✅ markSessionLoaded called - profile/subscription complete');
  isSessionLoadedRef.current = true;
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
  setIsLoading(false);
}, []);

return {
  session,
  isLoading,
  error: sessionError,
  isResetting,
  resetSession,
  markSessionLoaded, // Export for coordination
};
```

### useSubscription Changes

```typescript
export function useSubscription(markSessionLoaded?: () => void) {
  // ... existing code ...

  useEffect(() => {
    if (!session?.user) {
      setSubscription(null);
      setLoading(false);
      // Signal completion for guest users
      if (markSessionLoaded) {
        markSessionLoaded();
      }
      return;
    }

    // ... fetch subscription ...

    try {
      // ... fetch logic ...
    } finally {
      setLoading(false);
      // Signal completion when done
      if (markSessionLoaded) {
        markSessionLoaded();
      }
    }
  }, [session, markSessionLoaded]);
}
```

### SessionCoordinator Integration

```typescript
export function SessionCoordinator({ children }: SessionCoordinatorProps) {
  const { session, isLoading: sessionLoading, markSessionLoaded } = useSession();
  
  // Pass markSessionLoaded to useSubscription for coordination
  const { subscription, loading: subscriptionLoading } = useSubscription(markSessionLoaded);

  // Show loading only during initial session check
  if (sessionLoading && !session) {
    return <LoadingUI />;
  }

  return <>{children}</>;
}
```

## Testing Instructions

### Test Case 1: Normal Session Restoration
1. Sign in to the app
2. Close browser completely
3. Reopen browser and navigate to app
4. **Expected**: User stays logged in, smooth transition to home page
5. **Console**: Should show "✅ markSessionLoaded called"

### Test Case 2: Slow Network
1. Sign in to the app
2. Open DevTools → Network → Throttling → Slow 3G
3. Close and reopen browser
4. **Expected**: Loading takes longer but user stays logged in
5. **Console**: Should not show timeout warnings

### Test Case 3: True Session Failure
1. Sign in to the app
2. Manually invalidate session in Supabase dashboard
3. Reopen browser
4. **Expected**: User is logged out with error message
5. **Console**: Should show "❌ Session token invalid"

### Test Case 4: Guest User
1. Visit app without signing in
2. Close and reopen browser
3. **Expected**: Instant load, no loading UI
4. **Console**: Should show "ℹ️ No session found (guest user)"

## Key Benefits

### 1. **No More Premature Logout**
Users stay logged in even if profile/subscription takes time to load.

### 2. **Maintained Freeze Protection**
15-second fallback timeout still prevents infinite hangs.

### 3. **Better UX**
Loading UI only shows during auth check, not profile fetch.

### 4. **Clean Architecture**
Clear separation between:
- Session validation (useSession)
- Profile fetching (useSubscription)
- Coordination (SessionCoordinator)

### 5. **Robust Error Handling**
Multiple timeout layers ensure graceful degradation:
- Profile timeout (5s) → fallback to free tier
- Session timeout (15s) → stop loading UI
- Always call markSessionLoaded (even on errors)

## Console Logs for Debugging

When session restoration works correctly, you'll see:

```
🔄 Fetching session...
✅ Session found, validating... user-id-here
✅ Session validated successfully
🔄 Fetching subscription for user: user-id-here
✅ Subscription fetched: { userId: "...", status: "active", isActive: true }
✅ markSessionLoaded called - profile/subscription complete
🔄 Session Coordinator State: { hasSession: true, sessionLoading: false, subscriptionLoading: false }
```

When there's an issue:

```
🔄 Fetching session...
✅ Session found, validating... user-id-here
⚠️ Subscription fetch timeout - using fallback
✅ markSessionLoaded called - profile/subscription complete
```

## Files Changed

1. `/src/hooks/useSession.ts` - Added markSessionLoaded callback, increased timeout to 15s
2. `/src/hooks/useSubscription.ts` - Added markSessionLoaded parameter, calls it on completion
3. `/src/components/SessionCoordinator.tsx` - New component to coordinate loading states
4. `/src/main.tsx` - Integrated SessionCoordinator into app root

## Related Issues

- ✅ Fixed: SESSION_RESTORATION_FREEZE_FIX.md - Added original 10s timeout
- ✅ Fixed: This document - Improved timeout to prevent premature logout
- ⚠️ Note: Maintains compatibility with STRIPE_CANCEL_FREEZE_FIX.md

## Version History

- **v1**: Added 10s timeout to prevent infinite freeze (too aggressive)
- **v2**: This fix - Coordinated loading with 15s fallback (balanced approach)

---

**Status**: ✅ Implemented, Ready for Testing
**Priority**: High (Affects user authentication experience)
**Impact**: Positive (Better UX without losing freeze protection)
