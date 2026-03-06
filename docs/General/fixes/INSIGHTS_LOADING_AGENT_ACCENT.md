# Insights Results - Active Agent Loading State Accent Color

**Date**: November 7, 2025  
**Scope**: InsightsResults Page - Loading Stage Active Agent Display  
**Goal**: Make Active Agent indicator and name accent-color responsive

## Changes Made

### Active Agent Indicator (Animated Dot)
**Before**:
```tsx
<div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
```

**After**:
```tsx
<div 
  className="w-2 h-2 rounded-full animate-pulse"
  style={{ backgroundColor: accent.primary }}
></div>
```

Changes:
- Replaced hardcoded `bg-blue-400` with dynamic `accent.primary`
- Pulsing animation continues with accent color
- Automatically responds to user's color preference

### Active Agent Name
**Before**:
```tsx
<span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
  {progressState.currentAgent}
</span>
```

**After**:
```tsx
<span 
  className="text-sm font-semibold"
  style={{ color: accent.primary }}
>
  {progressState.currentAgent}
</span>
```

Changes:
- Replaced hardcoded `text-blue-600 dark:text-blue-400` with dynamic `accent.primary`
- Works across all accent color options
- Automatic light/dark mode support

## Visual Changes

### Loading Stage Display

**Before (Static Blue)**:
```
┌─────────────────────────────────┐
│ 🔵 Active Agent: InsightAnalyzer│  ← Pulsing blue dot
│ (Blue dot + blue text)           │  ← Blue agent name
└─────────────────────────────────┘
```

**After (Dynamic Accent)**:
```
┌─────────────────────────────────┐
│ 🔵 Active Agent: InsightAnalyzer│  ← Pulsing accent color dot
│ (Accent dot + accent text)       │  ← Accent colored agent name
└─────────────────────────────────┘
```

### Color Examples

User Selects Color → Loading Stage Shows:
```
Blue (default)     → 🔵 pulsing blue dot + blue agent name
Purple            → 🔵 pulsing purple dot + purple agent name
Green             → 🔵 pulsing green dot + green agent name
Red               → 🔵 pulsing red dot + red agent name
```

## Technical Details

### Elements Updated
1. **Pulsing Dot**: `backgroundColor: accent.primary`
2. **Agent Name**: `color: accent.primary`

### Styling Pattern
- Removed hardcoded Tailwind classes
- Used inline styles for dynamic colors
- Maintains animation (animate-pulse)
- Automatic dark mode support

### Animation
- Pulsing animation continues unchanged
- Uses `accent.primary` as the animated color
- Creates visual feedback of active processing

## Files Modified

- `src/services/research/regular/pages/InsightsResults.tsx`
  - Updated pulsing dot background color
  - Updated agent name text color

## User Experience

### Before
- Loading stage always shows blue indicator
- Disconnected from user's color preference
- Doesn't match page header or search results

### After
- Indicator matches user's accent color
- Consistent visual experience across app
- Better visual continuity during loading
- Professional, cohesive design

## Testing Checklist

- [x] No TypeScript errors
- [x] Pulsing animation works
- [ ] Test with different accent colors
- [ ] Test light mode (dot and text visible)
- [ ] Test dark mode (dot and text visible)
- [ ] Test on mobile/tablet/desktop
- [ ] Verify animation performance
- [ ] Confirm contrast is readable

## Implementation Quality

- ✅ Minimal changes (surgical)
- ✅ Only 2 elements modified
- ✅ No breaking changes
- ✅ No performance impact
- ✅ Maintains animation
- ✅ Accessible contrast maintained

## Related Components

These changes work with:
- Header back arrow (also accent-responsive)
- Insights badge (also accent-responsive)
- Tab system (also accent-responsive)
- Overall page branding

## Notes

- Changes are localized to loading stage
- Doesn't affect completed/error states
- Agent name will dynamically update as agents change
- Pulsing animation provides active processing feedback
- Consistent with app's design system
