---
name: CuriosAI
colors:
  primary: "#0A0A0A"
  surface: "#FFFFFF"
  background: "#F9F6F4"
  border: "#DDD8D3"
  muted: "#6B7280"
  accent: "#7F5200"
  night: "#111111"
  night-card: "#1A1A1A"
typography:
  display: { fontFamily: "Bricolage Grotesque", fontWeight: 700, letterSpacing: "-0.025em" }
  body: { fontFamily: "system-ui", fontSize: 1rem, lineHeight: 1.5 }
  label: { fontFamily: "Geist Mono", fontSize: 11.2px, letterSpacing: 2.24px }
  mono: { fontFamily: "ui-monospace" }
rounded: { sm: 2px, md: 6px, lg: 8px, xl: 12px, 2xl: 16px, full: 9999px }
spacing: { xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px }
---

# DESIGN.md

The single source for how CuriosAI looks: colors, type, spacing, shapes, components and
themes. Read it before writing any UI. Every line here should change what you build.
(`docs/General/UX/design-kit.md` is the history that led here; this file wins.)

## Overview
- "Apple designed Perplexity, with National Geographic's curiosity": calm, readable,
  built for exploring the world through visual explanation, not just text.
- Content first, decoration last. One screen, one primary action.
- Motion, not loud color, is where the product feels premium (fade, expand, grow into place).

## Colors
- **Tokens only.** Components use Tailwind's `gray-*` / `night-*` utilities or the
  `--ui-*` / `--accent-*` CSS variables — never a new hex. All of them are variables
  (`src/styles/tokens.css`), so a theme can retint the whole app.
- **Ground (general design):** light = warm off-white `#F9F6F4`, white surfaces, border
  `#DDD8D3`, ink `#0A0A0A`; dark = the night ladder `night-900 #111111` (page),
  `night-850 #1A1A1A` (cards), `night-800 #222222`, `night-750 #2A2A2A`, `night-700 #333333`.
- **Neutrals:** `gray-50 … gray-950` for text and lines (`text-gray-900` ink, `text-gray-500`
  muted, `border-gray-200` lines; in dark: `text-white`, `text-gray-400`, `border-gray-800`).
- **Accent** (`--accent-primary`) is the theme's one color: primary action, active tab,
  links, focus, progress, one badge. Nothing else. Hover = accent mixed 18 % with black.
- **Text on an accent fill** uses `var(--ui-text-on-accent)` (white for most themes, dark on
  Terra's yellow NIGHT) — never `text-white`.
- Text passes 4.5:1 on its background.

## Typography
- **Display** (`.font-bricolage`, `--font-display`): headlines, the Home title, the wordmark.
  Bricolage Grotesque 700, −0.025em.
- **Body** (`--font-ui`): the device's system font (app-settings `UI_FONT`), Inter optional.
  Body is 1rem; UI copy mostly `text-sm`; nothing below `text-xs` except micro-badges.
- **Label** (`.label-mono`, `--font-label`): small uppercase section labels ("DESCUBRE"):
  Geist Mono 11.2px, +2.24px tracking.
- **Mono** (`font-mono`, `--font-mono`): code and data.
- Two weights do the work: 400 and 500/600; 700 only for display.

## Layout
- Tailwind's 4px spacing scale only (`gap-2/3/4`, `p-4`–`p-6`, `px-6` page gutter). No one-off values.
- Build for 375px first, then check 1440px. 16px side gutter on phones, no horizontal scroll.
- Content column: ~720px (Home), ~900px (results, Magazine).
- Sidebar: logo, modes (scroll on short screens), then plans / settings / help / account
  pinned to the bottom so sign-in always shows.

## Elevation & Depth
- Borders before shadows: `1px` `var(--ui-border-default)` / `border-gray-200` separates.
- One shadow level (`shadow-lg`) for overlays only: dropdowns, popovers, modals, toasts.
- Dark surfaces step up the night ladder instead of adding shadow.

## Shapes
- Radii are tokens (`--radius-*` behind Tailwind's `rounded-*`): `rounded-md` chips,
  `rounded-lg` cards / inputs / buttons (default container), `rounded-xl` feature containers
  and the search box, `rounded-full` pills, avatars and switches.
- Inline styles use the token too: `borderRadius: 'var(--radius-xl)'`, never `'12px'`.

## Components
- Reuse before creating: `FollowUps`, `SourcesLoader`, `toCitations` + `CustomMarkdown`
  (citation chips), `ToggleSwitch`, Settings' `Segmented`, `DayNightToggle`, `CuriosLogo`.
- Interactive elements have hover, focus, disabled and loading states.
- Every list has an empty state and an error state.
- Dropdowns: elevated surface, 1px border, `shadow-lg`; the active item in the accent with a dot.
- Primary button: accent fill, `var(--ui-text-on-accent)` text, `rounded-full` pill or `rounded-lg`.
- Icons: `lucide-react` strokes, 14–20px.
- Home mode menu, every theme: the Tesla Roadster lift-off — four chrome nozzles just outside its
  left and right edges, all firing down a short dotted core into billowing smoke (white at night,
  graphite by day), one 3D spin with a small settle wobble, then a slow hover (`.rocket-menu` in
  `themes.css`; after x.com/almonk/status/2111151330467406148). Monochrome, off with reduced
  motion. The one place the design uses gradients for effect.

## Themes
A **theme** sits on top of this design and wins over it; whatever it doesn't set is
inherited from the general tokens above.
A theme changes **looks only** — colors, fonts, shapes. Controls and settings are the
same for every theme: Settings (Appearance + Auto, Themes, Language + Auto Detect) and
the Home `DAY · NIGHT` switch never appear, disappear or change with the theme.

**Which theme a person sees**
1. Signed-in and picked one in Settings → Themes → that theme (saved in their profile as
   `theme:<name>`; also remembered on the device).
2. Otherwise the default theme from `app-settings.md` (`THEME_COLOR`, today Space, in DARK).
3. Light / dark: their choice in Settings → Appearance, else `app-settings.md` `THEME`
   (LIGHT / DARK / AUTO = the device). A theme may define its own light/dark variants.

**Accent-only themes** — Aqua (`ocean`) `#1C8BFD`, Fire `#D97757`, Borealis `#12A88C`
(Classic Blue `#4F6FE0` kept to revert). Purple is Nebula and black & white is Space (below). One base color each (`app-settings.md`); hover and
tints are derived; everything else is the general design.

**Terra** — inspired by xerj.org. Overrides in `src/styles/themes.css` and
`themeColors.ts` (`terraTheme`):

| | DAY (light) | NIGHT (dark) |
|---|---|---|
| Background / surface | paper `#F6F4EE` | `#0B0B0D` / card `#141412` |
| Ink | `#11120F` | bone `#F4F2EC` |
| Muted | `#696762` | `#8A8680` |
| Lines | `#CFCBBF` (faint `#E3DFD4`) | `#3A3836` (faint `#2B2A28`) |
| Accent | ochre `#7F5200` (`TERRA`) | yellow `#FFC400` (`TERRA_NIGHT`) |
| Text on accent | paper | `#0B0B0D` |

- Neutrals: a warm gray ladder anchored on those values (`gray-50 #F6F4EE` … `gray-950 #0B0B0D`).
- Type: display **Big Shoulders Display** 900, tight leading (normal case, not caps);
  labels **IBM Plex Sans** 600 11px +0.14em; body **Inter**; mono **JetBrains Mono**.
- Shapes: square — every `rounded-*` except `full` is 2px.
- Home: the title in display type (`--home-title-*`, ≤46px so it fits one line), the
  question beat in the accent (xerj's second line); `DAY · NIGHT` top right (desktop).
- **Auto** (Settings → Appearance, every theme) makes DAY / NIGHT follow the sun: DAY from sunrise
  to sunset at the reader's place (`/api/geo` coordinates; 07:00–20:00 when unknown), checked every
  5 min. Off by default for now (the default look is Space dark); picking Day or Night turns it off.

**Nebula** — inspired by singularityhub.com and upcomers.com: futuristic, dark first. Overrides in
`src/styles/themes.css` and `themeColors.ts` (`nebulaTheme`). It sits on the purple slot in Settings
(a saved "Space" becomes Nebula).

| | Light | Dark |
|---|---|---|
| Background / surface | white `#FFFFFF` | true black `#000000` / card `#141414` |
| Ink | black `#000000` | white `#FFFFFF` |
| Muted | `#616161` | `#A3A3A3` |
| Lines | `#E5E5E5` | `#262626` |
| Accent | Singularity violet `#6633FF` (`NEBULA`), hover `#4F26D0` | Upcomers violet `#9945FF` (`NEBULA_NIGHT`) |
| Text on accent | white | white |

- Grounds stay neutral white / black — the violet is only the accent, never a background tint.
- Neutrals: a pure gray ladder (`gray-50 #FAFAFA` … `gray-950 #000000`).
- Type: display and body **Figtree** (Singularity), headlines 800 −0.03em; labels and mono **Geist Mono**.
- Shapes: Upcomers corners — `rounded-lg` 12px, `rounded-xl` 16px, `rounded-2xl` 20px; pills stay full.
- Background: on the dark Home, a few tiny white stars drift almost imperceptibly (`.nebula-sky`,
  off with reduced motion). No glow, no lines.

**Space** — inspired by grok.com and x.com: black and white only, no colored accent. Overrides in
`src/styles/themes.css` and `themeColors.ts` (`spaceTheme`).

| | Light | Dark |
|---|---|---|
| Background / surface | white `#FFFFFF` | true black `#000000` / card `#141414` |
| Ink | `#050505` | white `#FFFFFF` |
| Muted | `#636363` | `#858585` |
| Lines | `#DEDEDE` | `#292929` |
| "Accent" (buttons, active) | black `#050505` (`SPACE`), hover `#292929` | white `#FFFFFF` (`SPACE_NIGHT`), hover `#DEDEDE` |
| Text on accent | white | `#050505` |

- Neutrals: Grok's pure gray scale (no warm or blue tint).
- Type (2026-10-23, quieter, after xgenlabs.ai): **D-DIN** (Datto, SIL OFL, self-hosted in
  `public/fonts/d-din`, Regular + Bold) for display, body and labels; headlines 700 −0.035em; labels
  small uppercase 11px +0.08em; mono stays **Geist Mono**.
- Logo: the mark is hidden for now (`[data-logo-mark]`), the "Curios AI" wordmark alone.
- Background: on the dark Home, the Nebula sky — a few tiny stars drifting almost imperceptibly
  (`.nebula-sky`, off with reduced motion).
- Shapes: X / Grok — `rounded-lg` 12px, `rounded-xl` 16px, `rounded-2xl` 24px; pills stay full.
- Icon: the Auto mode shows the new Roadster (tilted 45° nose-up) instead of the rocket.

**Adding a theme:** a base hex in `app-settings.md` → `THEME_DEFAULTS` / `curiosThemes` in
`themeColors.ts`; only if it changes more than the accent, an `html[data-accent="<name>"]`
block in `themes.css` overriding tokens (never component classes) — then document it here.

## Do's and Don'ts
- Do open the page in light and dark, on the default theme and one accent-only theme,
  and compare it to this file.
- Do take colors, radii and fonts from tokens so themes keep working.
- Don't add a hex, font, radius or shadow that isn't here — extend the tokens and this file first.
- Don't use `text-white` on an accent fill, a fixed `bg-[#…]`, or a pixel radius in inline styles.
- Don't add gradients, emoji icons or a new color to make something "pop" (the logo's "AI"
  gradient is the one exception).
- Don't put "premium" crowns on free features.
