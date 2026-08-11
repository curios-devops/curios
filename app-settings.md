# CuriosAI — App Settings

Plain, non-technical settings for the app's top bar and chrome.
**How to use:** change the value on the right of each `=`, save, commit, redeploy.
Anything invalid or misspelled falls back to its **Default** automatically — you
can't break the app from here. No secrets live in this file (those stay in `.env`).

Only lines written as `KEY = value` are read. Everything else (these notes, the
`###` titles) is ignored, so write as many comments as you like.

---

### BANNER — show or hide the top promo banner
Default = OFF · Valid options: ON / OFF
```
BANNER = ON
```

### BANNER_TEXT — the message shown inside the banner
Any text and emojis. Only used when BANNER = ON.
```
BANNER_TEXT = ☀️ Summer Sale • Limited Time Only • 50% Discount • Grab It Before It Melts! 🏖️
```

### THEME — default theme for first-time visitors
Applies before a visitor picks their own. Default = SYSTEM · Valid options: SYSTEM / LIGHT / DARK
```
THEME = SYSTEM
```

### CREDITS — the Pro-credits indicator on the top bar
Default = BATTERY · Valid options: BATTERY / OFF
```
CREDITS = BATTERY
```

### GET_STARTED_TEXT — label on the sign-up button
Any short text. Default = Get Started
```
GET_STARTED_TEXT = Get Started
```
