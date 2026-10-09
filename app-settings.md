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

### THEME — light or dark background for first-time visitors
Applies before a visitor picks their own. LIGHT uses Vivix's warm off-white
background (#F9F6F4), near-black ink and Inter. AUTO follows the device.
Default = LIGHT · Valid: LIGHT / DARK / AUTO
```
THEME = LIGHT
```

### BANNER — show or hide the top promo banner
Default = OFF · Valid: ON / OFF
```
BANNER = OFF
```

### BANNER_TEXT — the message inside the banner (only when BANNER = ON)
Recommended length: **up to ~90 characters** (it scrolls, so longer works, but
reads best under ~90 on a phone). Current example ≈ 60.
```
BANNER_TEXT = 🎃 Halloween Launch — Pro 50% OFF · $5/month · Limited time
```


====================================================================
====================== THEMES ======================================
====================================================================
A theme is the accent color used everywhere (active buttons, links, labels,
focus). Visitors can switch between the five themes in Settings; this picks the
one they start with.

### THEME_COLOR — default theme
Default = TERRA · Valid: TERRA / OCEAN / FIRE / SKY / BOREALIS / CLASSIC_BLUE
(CLASSIC_BLUE is our original blue — kept here to go back to, not offered to visitors)
```
THEME_COLOR = TERRA
```

### Theme colors — edit any hex to retune a theme (hover / soft tints are derived)
TERRA = Vivix-family terracotta · OCEAN = Pamba blue · FIRE = Claude-like orange
SKY = purple · BOREALIS = teal · CLASSIC_BLUE = our original blue (pinned)
```
TERRA = #9C7A5B
OCEAN = #1C8BFD
FIRE = #D97757
SKY = #7C55D6
BOREALIS = #12A88C
CLASSIC_BLUE = #4F6FE0
```


====================================================================
====================== LOGO ========================================
====================================================================
Everything about the "CuriosAI" logo — font, color, and per-place text sizes — in
one place. The word "Curios" itself is fixed (it can't be renamed). The logo icon
size is fixed too (not configurable).

### LOGO_ICON_COLOR — the logo mark (frame) color
OCEAN_BLUE = Pamba blue (#1C8BFD) · GRAY = the original gray (#9A9A9A) ·
CLASSIC_BLUE = our original blue (#4F6FE0) · or any hex like #1C8BFD
Default = OCEAN_BLUE
```
LOGO_ICON_COLOR = OCEAN_BLUE
```

### LOGO_DOT_COLOR — the small center square of the logo
RED = #E5484D · ACCENT = follows the theme · or any hex. Default = RED
```
LOGO_DOT_COLOR = RED
```

### LOGO_DOT_PULSE — the center slowly breathes (brighter / softer)
Subtle on purpose: it only shows the site is alive. Default = ON · Valid: ON / OFF
```
LOGO_DOT_PULSE = ON
```

### LOGO_FONT — the wordmark typeface (whole app)
BRICOLAGE = Pamba's wordmark/headline face (Bricolage Grotesque).
MICHROMA = the wide/technical face. GROTESK = Space Grotesk.
Default = BRICOLAGE · Valid: BRICOLAGE / MICHROMA / GROTESK
```
LOGO_FONT = BRICOLAGE
```

### UI_FONT — the text typeface (whole app: menus, inputs, settings, results)
SYSTEM = the device's own font (SF on Apple, Roboto on Android, Segoe on Windows).
INTER = Inter, the body font named in docs/General/UX/design-kit.md (already loaded).
Headlines and the wordmark keep their own fonts (LOGO_FONT, Home title).
Default = SYSTEM · Valid: SYSTEM / INTER
```
UI_FONT = SYSTEM
```

### LOGO_COLOR — the wordmark color (whole app)
PAMBA = "Curios" in Pamba's near-black ink (#15130D) + "AI" thinner and gray.
DEFAULT = "Curios" ink + "AI" blue→purple→pink gradient.
GRAY = "Curios" in the logo's own gray (#9A9A9A) + "AI" in the accent color.
DARK = "Curios" in the header ink (gray-600; light gray in dark mode), matching
the menu and account icons, with "AI" in the accent color. The icon keeps its gray.
Default = PAMBA · Valid: PAMBA / DEFAULT / GRAY / DARK
```
LOGO_COLOR = PAMBA
```

--- Header logo (the top header — most visible on mobile) --------------------
"Curios" size, whether "AI" shows, and its size. Default = M each.
Sizes: L / M / S · AI: ON / OFF
```
HEADER_LOGO_NAME = M
HEADER_LOGO_AI = ON
HEADER_LOGO_AI_SIZE = M
```

--- Sidebar logo (left sidebar + mobile slide-out drawer) -------------------
Same knobs, applied to the sidebar. Default = M each.
```
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


====================================================================
====================== PRICING MODAL ===============================
====================================================================
The Pro pricing window. Use these during a promo so $5 reads as a launch deal,
not "the price of CuriosAI". Set to OFF when the promo ends.

### PROMO_LABEL — tag shown above the Premium price
Default = OFF · any text, or OFF
```
PROMO_LABEL = 🎃 Halloween Launch — 50% off
```

### PROMO_REGULAR_MONTHLY — regular monthly price, shown struck through next to $5
Monthly view only. Default = OFF · any price text (e.g. $10), or OFF
Only claim a regular price that really exists in Stripe ($10/month "Monthly
Subscription" does), otherwise the "50% off" isn't true.

Why there's no struck-through price on the YEARLY view: there is no real regular
yearly price (e.g. $100) to compare $50 against, so yearly keeps its
"20% Extra Discount" note and only shows PROMO_LABEL. To add one, first create
that regular yearly price in Stripe, then ask for a PROMO_REGULAR_YEARLY setting.

When the promo ends: set PROMO_LABEL = OFF, PROMO_REGULAR_MONTHLY = OFF and
BANNER = OFF. The Stripe checkout prices are separate (Supabase secrets
STRIPE_MONTHLY_PRICE_ID / STRIPE_YEARLY_PRICE_ID) and don't change from here.
```
PROMO_REGULAR_MONTHLY = $10
```


====================================================================
====================== MODELS ======================================
====================================================================
Which AI models answer questions. Every question is first rated by the
OpenAI Decisions API as easy / normal / complex, and the matching tier
answers it, in every mode (Search, Stories, Video, Character):

  easy    → LUNA   (fast, cheapest)
  normal  → SOL    (default)
  complex → ASTRA  (best; costs the user 1 Pro credit)

Without credits, a complex question is answered by SOL and the user sees a
notice offering Upgrade (to continue with ASTRA) or Dismiss.
Any invalid model name falls back to the default shown.
Approximate cost per Search answer: LUNA ~$0.0007 · SOL ~$0.013 · ASTRA ~$0.065.

### MODEL_ROUTER — rate each question and pick the tier
ON = Luna / Sol / Astra by difficulty · OFF = always SOL. Default = ON
```
MODEL_ROUTER = ON
```

### MODEL_LUNA / MODEL_SOL / MODEL_ASTRA — the three answer tiers
Defaults: gpt-6-luna · gpt-6.1-sol · gpt-6-astra
```
MODEL_LUNA = gpt-6-luna
MODEL_SOL = gpt-6.1-sol
MODEL_ASTRA = gpt-6-astra
```

### MODEL_DEEP — Search's "Ask Deeper" research synthesis (free, no credit)
Default = gpt-6.1-sol
```
MODEL_DEEP = gpt-6.1-sol
```

### MODEL_UTILITY — behind-the-scenes helpers (query rewriting, topics, articles)
Default = gpt-6-luna
```
MODEL_UTILITY = gpt-6-luna
```

### MODEL_IMAGE — generated images (Search, Stories)
Default = gpt-image-2
```
MODEL_IMAGE = gpt-image-2
```
