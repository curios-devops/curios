# Curios AI — Design Kit

The standing design system for this codebase. Follow this for all UI work.
Where a value isn't covered, derive it from the nearest token — never invent a
new color, font, radius, or shadow. If a request conflicts with this file,
say so before building.

**One-sentence brand direction:** *"Imagine if Apple designed Perplexity, with
the curiosity and visual storytelling of National Geographic."* Restrained,
elegant, highly readable — but unmistakably built for exploring and
understanding the world through rich visual explanation, not just text.

**Copying an external design from a screenshot?** Don't freehand it. Use
[`heist-prompt.md`](heist-prompt.md) — it's the standing procedure for
extracting a reusable design system (not a pixel clone) from a screenshot.
Run it, then reconcile the result into this file (extend tokens rather than
introducing a second system) before building.

**Legacy:** the system in place before 2026-07-24 (blue-default accent picker,
system-font stack, Tailwind's stock radius/shadow scale) is kept, unmodified,
in [§11 Legacy](#11-legacy-pre-2026-07-24-system) for revert/reference — code
for it hasn't been deleted, just superseded as the default. Nothing below
contradicts it silently; §11 says exactly what changed and why.

---

## 0. Design DNA

Dark-leaning "premium scientific/cinematic" aesthetic — a deliberate move away
from generic "every AI product is blue" SaaS blue. The 3 load-bearing
decisions: (1) **no primary color is literally named after itself** — every
accent is nature-named (Ocean, Sky, Borealis, Fire, Wood, Dusk) so the palette
reads as a *discovery* system, not a corporate brand swatch; (2) each accent
carries its own full coordinated background/surface/border set (not just a
highlight color), so picking an accent meaningfully retints the whole
canvas — this is the "cinematic" load-bearing move; (3) depth and motion do
the work that loud color used to do — fades, smooth expansion, and things
"growing into place" replace flashy gradients as the source of premium feel.

## 1. Color Tokens

Two layers, unchanged in structure from before: **global UI tokens** (`--ui-*`,
theme-only) and **accent tokens** (`--accent-*`, the one brand color the user
picks — now sourced from the nature palette below instead of the legacy set).

### Global UI tokens (`--ui-*`)

Same token names as before (`--ui-bg-primary`, `--ui-bg-elevated`,
`--ui-border-default`, `--ui-text-primary/-secondary/-muted`,
`--ui-shadow-soft/-elevated`, `--ui-text-on-accent`) — see `src/index.css`.
**New behavior to know:** `bgPrimary`/`bgSecondary`/`bgElevated` and the border/
text tokens are *derived per-accent* (`getGlobalPaletteTokens()` in
`themeColors.ts`), not fixed regardless of accent — so switching from Sky to
Fire retints the whole page's background/text, not just buttons. This was
already true before this update; it now matters more because accents carry
much more visual weight (deep navy vs. warm wood-brown canvases, not just
different blue shades).

### Accent tokens — nature palette (current)

Six accents, each with a full light + dark `bg`/`surface`/`border`/`text`/
`brandLight`/`brand`/`brandDark`/`brandSubtle` set in
`designSystemThemes`/`natureDesignSystemThemes` (`themeColors.ts`). **Default
is `sky`** (`ThemeContext.tsx`, `main.tsx`) — not blue.

| Accent | Feel | Dark `brand` | Dark `bg`/`surface` | Light `brand` | Temperature |
|---|---|---|---|---|---|
| **sky** (default) | Aurora, periwinkle | `#6E8BFF` | `#0B1020` / `#151C2E` | `#4F6FE0` | cold |
| **ocean** | Deep sea blue | `#2E6BE0` | `#081018` / `#0F1D2E` | `#2E6BE0` | cold |
| **borealis** | Aurora teal/mint | `#37E6C3` | `#081815` / `#0F211C` | `#12A88C` | cold |
| **fire** | Vivid warm orange | `#FF6B35` | `#170D08` / `#241209` | `#E85A25` | warm |
| **wood** | Warm brown | `#A87A50` | `#120D09` / `#1E1712` | `#8A6239` | warm |
| **dusk** | Twilight violet | `#9F7AEA` | `#0F0B1A` / `#191228` | `#7C55D6` | warm |

`sky`'s dark values are the exact "Midnight + Aurora" brief (bg `#0B1020`,
surface `#151C2E`, brand `#6E8BFF`); `borealis`'s dark `brand` (`#37E6C3`) is
the brief's Accent color verbatim. `ocean`/`fire`/`wood`/`dusk` and every light
variant were designed to extend that same system — full hex tables in
`themeColors.ts`, not duplicated here to avoid drift.

**Contrast logic (unchanged):** primary text ~14-16:1 on its own surface,
muted text ~5-7:1, never below AA (4.5:1) for body text. Where a `brand` hue
is too light for text-on-white contrast (`borealis`'s mint, `sky`'s
periwinkle), the light-mode `brand` shifts darker while `brandLight` keeps the
brighter original tone — check `themeColors.ts`, don't eyeball a substitute.

**Accent budget (unchanged):** one accent color's job is the single primary
action/state per view — primary CTA, active tab, focus ring, progress fill,
one status badge. Never a large body-text or background-fill color choice
beyond the coordinated `bg`/`surface` the accent itself defines.

**Picker (2026-07-24, updated):** accent color selection moved to Settings →
General → Accent Color (`GeneralSection.tsx`), **signed-in users only** —
guests keep the default `sky` with no picker shown. The desktop `ThemeToggle.tsx`
dropdown (theme + color together) is no longer used on desktop; a new
`SidebarThemeIcons.tsx` (3 always-visible icon buttons — System/Light/Dark,
System using the `Contrast` half-filled-circle icon) sits in the sidebar,
directly under the logo, above the Home nav item, and handles *theme only*.
`ThemeToggle.tsx` itself is unchanged and still used by the mobile header
(`App.tsx`) — it wasn't touched. The legacy 4 accents (blue/teal/purple/orange)
remain removed from any picker, not from the codebase (see §11).

The sidebar's collapse/expand button also moved: it used to jump to the
bottom of the sidebar when collapsed — it now always stays at the top, next
to the logo, in both states (`CollapseButton.tsx`, `Sidebar.tsx`).

**One-off, non-token gradient:** the "AI" wordmark suffix gradient
(`from-blue-500 via-purple-500 to-pink-500`) is an intentional brand
exception, logo-only — never reused as a UI gradient elsewhere. Unchanged by
this update.

## 2. Type Scale

**New brand fonts**, loaded via Google Fonts in `index.html`:

| Role | Font | Utility class | Where |
|---|---|---|---|
| Logo / wordmark | **Michroma** | `.font-michroma` | `Logo.tsx` ("Curios"/"AI" spans) |
| Headings | **Space Grotesk** | `.font-space-grotesk` | Home hero title (`AnimatedHomeTitle`) |
| Body | **Inter** | *(default stack)* | Everywhere else — unchanged, already the app's base font |

Both new classes are additive: they sit next to the legacy `.font-helvetica`
class on the same elements (CSS source order lets the new class win) rather
than replacing it, so reverting either is a one-class removal — see
`src/styles/typography.css` for the exact rule and reasoning.

**Scope as of 2026-07-24:** Michroma/Space Grotesk are applied to the Home
page hero and the sidebar Logo only, not retrofitted across every heading in
the app yet. The type-size scale, weights, and usage table from the legacy
system (§11) still describes every other heading/label in the app today.

**Michroma is all-caps/geometric by design** — use it for short, large,
brand-moment text (logo, hero display words), never for body copy, buttons,
or anything that needs lowercase legibility at small sizes.

## 3. Spacing Scale

Unchanged — stock Tailwind 4px scale, `gap-2`/`gap-3`/`gap-4` and
`p-4`–`p-12` as documented in §11. No spacing values were introduced or
retired by this update.

## 4. Shape Language: Borders, Radii, Shadows

**New standard radius scale** (forward-looking — not yet retrofitted onto
existing components, see note below):

| Element | Radius |
|---|---|
| Buttons | 14px |
| Cards | 20px |
| Inputs | 24px |

Rationale: larger, rounder corners read as approachable rather than clinical —
part of the "Apple meets Perplexity" softness. **Not yet applied to shipped
components** — every existing button/card/input still uses the legacy
Tailwind scale (`rounded-lg`/`rounded-xl`/`rounded-full`, documented in §11).
New UI work should use this scale (e.g. `rounded-[14px]` for buttons); a
full retrofit of existing components is a separate, not-yet-scheduled pass —
flag it explicitly if asked to do a broad radius migration, don't do it
silently as a side effect of an unrelated change.

**Borders and shadows:** unchanged from §11 — `1px solid var(--ui-border-*)`
for everyday separation, Tailwind's stock shadow scale for real elevation.

## 5. Component Inventory

Unchanged from §11 for now — every shipped button/badge/card/tab/progress-bar/
carousel anatomy described there is still accurate. The only components
touched by this update are the Home hero title and the sidebar Logo (font
only, see §2) and the `ThemeToggle` accent swatch row (see §1). When new
components are built, follow §4's new radius scale and §1's new accent
tokens even though most *existing* components still show the legacy values.

## 6. Motion Rules

**Direction (new):** motion, not color, is where Curios should feel premium —
"don't rely on flashy colors, use motion instead."

- Fade in answers as they stream/complete, don't pop them in.
- Expand cards smoothly when they grow (e.g. a swipe/scene revealing more
  content) rather than snapping to a new size.
- Animate image loading progressively (blur-up / fade, not a hard cut from
  skeleton to final frame).
- Let videos "grow" into place rather than appearing abruptly.
- Subtle hover effects and spring-like easing over linear/instant transitions.

**Concrete values already in the codebase** (§11's inventory still applies):
`fade-in-up` 0.5s `ease-in-out`, `fade-in` 0.2s `ease-out`,
`skeleton-shimmer` 1.8s infinite, theme-change transitions `0.2s ease-in-out`.
For new spring/expand motion, prefer `cubic-bezier(0.22, 1, 0.36, 1)` (already
used for the Home hero's rise-in, `home-rise` in `Home.tsx`) as the "spring"
feel over a generic `ease`.

Reduced-motion: still no blanket `prefers-reduced-motion` guard app-wide;
individual animations (e.g. `AnimatedHomeTitle`, Home's `home-rise`) do check
it directly. Any new ambient/looping motion should do the same.

## 7. Voice of the Visuals

Unchanged in spirit from §11 (calm, precise, quietly premium, sentence case,
`lucide-react` stroke icons) — the new fonts and palette are meant to deepen
this voice, not replace it. **Noted for later, not decided:** the brief that
prompted this update suggested Phosphor Icons over `lucide-react`; that swap
was **not** made — it would touch icon imports across dozens of files, which
is a separate, larger decision than a color/font update. Flag explicitly if
this should actually happen before doing it.

## 8. Do / Don't

**DO**
- Use one of the 6 nature accents (§1) — never re-introduce "blue" as a
  default or add a 7th color without a name and a full light/dark set in
  `themeColors.ts`.
- Read colors from `--ui-*`/`--accent-*` CSS vars or `useAccentColor()`/
  `useTheme()` — never a literal hex in a component.
- Use Michroma only for the logo/short display moments; Space Grotesk for
  headings; Inter (default) for everything else.
- Use the new 14/20/24px radius scale for genuinely NEW components; match
  existing (legacy) radii when editing an existing component, don't drag it
  halfway to the new scale.
- Prefer motion (fade/expand/grow) over color for "premium" feel on new work.

**DON'T**
- Don't add a hex not already in `themeColors.ts` — extend it deliberately,
  in that file, with a full light/dark set.
- Don't apply Michroma to body text, buttons, or small labels — it's a
  display/logo face only.
- Don't silently retrofit existing components to the new radius scale as a
  side effect of an unrelated change — that's a separate, explicit task.
- Don't swap `lucide-react` for Phosphor (or anything else) without it being
  asked for directly — it's a real, separate, large change.
- Don't delete the legacy accent/font code — it stays available (§11) even
  though it's no longer the default.

## 9. Agent Bootstrap

```css
:root {
  /* Default accent: sky (dark values — "Midnight + Aurora" brief, verbatim) */
  --ui-bg-primary: #0B1020;
  --ui-bg-secondary: #151C2E;
  --ui-bg-elevated: #151C2E;
  --ui-border-default: #232C47;
  --ui-text-primary: #EEF2FF;
  --accent-primary: #6E8BFF;
  --accent-hover: #4F6FE0;
  --accent-light: #1A2340;
  --accent-dark: #4F6FE0;
}
```

Tailwind: no new `theme.extend` entries were added for the radius scale yet —
use `rounded-[14px]`/`rounded-[20px]`/`rounded-[24px]` arbitrary values until/
unless named utilities are added.

**Standing instruction:** "Follow design-kit.md for all UI work. When a value
is not covered, derive it from the nearest token. Never invent new colors,
fonts, radii, or shadows. If a request conflicts with the kit, say so before
building." (mirrored in `CLAUDE.md`).

## 10. Change Log

- **2026-07-24** — Nature-named accent palette (Ocean/Sky/Borealis/Fire/Wood/
  Dusk) replaces blue/teal/purple/orange in the picker; default accent
  blue → sky. Michroma (logo) + Space Grotesk (Home hero heading) added,
  scoped to those two spots. New 14/20/24px radius scale documented as the
  forward standard (not retrofitted). Motion-first philosophy for "premium
  feel" documented. Brand one-liner added. Legacy system preserved in §11 and
  in code (not deleted) for revert/reference.

## 11. Legacy (pre-2026-07-24 system)

Kept verbatim for reference/revert. Still true for every component not
explicitly touched by the 2026-07-24 update (i.e. most of the app today).

### Legacy accent tokens

| Accent | Light `brand` | Light `brandDark` (hover) | Dark `brand` | Temperature |
|---|---|---|---|---|
| blue (was default) | `#007BFF` | `#0056B3` | `#0088EE` | cold |
| teal | `#1F8A8C` | `#16686A` | `#1F8A8C` | cold |
| purple | `#6634FF` | `#5E30EC` | `#6634FF` | warm |
| orange | `#C4502A` | `#8F3A1F` | `#D97757` | warm |
| gray | `#6B7280` | `#4B5563` | `#6B7280` | neutral |

Still fully defined in `themeColors.ts` (`legacyDesignSystemThemes`) and still
valid to load from a saved preference (`ThemeContext.tsx`'s
`validAccentColors`) — just no longer offered in the picker or used as the
default. Global UI tokens (light `#F4F6FA`/dark `#040A14` base, etc.) are
unchanged regardless of accent system — see `src/index.css`.

### Legacy fonts

System font stack aliased `.font-helvetica` (`-apple-system,
BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif`) — still the
default everywhere except the Home hero title and the Logo.

Real usage distribution (unchanged, still accurate for the rest of the app):
`text-sm`(278×) ≫ `text-xs`(146×) > `text-lg`(53×) > `text-xl`(40×) >
`text-base`(25×) > `text-2xl`(16×) > `text-3xl`(8×). Nothing larger is used —
large display headings were a proposal (`Homepage_style.md`), never built.

| Step | Size | Weight | Typical use |
|---|---|---|---|
| `text-3xl` | 30px | 600-700 | Rare page-level heading |
| `text-2xl` | 24px | 600 | Section heading |
| `text-xl` | 20px | 500-600 | Card/dialog title |
| `text-lg` | 18px | 500 | Sub-heading, question title |
| `text-base` | 16px | 400-500 | Default body |
| `text-sm` | 14px | 400-500 | Workhorse — labels, buttons, most UI copy |
| `text-xs` | 12px | 400-500 | Captions, badges, meta |

### Legacy shape language

Real usage: `rounded-lg`(141×) ≫ `rounded-full`(90×) > `rounded-xl`(30×) >
`rounded-md`(20×) > `rounded-2xl`(5×). `rounded-full` for pills/buttons/tags,
`rounded-lg`(8px) as the default container radius, `rounded-xl`(12px) for
larger feature containers, `rounded-md`(6px) for small inline chips. Borders
(`1px solid var(--ui-border-default)`) are the default separator; shadows
(`shadow-lg`/`shadow-xl` most common) reserved for real elevation.

### Legacy component inventory

**Button (primary, pill):** `inline-flex items-center gap-2 px-4 py-2
rounded-full text-sm font-medium`, `background: var(--accent-primary)`, text
`var(--ui-text-on-accent)`; hover `opacity-90`; disabled `opacity-60`.

**Badge/pill tag:** `text-[9-10px] uppercase tracking-wide px-1.5 py-0.5
rounded` (or `rounded-full`), solid accent bg or `var(--ui-bg-elevated)` bg
with accent text.

**Card/tile:** `rounded-lg`/`rounded-xl`, `background: var(--ui-bg-elevated)`,
optional border, `p-4`–`p-6`.

**Tab navigation:** `flex gap-4 sm:gap-8`, each tab `flex items-center gap-2
py-3 px-1 border-b-2 font-medium text-sm`; active tab border/color =
`var(--accent-primary)`.

**Progress bar:** `h-1.5 rounded-full`, track `var(--ui-bg-elevated)`, fill
`var(--accent-primary)`, `transition-all duration-500`.

**Carousel (horizontal scroll-snap):** `flex gap-3 overflow-x-auto
scrollbar-hide snap-x snap-mandatory`; fixed-width tiles, `flex-shrink-0
snap-start`; hover-revealed chevron buttons.

### Legacy agent bootstrap

```css
:root {
  --ui-bg-primary: #F4F6FA;
  --ui-bg-secondary: #ECF2FF;
  --ui-bg-elevated: #F8FBFF;
  --ui-border-subtle: #D9E6FF;
  --ui-border-default: #C3D8FF;
  --ui-text-primary: #1E2B45;
  --ui-text-secondary: #33456A;
  --ui-text-muted: #5D6F96;
  --ui-shadow-soft: rgba(45, 78, 138, 0.10);
  --ui-shadow-elevated: rgba(36, 66, 122, 0.18);
  --ui-text-on-accent: #EEF5FF;
  --accent-primary: #007BFF; /* blue, the old default */
  --accent-hover: #0056B3;
  --accent-light: #E3F2FF;
  --accent-dark: #0056B3;
}
```
