# Session Restoration Freeze Fix

**Date:** December 1, 2025  
**Issue:** App freezes when reopening with active session

## Problem Description

### Scenario
1. User signs in to CuriosAI
2. User closes browser/tab
3. User reopens https://curiosai.com
4. **Expected:** App loads with user still signed in
5. **Actual:** App freezes after showing "User signed in" in console

### Symptoms
- Agents initialize correctly (SearchRetriever, SearchWriter, etc.)
- Supabase auth says "User signed in"
- But UI becomes unresponsive
- User must manually run `localStorage.clear()` and reload

### Root Cause
Session restoration process could hang indefinitely if:
- Profile fetch takes too long
- Subscription fetch never completes  
- Network request hangs
- Race condition in async operations

No timeout protection meant the app would freeze forever waiting for these operations.

## Solution Implemented

### 1. Session Restoration Timeout (`useSession.ts`)

Added 10-second timeout for session restoration:

```typescript
// Safety timeout - if session doesn't load in 10 seconds, force logout
timeoutRef.current = setTimeout(() => {
  if (isLoading) {
    console.error('Session restoration timeout - forcing logout');
    clearLocalSession('Session restore timed out. Please sign in again.');
    setIsLoading(false);
  }
}, SESSION_RESTORE_TIMEOUT);
```

**Why 10 seconds:**
- Normal session restore: <1 second
- Slow network: 2-5 seconds
- 10 seconds = reasonable maximum
- After 10s, better to logout than freeze

### 2. Subscription Fetch Timeout (`useSubscription.ts`)

Added 5-second timeout for subscription fetch:

```typescript
// Set timeout for subscription fetch
fetchTimeoutRef.current = setTimeout(() => {
  console.error('⚠️ Subscription fetch timeout - using fallback');
  setSubscription({
    status: 'inactive',
    periodEnd: null,
    isActive: false,
    isPro: false,
  });
  setLoading(false);
}, SUBSCRIPTION_FETCH_TIMEOUT);
```

**Why 5 seconds:**
- Normal subscription fetch: <500ms
- Slow network: 1-2 seconds
- 5 seconds = safe maximum
- Falls back to free tier if timeout

### 3. Enhanced Logging

Added emoji-based logging for easy debugging:

```typescript
console.log('🔄 Fetching session...');
console.log('✅ Session found, validating...');
console.log('❌ Session token invalid, clearing');
console.log('⚠️ Time skew detected but continuing');
console.log('ℹ️ No session found (guest user)');
```

**Benefits:**
- Easy to spot status at a glance
- Clear progression through restoration
- Quickly identify where it fails

### 4. Graceful Degradation

Profile ensure failure no longer blocks session:

```typescript
if (nextSession?.user) {
  try {
    await ensureProfileExists(nextSession.user);
  } catch (error) {
    console.warn('Failed to ensure profile exists:', error);
    // Don't fail - continue with session
  }
}
```

**Why:**
- Profile can be created later if needed
- Don't block sign-in for profile issues
- Better UX - let user in, fix profile in background

### 5. Proper Cleanup

Timeouts are cleared on unmount:

```typescript
return () => {
  subscription.unsubscribe();
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
};
```

**Why:**
- Prevents memory leaks
- Stops timers in unmounted components
- Clean React lifecycle management

## User Experience

### Before Fix:
1. User reopens app
2. Agents initialize ✅
3. "User signed in" appears ✅
4. **App freezes** ❌
5. Must manually clear storage
6. Must reload page
7. Must sign in again

### After Fix:
1. User reopens app
2. Agents initialize ✅
3. "User signed in" appears ✅
4. **Session validates** (with timeout protection) ✅
5. **Subscription loads** (with timeout protection) ✅
6. **App continues normally** ✅
7. User can immediately start using app
8. If anything hangs > 10s → auto-logout (safe fallback)

## Fallback Behavior

If session restoration takes > 10 seconds:
- ✅ Automatic logout
- ✅ Clear user message explaining what happened
- ✅ App continues in guest mode
- ✅ User can sign in again
- ❌ No freeze, no manual intervention needed

If subscription fetch takes > 5 seconds:
- ✅ Falls back to free tier
- ✅ User can still use app
- ✅ Next page load will retry
- ❌ No freeze, no errors shown

## Debugging

### Console Messages to Watch For:

**Normal Flow:**
```
🔄 Fetching session...
✅ Session found, validating...
✅ Session validated successfully
🔄 Fetching subscription for user: abc123
✅ Subscription fetched: { status: 'active', isActive: true }
✅ Session loading complete
```

**Timeout (now gracefully handled):**
```
🔄 Fetching session...
❌ Session restoration timeout - forcing logout
ℹ️ User logged out, continuing in guest mode
```

**Network Issue (gracefully handled):**
```
🔄 Fetching subscription for user: abc123
⚠️ Subscription fetch timeout - using fallback
ℹ️ Using free tier (will retry on next page load)
```

## Testing

### Test Cases:

1. **Normal Sign-in Restoration:**
   - Sign in → Close tab → Reopen
   - Should: Load smoothly with user signed in
   - Should: Take <2 seconds

2. **Slow Network:**
   - Sign in → Throttle network to 2G → Close → Reopen
   - Should: Load within 10 seconds
   - Should: Show session if successful, logout if timeout

3. **Offline Restoration:**
   - Sign in → Go offline → Close → Reopen
   - Should: Timeout after 10s
   - Should: Auto-logout with clear message

4. **Profile Missing:**
   - Sign in with user who has no profile
   - Should: Still sign in successfully
   - Should: Create profile in background

## Configuration

Timeouts can be adjusted if needed:

```typescript
// In useSession.ts
const SESSION_RESTORE_TIMEOUT = 10000; // 10 seconds

// In useSubscription.ts
const SUBSCRIPTION_FETCH_TIMEOUT = 5000; // 5 seconds
```

**Recommendations:**
- Don't set below 5s (might timeout on slow but working networks)
- Don't set above 15s (user will think app is broken)
- 10s for session, 5s for subscription = good balance

## Related Files

- `/src/hooks/useSession.ts` - Session management with timeout
- `/src/hooks/useSubscription.ts` - Subscription fetch with timeout
- `/src/lib/ensureProfile.ts` - Profile creation (non-blocking)

## Future Improvements

Potential enhancements:
1. Retry logic for failed fetches
2. Offline detection and skip timeouts
3. Progressive loading (show UI while session loads)
4. Cache subscription data for instant load
5. Service worker for offline session persistence

## Summary

**Problem:** App froze when restoring sessions on page reload

**Solution:** Added timeout protection and auto-logout fallback

**Result:** 
- ✅ Sessions restore smoothly
- ✅ No more freezing
- ✅ Graceful degradation on errors
- ✅ Better logging for debugging
- ✅ Auto-logout fallback after 10s (safe, not disruptive)
