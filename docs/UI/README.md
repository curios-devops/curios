# CuriosAI UI — Classic backup vs. new look

Before the Pamba / Vivix-inspired redesign, the current ("classic") UI was
frozen in GitHub so we can always go back to it or look at an old element.

## Where the classic UI lives

| What | Name | Use it for |
| - | - | - |
| Git tag (immutable) | `ui-classic-v1` | The exact code of the classic UI, never moves |
| Git branch | `ui/classic` | Browse on GitHub, compare, or branch from it |
| Screenshots | `docs/UI/classic/{desktop,mobile}/` | See the old look without running anything |

### Look at it

- **On GitHub:** switch the branch selector to `ui/classic`, or compare
  `ui-classic-v1...main` to see every UI change since the backup.
- **Locally:** `git switch ui/classic && npm run dev` (then `git switch main`).

### Revert

- **One component / file:** `git checkout ui-classic-v1 -- src/path/to/File.tsx`
- **Everything UI back to classic:** open a PR that reverts the redesign commits
  (`git revert <first-redesign-sha>^..<last-redesign-sha>`), deployed through
  GitHub as usual.

## Classic screenshots (production, 2026-10-03)

Desktop 1440 px and mobile 390 px:

| # | Page | Route |
| - | - | - |
| 01 | Home | `/` |
| 02 | Home — mode menu open (mobile also `02b` sidebar drawer) | `/` |
| 03 | Search results (full page) | `/fast-search?q=…` |
| 04 | Character | `/character` |
| 05 | Explore | `/explore` |
| 06 | Feed / Discover | `/feed` |
| 07 | Spaces | `/spaces` |
| 08 | History | `/history` |
| 09 | Library | `/library` |
| 10 | Settings | `/settings` |

Stories, Cinematic and Movie were not captured (they spend paid generation).

## Inspiration (`docs/UI/inspiration/`)

### Pamba — pamba.app (`pamba-*.jpg`)

- **Ground:** warm off-white `#FCFAF8`, sections on warm beige `#F3EFE6`; cards `#FBF9F3`.
- **Ink:** near-black warm `#15130D`; secondary `#6F6A5A`.
- **Type:** headlines *Bricolage Grotesque* 700, tight tracking (−1.5 px at 60 px);
  body *Inter*; small uppercase labels in *Geist Mono* ~11 px with wide tracking
  (+2.2 px), e.g. `AUTONOMOUS UGC ENGINE`.
- **Buttons:** fully rounded pills (99 px). Primary dark `#15130D` / white text;
  action blue `#1C8BFD` / white; ghost white.
- **Cards:** radius ~18 px, soft layered shadow
  (`0 1px 2px rgba(21,19,13,.06), 0 18px 40px -24px rgba(21,19,13,.4)`),
  slightly tilted "polaroid" cards with a mono caption + round ↗ button.
- **Hero:** big centered headline, single pill input with an inline pill CTA.

### Vivix — platform.vivix.ai (`vivix-*.jpg`)

- **Ground:** white / warm off-white; secondary surfaces `#E9E6E0`.
- **Type:** *Inter Variable* throughout; tiny muted section labels (10 px, 35 % ink).
- **Sidebar:** quiet list with section labels (Configure / Build), active item on a
  warm grey pill (radius 9 px); black full-width "Sign in" at the bottom.
- **Buttons:** black primary (radius 10 px), warm-grey secondary.
- **Character cards:** tall portrait "capsule" cards (radius ~63 px / full), the
  live one larger — already adopted in our Character picker.
- The playground builder (`/playground/build/agent`) requires a Vivix sign-in;
  only its shell is captured.
