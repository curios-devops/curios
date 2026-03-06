# Citation Tooltip Refactor - Jan 2, 2026

## Problem
The citation tooltips were causing memory leaks and app freezing due to:
1. React state management (`useState`)
2. Event handlers creating new functions on every render (`onMouseEnter`, `onMouseLeave`)
3. Conditional rendering triggering re-renders
4. Event handlers on images (`onError`)
5. Complex closure functions

## Solution
Refactored both components to use **pure CSS tooltips** with no JavaScript state.

---

## Final Implementation

### MultipleCitations.tsx ✅ WORKING
```tsx
// No React imports needed - using pure CSS for tooltip

export default function MultipleCitations({ citations, primarySiteName }: MultipleCitationsProps) {
  const additionalCount = citations.length - 1;

  const handleClick = (url: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <span className="relative inline-block group">
      <button
        type="button"
        onClick={() => handleClick(citations[0]?.url)}
        className="inline-flex items-center px-2 py-0.5 mx-0.5 text-white text-xs font-medium rounded-md cursor-pointer hover:opacity-90"
        style={{ backgroundColor: 'var(--accent-primary)' }}
      >
        {primarySiteName} +{additionalCount}
      </button>
      
      {/* CSS-only tooltip */}
      <span className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
        <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></span>
        Sources
      </span>
    </span>
  );
}
```

### CitationTooltip.tsx ✅ NOW MATCHES
```tsx
// No React imports needed - using pure CSS for tooltip

export default function CitationTooltip({ citation, children }: CitationTooltipProps) {
  return (
    <span className="relative inline-block group">
      <button
        type="button"
        onClick={() => citation.url && window.open(citation.url, '_blank', 'noopener,noreferrer')}
        className="inline-flex items-center px-2 py-0.5 mx-0.5 text-white text-xs font-medium rounded-md cursor-pointer hover:opacity-90"
        style={{ backgroundColor: 'var(--accent-primary)' }}
      >
        {children}
      </button>
      
      {/* CSS-only tooltip */}
      <span className="invisible group-hover:visible absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
        <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></span>
        Source
      </span>
    </span>
  );
}
```

---

## Key Differences Eliminated

| Issue | Before | After ✅ |
|-------|--------|----------|
| **React State** | `useState(false)` | None - Pure CSS |
| **Event Handlers** | `onMouseEnter/onMouseLeave` | None - CSS `:hover` |
| **Function Closures** | `handleClick()` closure | Inline arrow function |
| **Conditional Render** | `{showTooltip && <div>...}` | Always rendered, CSS hides |
| **Element Type** | `<div>` | `<span>` |
| **Semantic Tags** | `<h4>`, `<p>` | `<span>` only |
| **Image Handlers** | `onError={(e) => ...}` | Removed (commented out) |
| **Complex Logic** | Domain parsing, URL manipulation | Simple text only |

---

## CSS Pattern Used

```tsx
// Parent container
<span className="relative inline-block group">
  
  // Trigger element
  <button>Click me</button>
  
  // Tooltip (hidden by default, shown on group hover)
  <span className="invisible group-hover:visible absolute ... pointer-events-none">
    Content
  </span>
</span>
```

### Key CSS Classes:
- **`group`** - Tailwind's group hover utility
- **`invisible`** - Hidden by default (not `hidden`, which removes from DOM)
- **`group-hover:visible`** - Shows when parent is hovered
- **`pointer-events-none`** - Prevents tooltip from blocking hover

---

## Benefits

✅ **No Memory Leaks** - No state to manage, no closures capturing stale data
✅ **No Re-renders** - Pure CSS, no React state changes
✅ **Better Performance** - Browser-native hover handling
✅ **Simpler Code** - Fewer lines, easier to understand
✅ **Standard Pattern** - Common CSS tooltip approach
✅ **No Race Conditions** - No async state updates
✅ **Consistent** - Both components use identical pattern

---

## Future Enhancement

Rich tooltip with favicon, title, and snippet is saved in comments at bottom of `CitationTooltip.tsx`.

Once simple version is confirmed stable, we can gradually add back features:
1. First add static domain name
2. Then add title (from props, no computation)
3. Finally add snippet (from props, no computation)
4. Last, add favicon (carefully test for leaks)

**DO NOT** add back:
- Any `useState`
- Any `onMouseEnter/onMouseLeave`
- Any `onError` handlers
- Any complex URL parsing inside the render

Keep everything as **props → render**, no side effects.
