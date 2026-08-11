# CuriosAI — App Settings

Plain, non-technical settings for the app's chrome (top bar, header, sidebar).
**How to use:** change the value on the right of each `=`, save, commit, redeploy.
Anything invalid or misspelled falls back to its **Default** automatically — you
can't break the app from here. No secrets live in this file (those stay in `.env`).

Only lines written as `KEY = value` are read. Everything else — these notes, the
`###` titles, the `======` section rules — is ignored, so comment freely.

Sizes use **L / M / S** (Large / Medium / Small).


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
====================== LOGO (shared) ===============================
====================================================================
Font and color of the "CuriosAI" wordmark, applied everywhere (header + sidebar).
The word "Curios" itself is fixed — it can't be renamed. (Sizes and the AI on/off
are set per-place in the HEADER / SIDEBAR sections below.)

### LOGO_FONT — the wordmark typeface
MICHROMA = the current wide/technical face. GROTESK = a thinner, squarer face
(Space Grotesk), closer to Perplexity's look. Default = MICHROMA · Valid: MICHROMA / GROTESK
```
LOGO_FONT = MICHROMA
```

### LOGO_COLOR — the wordmark color
DEFAULT = today's look ("Curios" ink + "AI" blue→purple→pink gradient).
GRAY = both words in the logo's own gray (#9A9A9A). Default = DEFAULT · Valid: DEFAULT / GRAY
```
LOGO_COLOR = DEFAULT
```


====================================================================
====================== HOME PAGE HEADER ============================
====================================================================
Affects the top header only (most visible on mobile).

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

### HEADER LOGO — the CuriosAI logo in the header (this header only)
Icon size, the "Curios" wordmark size, whether "AI" shows, and its size.
Default = M for every size. Valid sizes: L / M / S · AI valid: ON / OFF
```
HEADER_LOGO_ICON = M
HEADER_LOGO_NAME = M
HEADER_LOGO_AI = ON
HEADER_LOGO_AI_SIZE = M
```


====================================================================
====================== SIDEBAR =====================================
====================================================================
The CuriosAI logo in the left sidebar (and the mobile slide-out drawer).

### SIDEBAR LOGO — same knobs as the header, applied to the sidebar
Default = M for every size. Valid sizes: L / M / S · AI valid: ON / OFF
```
SIDEBAR_LOGO_ICON = M
SIDEBAR_LOGO_NAME = M
SIDEBAR_LOGO_AI = ON
SIDEBAR_LOGO_AI_SIZE = M
```
