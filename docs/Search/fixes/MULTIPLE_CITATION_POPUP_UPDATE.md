# Multiple Citation Popup Update

**Date**: 2026-05-15
**Status**: Complete ✓

## Problem

Multiple citation badges (e.g., `[wikipedia +2]`) were working but the popup showed a simple list of all sources. The design needed to match the screenshot reference with:
- Navigation arrows with "x / n" counter
- One citation displayed at a time
- Each citation showing: icon, website name, title (as link), and snippet
- Footer showing "n sources" count

## Solution

**File**: [MultipleCitations.tsx](../../../src/components/citations/MultipleCitations.tsx)

Updated the multiple citation popup to show a navigable card-style interface instead of a simple list.

### Key Changes

#### 1. Added Navigation State
```typescript
const [currentIndex, setCurrentIndex] = useState(0);
```

Tracks which citation is currently being displayed (0-indexed).

#### 2. Navigation Header
```tsx
<div className="flex items-center justify-between px-3 py-2 border-b">
  {/* Previous button */}
  <button onClick={() => setCurrentIndex(prev => prev > 0 ? prev - 1 : length - 1)}>
    <svg>← arrow</svg>
  </button>

  {/* Counter */}
  <span>{currentIndex + 1} / {uniqueCitations.length}</span>

  {/* Next button */}
  <button onClick={() => setCurrentIndex(prev => prev < length - 1 ? prev + 1 : 0)}>
    <svg>→ arrow</svg>
  </button>
</div>
```

**Features**:
- Left/right arrow buttons for navigation
- Current position displayed as "x / n" (e.g., "2 / 5")
- Circular navigation (wraps around at ends)

#### 3. Single Citation Display
```tsx
{(() => {
  const citation = uniqueCitations[currentIndex];
  const faviconDomain = getFaviconDomain(citation.url);

  return (
    <div className="p-3">
      {/* Icon and website name */}
      <div className="flex items-center gap-2 mb-2">
        <img src={`favicon url`} className="w-5 h-5" />
        <span className="text-sm font-medium capitalize">
          {citation.siteName}
        </span>
      </div>

      {/* Title with link */}
      <a href={citation.url} target="_blank"
         className="block text-sm font-medium hover:text-accent mb-2 line-clamp-2">
        {citation.title}
      </a>

      {/* Snippet */}
      {citation.snippet && (
        <p className="text-xs text-gray-600 line-clamp-3">
          {citation.snippet}
        </p>
      )}
    </div>
  );
})()}
```

**Layout**:
1. **Top row**: Favicon (5x5) + Website name (capitalized)
2. **Middle**: Clickable title (line-clamp-2, max 2 lines)
3. **Bottom**: Snippet text (line-clamp-3, max 3 lines)

#### 4. Footer with Source Count
```tsx
<div className="px-3 py-2 border-t text-center">
  <span className="text-xs text-gray-500">
    {uniqueCitations.length} source{uniqueCitations.length !== 1 ? 's' : ''}
  </span>
</div>
```

Shows total number of sources (e.g., "3 sources", "1 source").

## Visual Structure

### Badge
```
[wikipedia +2]
```
Shows primary source name + count of additional sources.

### Popup (on hover/click)
```
┌────────────────────────────────┐
│  <   2 / 3   >                 │ ← Navigation header
├────────────────────────────────┤
│  🌐 nytimes                    │ ← Icon + site name
│                                │
│  Article Title Here            │ ← Clickable title (link)
│  Continues if long...          │
│                                │
│  Article snippet text here     │ ← Snippet (3 lines max)
│  showing preview of content... │
│  truncated if too long         │
├────────────────────────────────┤
│         3 sources              │ ← Footer count
└────────────────────────────────┘
         ▼ (arrow pointing to badge)
```

## Dimensions & Styling

- **Popup width**: `w-80` (320px)
- **Favicon size**: `w-5 h-5` (20px)
- **Title**: `text-sm`, `line-clamp-2`, hover changes to accent color
- **Snippet**: `text-xs`, `line-clamp-3`, gray text
- **Navigation arrows**: `w-4 h-4` SVG icons
- **Position**: Bottom-full (above badge), centered

## User Interaction

1. **Hover (desktop)**: Shows popup with first citation (index 0)
2. **Click badge (mobile)**: Toggles popup
3. **Click arrows**: Navigate between citations
4. **Click title**: Opens source URL in new tab
5. **Click outside (mobile)**: Closes popup
6. **Hover tooltip (desktop)**: Stays open when mouse over popup

## Navigation Behavior

- **Previous arrow**: Goes to previous citation, wraps to last if at first
- **Next arrow**: Goes to next citation, wraps to first if at last
- **Counter**: Always shows `current / total` (1-indexed for display)

## Benefits

1. **Cleaner UI**: Shows one citation at a time instead of cluttered list
2. **Better Readability**: More space for title and snippet
3. **Easy Navigation**: Clear arrows and counter
4. **Consistent**: Matches modern citation popup patterns
5. **Mobile-Friendly**: Touch-friendly navigation buttons

## Technical Details

- **State management**: Single `currentIndex` state tracks position
- **Deduplication**: Citations deduplicated by URL (as before)
- **Circular navigation**: Modulo arithmetic for wrapping
- **Event handling**: stopPropagation prevents closing on internal clicks
- **Accessibility**: aria-labels on navigation buttons

---

**Status**: Multiple citation popup updated with navigation ✓
