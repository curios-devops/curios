# Mobile Citation Buttons Fix

## Issue
Citation buttons were not responding to taps on real iOS devices (iPhone 14), despite working perfectly on desktop and in browser mobile simulators.

## Root Cause
**React State Hydration Mismatch** - The `isMobile` state was initialized as `false` during SSR/initial render, then updated to `true` in `useEffect` after mount. This caused:
1. Component rendered with desktop behavior (`onClick` handlers)
2. State updated to mobile after render
3. Real iOS devices didn't re-register touch handlers properly
4. Buttons appeared clickable but didn't respond to taps

## Solution
Initialize `isMobile` state **immediately** with SSR-safe check using lazy initialization:

```tsx
// ❌ BEFORE - State updated after mount
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  setIsMobile(isTouchDevice);
}, []);

// ✅ AFTER - State initialized correctly on first render
const [isMobile, setIsMobile] = useState(() => {
  if (typeof window !== 'undefined') {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
  return false;
});
```

## Why It Works
- **Lazy initialization** (`useState(() => ...)`) runs the function once during initial render
- Touch detection happens **before** first paint
- No hydration mismatch between server and client
- Event handlers registered correctly from the start
- Real iOS devices recognize touch events properly

## Testing Verified
✅ Desktop browser (hover tooltips with 800ms delay)  
✅ Desktop mobile simulator (iPhone 14)  
✅ Real iPhone 14 Safari (touch-to-toggle)  
✅ Single citations open links directly  
✅ Multiple citations show tooltip on tap  
✅ Click outside closes tooltip  

## Related Files
- `src/components/citations/MultipleCitations.tsx` - Main fix location
- `index.html` - Viewport meta tags (viewport-fit=cover, user-scalable=no)
- `src/index.css` - Overflow controls (overflow-x: hidden, max-width: 100vw)

## Key Takeaway
When dealing with device-specific behavior in React:
1. Use lazy initialization for device detection
2. Never rely on `useEffect` for initial critical state
3. Test on real devices, not just simulators
4. Simulators may mask hydration issues that appear on real devices

## Commits
- Initial responsive fixes: `fe78c81`
- Viewport fix: `756d0b8`
- Debug logging: `5fe7102`
- Final fix: Latest commit with lazy state initialization

---
**Fixed:** January 10, 2026  
**Tested on:** iPhone 14, iOS 16.6, Safari
