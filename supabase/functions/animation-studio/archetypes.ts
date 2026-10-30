// The Animation studio's art direction: the motion archetypes a story can be told in, each with its own
// palettes, label font and motion. These are the VIDEO's colours — never the app's theme: the same
// question looks the same in a light or dark Curios, and in its recorded video.
// Luna picks the archetype (prompts.ts CLASSIFY); direct() settles it in code: variety and the palette.

/** Curios' night look, sampled from a Kurzgesagt-style explainer (the 3D machines and the flat "night" palette). */
export const NIGHT = `deep indigo night (ground gradient #14053c → #2b0b5c, silhouettes #1c054b / #43226c), a hot horizon glow
(#ff5a3c → #c2185b) behind the subject, the hero in warm yellow #e2b230 (shade #b08557), motion and particles in cyan
#5ad1e6, light and energy white with a violet glow (#b39dff); data as magenta pills (#c2187a, white bold text, a thin
white leader line ending in a dot on the thing: "~0.000003 s", "surface of the Sun", "×5 hotter"); soft radial glows,
slow parallax clouds and twinkling stars that never stop`;

export interface Palette { name: string; ground: string; surface: string; ink: string; muted: string; accent: string; more: string[]; note?: string }
export interface Archetype { name: string; look: string; font: string; palettes: Palette[] }

const SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif";

export const ARCHETYPES: Record<string, Archetype> = {
  flat: {
    name: "Flat vector explainer",
    look: `Kurzgesagt-like flat vector shapes without outlines, soft radial glows for light, simple round characters (round
heads, simple eyes and brows that act), layered parallax backgrounds (hills, clouds, stars, rain), sparkles. Clear
cause → effect, one object that grows and transforms.`,
    font: SANS,
    palettes: [
      { name: "night", ground: "#14053c", surface: "#2b0b5c", ink: "#ffffff", muted: "#b39dff", accent: "#e2b230", more: ["#ff5a3c", "#c2185b", "#5ad1e6", "#c2187a"], note: NIGHT },
      { name: "day", ground: "#fdf6e3", surface: "#ffffff", ink: "#1d2b3a", muted: "#5b6b7a", accent: "#ff7a45", more: ["#2bb3a3", "#ffc93c", "#3d6fd8", "#ff5c8a"] },
    ],
  },
  editorial: {
    name: "Editorial / kinetic typography",
    look: `Kinetic typography: the idea told by big words that build, split, scale and replace each other, a strong type
hierarchy (one huge key word, small supporting lines), a few bold shapes and rules, numbers set large, generous empty
space, hard cuts and precise easing. Words are the art (they may be on the stage here, in the question language).`,
    font: "Georgia, 'Times New Roman', serif",
    palettes: [
      { name: "newsprint", ground: "#f4efe6", surface: "#ffffff", ink: "#111111", muted: "#6b6459", accent: "#e63312", more: [] },
      { name: "ink-yellow", ground: "#111111", surface: "#1e1e1e", ink: "#f5f1e8", muted: "#9a958c", accent: "#ffd400", more: [] },
    ],
  },
  paper: {
    name: "Paper cutout / editorial collage",
    look: `TED-Ed style paper cut-out: paper textures drawn with SVG filters (feTurbulence grain), slightly irregular
hand-cut shapes, stylised characters with long limbs, layered depth with soft drop shadows, ink-stamp details, pieces
that slide and flip in like a collage being assembled.`,
    font: "Georgia, 'Times New Roman', serif",
    palettes: [
      { name: "kraft", ground: "#e9dcc3", surface: "#f6efe0", ink: "#2f2a24", muted: "#7a6d5c", accent: "#c8553d", more: ["#5e8c61", "#e8b04b", "#3f6e8c"] },
      { name: "indigo-cut", ground: "#23395b", surface: "#f1e9da", ink: "#f1e9da", muted: "#b8c4d6", accent: "#f4a259", more: ["#bc4b51", "#8cb369", "#f4e285"] },
    ],
  },
  character: {
    name: "Character-led 2D",
    look: `A character the viewer cares about lives the answer: simple expressive 2D characters (big readable poses,
eyes and brows that act, squash and stretch, anticipation), a few props and a simple set, the story told through
what the character does and feels.`,
    font: SANS,
    palettes: [
      { name: "sunny", ground: "#fff4d6", surface: "#ffffff", ink: "#2d2a32", muted: "#7d7887", accent: "#ff6f59", more: ["#43aa8b", "#254d70", "#ffd166", "#ef8354"] },
      { name: "mint", ground: "#dff3ea", surface: "#ffffff", ink: "#1f2d3d", muted: "#5e7184", accent: "#f25f5c", more: ["#ffe066", "#247ba0", "#70c1b3"] },
    ],
  },
  geometric: {
    name: "Geometric / data motion",
    look: `3Blue1Brown-like: clean thin strokes, shapes, bars, axes and formulas that draw themselves and morph
continuously, grids and number lines, true proportions for every number, smooth camera zooms.`,
    font: "ui-monospace, Menlo, Consolas, monospace",
    palettes: [
      { name: "slate", ground: "#1c1f26", surface: "#2a2e37", ink: "#f2f2f2", muted: "#9aa3b2", accent: "#ffd166", more: ["#58c4dd", "#83c167", "#fc6255"] },
      { name: "swiss", ground: "#ffffff", surface: "#f2f2f2", ink: "#111111", muted: "#707070", accent: "#ff3b30", more: ["#0057ff", "#ffcc00"] },
    ],
  },
  isometric: {
    name: "Isometric / schematic world",
    look: `An isometric miniature world (30° axes, no perspective): blocks, buildings, machines and paths connected by
flows of small moving tokens (data packets, goods, people), parts that lift out to show their inside, a slow camera
glide over the system.`,
    font: SANS,
    palettes: [
      { name: "blueprint", ground: "#0f3d5e", surface: "#16507a", ink: "#e8f1f8", muted: "#8fb3cc", accent: "#ffb703", more: ["#8ecae6", "#fb8500", "#ffffff"] },
      { name: "clay", ground: "#f1ece4", surface: "#ffffff", ink: "#2b2d42", muted: "#8d99ae", accent: "#ef233c", more: ["#5fa8d3", "#2a9d8f", "#f4a261"] },
    ],
  },
  ui: {
    name: "UI / process choreography",
    look: `A clean product-style interface drawn in SVG (windows, cards, buttons, lists, a pointer that moves and clicks),
the steps of the process played as UI changes: panels slide, items reorder, states light up, one focus at a time.`,
    font: SANS,
    palettes: [
      { name: "light-app", ground: "#eef1f5", surface: "#ffffff", ink: "#101828", muted: "#667085", accent: "#2e90fa", more: ["#12b76a", "#f79009", "#f04438"] },
      { name: "dark-app", ground: "#0c111d", surface: "#1d2939", ink: "#f9fafb", muted: "#98a2b3", accent: "#fdb022", more: ["#36bffa", "#12b76a"] },
    ],
  },
  real: {
    name: "News reconstruction in real colours",
    look: `News explainer like a broadcast reconstruction: clean flat low-poly illustration of the real place and things as
they look in daylight (real vehicle liveries, real building materials), soft sun shading and long shadows, a camera that
flies along the real geography, simple map insets with real names, numbers as clean white labels with a thin leader
line. No cartoon faces: it must look like the real event.`,
    font: SANS,
    palettes: [
      { name: "daylight", ground: "#cfe3f0", surface: "#ffffff", ink: "#1b1b1b", muted: "#5c5c5c", accent: "#d62828", more: [], note: "real-world colours for everything in the scene (sky blue → pale haze, ochre fields, grey ballast and steel)" },
    ],
  },
};

/** Luna's choice (prompts.ts CLASSIFY). */
export interface Pick { archetype?: unknown; alt?: unknown; confidence?: unknown; why?: unknown }
export interface Direction { archetype: string; palette: number; style: string; confidence: number; why: string; varied: boolean }

const hash = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

/**
 * Settles Luna's pick: an unknown archetype falls back to flat; when the pick is not a clear one (confidence < 80)
 * and it was used in 2 of the last 3 stories, its alternative is used instead (variety never beats a clear fit).
 * The palette comes from the question key, so the same question always gets the same look.
 */
export function direct(pick: Pick, recent: string[], key: string): Direction {
  const known = (a: unknown): a is string => typeof a === "string" && a in ARCHETYPES;
  const chosen = known(pick.archetype) ? pick.archetype : "flat";
  const confidence = Math.max(0, Math.min(100, Number(pick.confidence) || 0));
  const alt = known(pick.alt) && pick.alt !== chosen ? pick.alt : null;
  const varied = Boolean(alt) && confidence < 80 && recent.slice(0, 3).filter((a) => a === chosen).length >= 2;
  const archetype = varied ? alt! : chosen;
  const palette = hash(key) % ARCHETYPES[archetype].palettes.length;
  return { archetype, palette, style: `${archetype}:${palette}`, confidence, why: typeof pick.why === "string" ? pick.why.slice(0, 300) : "", varied };
}

/** The stage's colours and label font for a stored style ("editorial:1"); null for older styles and machines. */
export function stageOf(style: unknown) {
  const [id, i] = String(style ?? "").split(":");
  const p = ARCHETYPES[id]?.palettes[Number(i)];
  if (!p) return null;
  const n = parseInt(p.ground.slice(1), 16);
  const dark = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 128;
  return { dark, ground: p.ground, surface: p.surface, ink: p.ink, muted: p.muted, accent: p.accent, font: ARCHETYPES[id].font };
}
