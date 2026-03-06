Accent color system
====================

Overview
--------
This document describes the project's global accent color system (light + dark variants) and the hover colors used for interactive states. Colors follow the "Hue Consistency Rule": each accent keeps the same hue across light and dark themes, while lightness/saturation change.

Usage
-----
- Palette values are defined in `src/config/themeColors.ts`.
- Use the `useAccentColor()` hook to read the currently selected color in components.
- CSS variables set by `applyThemeColors()` (called from ThemeContext) are:
  - `--accent-primary`
  - `--accent-hover`
  - `--accent-light`
  - `--accent-dark`

Accent palettes
---------------

Blue
-----
- Light
  - primary: #007BFF
  - hover:   #0056B3
  - light:   #E3F2FF
  - dark:    #003D7A
- Dark
  - primary: #007BFF
  - hover:   #0056B3
  - light:   #1565C0
  - dark:    #3399FF

Green
-----
- Light
  - primary: #28B558
  - hover:   #229A4A
  - light:   #D4EDDA
  - dark:    #1C7F3C
- Dark
  - primary: #30D158
  - hover:   #28B049
  - light:   #1a3d23
  - dark:    #4ADE80

Purple
------
- Light
  - primary: #4A2ED6
  - hover:   #3E26B5
  - light:   #E2D9F3
  - dark:    #321E94
- Dark
  - primary: #5C3BFE
  - hover:   #4A2FD6
  - light:   #2d1b4e
  - dark:    #C4B5FD

Orange
------
- Light
  - primary: #E64A19
  - hover:   #C23E15
  - light:   #FFE5D0
  - dark:    #A03311
- Dark
  - primary: #FF5722
  - hover:   #FF6E40
  - light:   #4a3310
  - dark:    #FF8A65

Notes
-----
- The `primary` color is the main accent used for active controls, selected states, badges, and interactive highlights.
- The `hover` color should be used for mouse-hover states and focus indicators.
- The `light` / `dark` colors are available for backgrounds and borders when subtle variants are required.
- Keep accents purely visual — do not encode semantic meaning (e.g., green = success) unless intentionally designed.

Implementation details
----------------------
- Accent values and helper functions live in `src/config/themeColors.ts`.
- Theme application occurs via `applyThemeColors()` which sets CSS variables on `:root`.
- Prefer `useAccentColor()` hook in components to read current accent colors; this keeps components theme-aware and testable.

FAQ
---
Q: Why are some dark and light primary colors identical (e.g., blue)?
A: In some cases we prefer exact hue parity between themes for visual consistency. The hover, light, and dark variants are still adjusted to match each theme's contrast needs.

Q: Where should I add a new accent color?
A: Add a new AccentColor entry in `src/config/themeColors.ts` following the existing structure (light/dark groups) and export the proper type if needed.