# Search Box Controls Reorganization

## Summary
Reorganized the home page search box controls to separate file uploads from mode selection and make the mode selector more prominent.

## Changes Made

### Previous Layout
```
[+] [Mode Chip]  ...space...  [Mic/Search Button]
 └─ Upload Photos & Files
 └─ Fast Search
 └─ Stories
 └─ Avatar
 └─ Cinematic
```

### New Layout
```
[+] [Search ▼]  ...space...  [Mic/Search Button]
 │   └─ Search (default)
 │   └─ Fast Search
 │   └─ Stories
 │   └─ Avatar
 │   └─ Cinematic
 │
 └─ Upload Photos & Files
```

## Key Features

1. **Separated Controls**:
   - `+` button: Only contains "Upload Photos & Files"
   - Mode selector: New dropdown button showing current mode

2. **Mode Selector Design**:
   - Styled as rounded rectangle (matching mic button style)
   - Shows search icon + current mode label + chevron down
   - Displays "Search" by default
   - Updates to show selected mode (Fast Search, Stories, etc.)
   - Hover effect with accent color
   - Same visual consistency as other action buttons

3. **Mode Dropdown Menu**:
   - Opens upward (bottom-full mb-2)
   - Shows all available modes with icons
   - "Search" mode included as first option (default)
   - Active mode indicated by accent color + red dot
   - Hover states for better UX

## Files Modified

### [src/components/boxContainer/ButtonBar.tsx](src/components/boxContainer/ButtonBar.tsx)
- Added `Search` and `ChevronDown` icons from lucide-react
- Added `useState` and `useRef` for mode menu state management
- Added `useAccentColor` hook for styling
- Created `getModeLabel()` helper function
- Removed `ModeChip` component (no longer needed)
- Split Plus dropdown to only show file uploads
- Added new mode selector dropdown with all modes
- Added click-outside handler for mode menu

## User Experience Improvements

1. **Clearer Separation**: File uploads and mode selection are now distinct actions
2. **Always Visible Mode**: Users can always see which mode is active in the dropdown button
3. **Consistent Design**: Mode selector matches the visual style of other controls
4. **Better Organization**: Logical grouping of related functions
5. **Search as Default**: "Search" is explicitly shown as the first/default option

## Technical Details

- Mode selector uses same styling pattern as ActionButton
- Dropdown positioning: `absolute bottom-full mb-2 left-0`
- Click-outside detection using useEffect + event listener
- Accent color integration for hover states
- Maintains all existing functionality (navigation, quota checks, etc.)
