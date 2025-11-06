# Mobile Responsive Fix - Regular Search Results

## Issue
The regular search results page was showing horizontal scroll on mobile portrait view, making the page wider than the screen.

## Root Causes
1. **Fixed padding**: `px-6` padding on TopBar and main container created unnecessary width on small screens
2. **Fixed grid columns**: `grid-cols-4` forced 4 columns even on mobile, cramping content
3. **Tab spacing**: `space-x-8` gap between tabs created overflow on narrow screens
4. **No text truncation**: Long query titles could extend beyond viewport
5. **Hidden time indicator**: Displayed on mobile, adding unnecessary width

## Changes Applied

### 1. TopBar.tsx (`src/components/results/TopBar.tsx`)

#### Header Container
- **Before**: `px-6 py-4`
- **After**: `px-4 sm:px-6 py-4`
- Reduces horizontal padding on mobile (16px → 24px on sm+)

#### Query Title Container
- **Before**: `flex items-center gap-4`
- **After**: `flex items-center gap-2 sm:gap-4 flex-1 min-w-0 mr-2`
- Reduced gap on mobile
- Added `flex-1 min-w-0` for proper text truncation
- Added margin-right for spacing from ShareMenu

#### Back Button
- **After**: Added `flex-shrink-0` to prevent button from shrinking

#### Query Title (h1)
- **Before**: `text-xl font-medium text-gray-900 dark:text-white`
- **After**: `text-lg sm:text-xl font-medium text-gray-900 dark:text-white truncate`
- Smaller text on mobile
- Added `truncate` to prevent overflow from long queries

#### Time Indicator
- **Before**: Always visible
- **After**: `hidden sm:flex items-center gap-1.5 text-gray-500 dark:text-gray-400 flex-shrink-0`
- Hidden on mobile (shows on sm+ screens)
- Added `flex-shrink-0` to prevent compression

#### Tab Navigation Container
- **Before**: `px-6`
- **After**: `px-4 sm:px-6`
- Reduced padding on mobile

#### Tab Navigation Flex
- **Before**: `flex space-x-8`
- **After**: `flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide`
- Reduced gap on mobile (16px → 32px on sm+)
- Added `overflow-x-auto` for horizontal scrolling if needed
- Added `scrollbar-hide` to hide scrollbar (cleaner UX)

#### Tab Buttons
- **After**: Added `whitespace-nowrap flex-shrink-0`
- Prevents text wrapping
- Prevents tabs from shrinking

### 2. TabbedContent.tsx (`src/components/results/TabbedContent.tsx`)

#### Sources Grid (Answer Tab)
- **Before**: `grid grid-cols-4 gap-2 mb-6`
- **After**: `grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6`
- 2 columns on mobile, 4 on tablet+

#### Images Grid (Answer Tab)
- **Before**: `grid grid-cols-4 gap-3 mb-6`
- **After**: `grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6`
- 2 columns on mobile, 4 on tablet+

### 3. SearchResults.tsx (`src/services/search/regular/pages/SearchResults.tsx`)

#### Main Container
- **Before**: `max-w-7xl mx-auto px-6 py-6`
- **After**: `max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6`
- Reduced horizontal and vertical padding on mobile

### 4. index.css (`src/index.css`)

#### Scrollbar Hide Utility
Added custom utility class for hiding scrollbars:
```css
.scrollbar-hide {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;  /* Chrome, Safari and Opera */
}
```

## Responsive Breakpoints Used
- Default (mobile): 0px - 639px
- `sm:`: 640px and up (tablet/desktop)

## Benefits
1. ✅ No horizontal scroll on mobile portrait view
2. ✅ Content fits within screen width
3. ✅ Better text hierarchy with responsive font sizes
4. ✅ Cleaner layout with appropriate spacing
5. ✅ Tabs scroll horizontally if needed (with hidden scrollbar)
6. ✅ Grid layouts adapt to screen size (2 cols mobile, 4 cols tablet+)
7. ✅ Desktop experience unchanged

## Testing
Test on multiple devices:
- Mobile portrait (< 640px): Should see reduced padding, 2-column grids, smaller text
- Tablet (640px+): Should see normal padding, 4-column grids, full text
- Desktop: Unchanged experience

## Files Modified
1. `/Users/marcelo/Documents/Curios/src/components/results/TopBar.tsx`
2. `/Users/marcelo/Documents/Curios/src/components/results/TabbedContent.tsx`
3. `/Users/marcelo/Documents/Curios/src/services/search/regular/pages/SearchResults.tsx`
4. `/Users/marcelo/Documents/Curios/src/index.css`

## Status
✅ **Complete** - All mobile responsive fixes applied for regular search results page
