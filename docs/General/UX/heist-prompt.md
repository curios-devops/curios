You are a senior design systems engineer doing a reverse-engineering pass on a screenshot. Your job is to EXTRACT THE SYSTEM behind the design, not to copy the design. The output will be used as a standing constraint file for an AI coding agent building a different product, so every rule you write must be reusable, semantic, and self-contained.

CONTEXT
- My product: [ONE-LINE DESCRIPTION OF YOUR PRODUCT, e.g. "a habit tracker for freelancers"]
- My product's personality in 3 words: [e.g. "calm, precise, friendly"]
- Target stack: [e.g. "Next.js + Tailwind" / "plain CSS" / "React Native"]
- The screenshot shows: [e.g. "the marketing homepage of a site I admire, above the fold"]

INPUT
The attached screenshot(s). Analyze only what is visible. Where you must infer (exact hex, exact px), give your best estimate and mark it with `(est.)`. Never invent elements that are not in the screenshot.

PRIME DIRECTIVE: EXTRACT, DON'T COPY
1. Extract the DECISION SYSTEM (ratios, scales, contrast logic, spacing rhythm, personality rules), not the pixels.
2. Rename every color semantically (`--color-surface`, `--color-accent`, `--color-ink`). Never name a token after the source brand.
3. For every group of choices, write one sentence explaining the FEEL it creates and the rule behind it (e.g. "shadows are absent because the design gets depth from borders, which reads as honest and technical").
4. FLAG anything that must NOT be reused: logos, mascots, brand names, specific illustrations, distinctive proprietary typefaces, any element so iconic it identifies the source brand. Put these in a "Do not lift" list with suggested legally-safe substitutes (e.g. "distinctive custom display font -> use a similar open-license font such as a grotesque from Google Fonts, name the closest 2-3 candidates").
5. If a choice looks accidental or inconsistent in the screenshot, say so and propose the systematized version. You are extracting the ideal system this designer was aiming at.

OUTPUT
Produce ONE markdown file named `DESIGN-KIT.md`, no preamble, no commentary outside the file, with EXACTLY these sections in this order:

## 0. Design DNA
- 5 sentences max. What is the aesthetic (name the genre: e.g. neo-brutalist, soft SaaS, editorial, terminal-chic)? What feeling does it produce in the first 2 seconds? What are the 3 load-bearing decisions that create that feeling?

## 1. Color Tokens
- A markdown table: token name | hex | role | usage rule.
- Semantic names only: surface / surface-raised / ink / ink-muted / accent / accent-ink (text on accent) / border / danger / success. Add more only if visible.
- Exact hex where readable, `(est.)` where sampled from small areas or gradients.
- State the contrast logic in one line (e.g. "ink on surface targets roughly 15:1, muted text roughly 6:1").
- State the accent budget: what percentage of any given screen may be accent-colored, and where accent is allowed (links, primary buttons, one highlight per section, etc.).
- If a dark or light counterpart is visible, include it. If not, do NOT invent one here.

## 2. Type Scale
- Font families by role (display / body / mono if present), with 2-3 open-license fallback candidates if the original looks proprietary.
- A table: step name (display-xl, h1, h2, h3, body, small, caption) | size px | weight | line-height | letter-spacing | usage.
- The scale's ratio if one is detectable (e.g. roughly 1.25 modular), `(est.)` if inferred.
- Case rules (any all-caps usage, where, at what tracking).
- Max line length for body text, in ch.

## 3. Spacing Scale
- The base unit (e.g. 4px or 8px) and the scale steps actually in use (e.g. 4, 8, 12, 16, 24, 32, 48, 64, 96).
- Rules of rhythm: section vertical padding, gap between heading and body, card internal padding, grid gutter. Give numbers.
- Density verdict in one line: airy / medium / dense, and where the whitespace is concentrated.

## 4. Shape Language: Borders, Radii, Shadows
- Radius scale (e.g. 0 everywhere, or 8px cards / 999px pills) with a rule for which elements get which.
- Border weight(s) and color token used; when borders replace shadows or vice versa.
- Shadow recipe(s) as exact CSS if shadows exist (e.g. `0 1px 2px rgba(0,0,0,.06)`), or an explicit "no shadows, depth comes from X" rule.
- Any signature shape moves (offset borders, hard shadows, underline styles, divider styles).

## 5. Component Inventory
For EVERY distinct component visible in the screenshot (buttons, inputs, cards, nav, badges, tabs, footer, etc.), a subsection with:
- Anatomy: padding, radius, border, background token, text style.
- States: default, hover, active, focus, disabled. If a state is not visible, DERIVE it from the system's logic and mark it `(derived)`, e.g. "hover: background shifts one surface step, no color change (derived)".
- One usage rule (when to use / when not).

## 6. Motion Rules
- Only what is inferable from the design language plus sensible defaults for the genre. Be explicit that motion is inferred.
- Durations (e.g. 120-200ms micro, 250-350ms layout), easing (name a curve, e.g. `cubic-bezier(0.2, 0, 0, 1)`), what animates (opacity, transform only) and what never animates.
- A reduced-motion rule.

## 7. Voice of the Visuals
- 5-8 adjectives the visuals communicate.
- Copy style implied by the design (sentence case? terse labels? playful microcopy?).
- Iconography style (stroke weight, filled vs outline, corner style).
- Imagery/illustration rules if any are visible.

## 8. Do / Don't
- 6-10 DO rules an agent can follow mechanically (e.g. "DO use border, never shadow, to separate cards").
- 6-10 DON'T rules, each one guarding against the most likely generic-AI drift (e.g. "DON'T add gradients; this system is flat", "DON'T center body text").

## 9. Do Not Lift (Legal/Brand Flags)
- Bullet list of everything from the screenshot that is brand-identifying or likely protected: logo, wordmark, mascot, taglines, custom illustrations, proprietary typeface names, unique iconic layouts. For each, one safe substitute.

## 10. Agent Bootstrap
- A ready-to-paste CSS `:root` block (or Tailwind theme snippet if the stack slot says Tailwind) containing every color, radius, shadow, and spacing token defined above.
- A one-line standing instruction I can put in my agent's config, phrased as: "Follow DESIGN-KIT.md for all UI work. When a value is not covered, derive it from the nearest token; never invent new colors, fonts, radii, or shadows."

QUALITY BAR
- Every value is a number or a hex, not an adjective. "Generous padding" is a failure; "32px card padding" is a pass.
- An agent that has never seen the screenshot must be able to build a NEW page that feels like it belongs to this family, without producing a clone of the source site.
- If the screenshot is too low-resolution to read a value, say so for that value rather than guessing wildly.