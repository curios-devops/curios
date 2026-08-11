# CuriosAI — App Settings

Plain, non-technical settings for the app's chrome (top bar, header, sidebar).
**How to use:** change the value on the right of each `=`, save, commit, redeploy.
Anything invalid or misspelled falls back to its **Default** automatically — you
can't break the app from here. No secrets live in this file (those stay in `.env`).

Only lines written as `KEY = value` are read. Everything else — these notes, the
`###` titles, the `======` section rules — is ignored, so comment freely.

Sizes use **L / M / S** (M is the everyday size; L is bigger, S smaller).


====================================================================
====================== GENERAL =====================================
====================================================================

### THEME — default theme for first-time visitors
Applies before a visitor picks their own. Default = SYSTEM · Valid: SYSTEM / LIGHT / DARK
```
THEME = SYSTEM
```

### BANNER — show or hide the top promo banner
Default = OFF · Valid: ON / OFF
```
BANNER = ON
```

### BANNER_TEXT — the message inside the banner (only when BANNER = ON)
Recommended length: **up to ~90 characters** (it scrolls, so longer works, but
reads best under ~90 on a phone). Current example ≈ 85.
```
BANNER_TEXT = ☀️ Summer Sale • Limited Time Only • 50% Discount • Grab It Before It Melts! 🏖️
```


====================================================================
====================== LOGO ========================================
====================================================================
Everything about the "CuriosAI" logo — font, color, and per-place sizes — in one
place. The word "Curios" itself is fixed (it can't be renamed).

### LOGO_FONT — the wordmark typeface (whole app)
MICHROMA = the wide/technical face. GROTESK = a thinner, squarer face
(Space Grotesk), closer to Perplexity's look. Default = MICHROMA · Valid: MICHROMA / GROTESK
```
LOGO_FONT = GROTESK
```

### LOGO_COLOR — the wordmark color (whole app)
DEFAULT = "Curios" ink + "AI" blue→purple→pink gradient.
GRAY = both words in the logo's own gray (#9A9A9A). Default = DEFAULT · Valid: DEFAULT / GRAY
```
LOGO_COLOR = GRAY
```

--- Header logo (the top header — most visible on mobile) --------------------
Icon size, "Curios" size, whether "AI" shows, and its size. Default = M each.
Sizes: L / M / S · AI: ON / OFF
```
HEADER_LOGO_ICON = M
HEADER_LOGO_NAME = M
HEADER_LOGO_AI = ON
HEADER_LOGO_AI_SIZE = M
```

--- Sidebar logo (left sidebar + mobile slide-out drawer) -------------------
Same knobs, applied to the sidebar. Default = M each.
```
SIDEBAR_LOGO_ICON = M
SIDEBAR_LOGO_NAME = M
SIDEBAR_LOGO_AI = ON
SIDEBAR_LOGO_AI_SIZE = M
```


====================================================================
====================== HOME PAGE HEADER ============================
====================================================================
The top header controls (logo sizes for the header live in the LOGO section above).

### HEADER_THEME_TOGGLE — show or hide the light/dark toggle in the header
Default = ON · Valid: ON / OFF
```
HEADER_THEME_TOGGLE = OFF
```

### CREDITS — the Pro-credits indicator
BATTERY = little battery · DIAL = round gauge · OFF = hidden. Default = BATTERY
```
CREDITS = DIAL
```

### GET_STARTED — how the sign-up call-to-action looks
BUTTON = labelled button (uses GET_STARTED_TEXT) · ICON = person icon. Default = BUTTON
```
GET_STARTED = ICON
```

### GET_STARTED_TEXT — label used when GET_STARTED = BUTTON
```
GET_STARTED_TEXT = Get Started
```
