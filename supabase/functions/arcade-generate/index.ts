// Curios Arcade: writes a tiny one-screen arcade game "inspired by" a video game, for the
// fixed fantasy console in src/services/games/arcade/arcadeRuntime.ts (160×160, 4 colors,
// touch joystick + A/B). The model only writes init()/update() against that small API, which
// keeps output short (cheap) and the game runnable. The code is parsed (never executed)
// here; the client smoke-tests it in a sandboxed iframe and sends { repair } if it throws.
//
// Body { inspiredBy, genres, description, screenshot?, year?, platforms?, model, language, mode: '2d'|'3d', style: category id, idea? }
//   The Decisions API picks the look: "code" (sprites drawn by code — old, low-res games) or
//   "art" (an AI-painted background and sprite sheet — 16-bit era and newer).
// Body { improve: { id, feedback }, model, language }  → a better version of that game (new row)
//   Both answer with Server-Sent Events: { type: 'progress', chars } while the model writes,
//   { type: 'fixing' }, then { type: 'done', game } or { type: 'error' }.
// Body { repair: { id, error }, model, language } → JSON game, after one fix (not streamed).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { decide } from "../_shared/decisions.ts";

// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// The signed-in creator (the app sends the user's access token); guests → anonymous.
async function creatorOf(req: Request): Promise<{ creator_id: string | null; creator_name: string | null }> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token || token === ANON_KEY) return { creator_id: null, creator_name: null };
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } });
    if (!res.ok) return { creator_id: null, creator_name: null };
    const u = await res.json();
    const m = u.user_metadata ?? {};
    // Profile name only — never derived from the email (it would be public on the cards).
    const name = m.full_name || m.name || m.user_name || null;
    return { creator_id: u.id ?? null, creator_name: name ? String(name).slice(0, 40) : null };
  } catch {
    return { creator_id: null, creator_name: null };
  }
}

// Luna / Sol / Astra (appSettings.models defaults). The client picks by perceived difficulty
// and moves one step up on every remake.
const MODELS = new Set(["gpt-6-luna", "gpt-6.1-sol", "gpt-6-astra"]);
const DEFAULT_MODEL = "gpt-6.1-sol";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Style categories (src/services/games/arcade/arcadeStyles.ts): the mood the player picked.
const STYLE: Record<string, string> = {
  retro_arcade: "RETRO ARCADE — classic 80s arcade cabinet: bold saturated colors on black, chunky sprites, waves of enemies and score chasing.",
  sandbox: "SANDBOX & BUILDING — blocky Minecraft-like tiles on a grid (dig, place, collect), earthy greens and browns under a sky blue.",
  cyberpunk: "CYBERPUNK & NEON — neon on near-black: 0 near-black, 1 deep blue/purple, 2 and 3 neon tones; thin outlines with rectb/line, glowing accents, minimal shapes.",
  fantasy: "FANTASY & RPG — dungeon or forest tones, gold treasure, magic sparks; sword or spell attacks against monsters.",
  platformer: "PLATFORMER — side view: bright sky, solid ground tiles, coins, jumps and obstacles.",
  roguelike: "ROGUELIKE & SURVIVAL — dark ground, swarms of enemies, pickups that power you up during the run; survive as long as possible.",
  racing: "RACING & SPORTS — road or track with speed lines, rivals and obstacles to dodge, bold contrasting colors.",
  puzzle: "PUZZLE & BRAIN — clean geometric shapes on a clear grid, calm cool colors; logic and skill against a timer.",
  cozy: "COZY & LIFE SIM — soft pastels and warm light, gentle pace: grow, collect or tend things; the run ends by a gentle timer or meter.",
  horror: "HORROR & MYSTERY — near-black with a small circle of light, muted colors and one blood-red accent, creatures closing in from the dark.",
  scifi: "SCI-FI & SPACE — deep space blues and a starfield, ships or aliens, cyan and magenta highlights, thin outlines.",
  party: "PARTY — candy-bright colors, bouncy round shapes, silly fast challenges.",
};
const OLD_STYLES: Record<string, string> = { retro: "retro_arcade", cyberpunk: "cyberpunk" };
const styleId = (v: unknown) => (typeof v === "string" && STYLE[v] ? v : OLD_STYLES[String(v)] ?? "retro_arcade");

// Screen size by style (and 3D): 224 for retro arcade (the width of the original Pac-Man /
// Space Invaders boards — 160 was too coarse for a maze), more detail for richer worlds, 320
// for neon / sci-fi and first-person 3D. Never above 512. Remakes keep their size.
const RES_BY_STYLE: Record<string, number> = {
  retro_arcade: 224, platformer: 240, puzzle: 240, racing: 240, horror: 240, party: 240, roguelike: 240,
  fantasy: 256, sandbox: 256, cozy: 256, cyberpunk: 320, scifi: 320,
};
const resFor = (style: string, mode: string) => Math.min(512, mode === "3d" ? Math.max(320, RES_BY_STYLE[style] ?? 240) : RES_BY_STYLE[style] ?? 240);
const textScale = (res: number) => Math.max(1, Math.round(res / 120));
// Painted art needs room for detail.
const ART_RES = 320;

// "plain" = clients from before spr()/img() (no v: 2 in the body): the old prompt.
type Gfx = "plain" | "code" | "art";
interface Spec { language: string; mode: "2d" | "3d"; style: string; res: number; gfx: Gfx }

// Code or painted art for this inspiration. The release year settles clear cases (8-bit era →
// code, 16-bit era and newer → art); the Decisions API only answers the 8→16-bit transition
// (1989-1992) or an unknown year. 3D always draws with code (the raycaster).
async function gfxFor(o: { inspiredBy: string; year: string; platforms: string; genres: string; style: string; mode: string }): Promise<Gfx> {
  const year = +o.year || 0;
  if (o.mode === "3d" || o.style === "retro_arcade" || (year && year < 1989)) return "code";
  if (year >= 1993) return "art";
  const fallback: Gfx = year && year < 1991 ? "code" : "art";
  const answers = await decide(
    `Video game: ${o.inspiredBy}${o.year ? ` (${o.year})` : ""}. Platforms: ${o.platforms || "unknown"}. Genres: ${o.genres || "unknown"}. Chosen style: ${o.style}.`,
    [{
      type: "choice",
      name: "gfx",
      instructions: "How should a small 2D tribute game to this video game look to feel true to the original?",
      choices: [
        { value: "code", description: "Low-resolution early look: Atari, 80s arcade cabinets, NES / Game Boy era (before about 1990), or minimal abstract games like Tetris or Pong. Simple pixel sprites are the authentic look." },
        { value: "art", description: "Detailed look: 16-bit era (SNES, Genesis) or newer — rich worlds and characters like Zelda, Hollow Knight, Celeste, Stardew Valley, or a modern game reimagined as detailed 16-bit pixel art." },
      ],
    }],
    3000,
  );
  const pick = answers?.gfx?.choice;
  return pick === "code" || pick === "art" ? pick : fallback;
}

// ---- Painted art (gfx "art"): Nano Banana 2 Lite via the gemini-image function ----
const SLOTS = ["hero", "hero2", "enemy", "enemy2", "boss", "item", "shot", "tile", "decor"] as const;
type ArtPlan = { scene: string } & Record<(typeof SLOTS)[number], string>;

async function paint(prompt: string, aspectRatio: string, name: string, reference?: string): Promise<string | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/gemini-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ prompt, aspectRatio, referenceImageUrl: reference, storageBucket: "movie-assets", storagePath: `arcade/${crypto.randomUUID()}-${name}.png` }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) { console.error("arcade paint failed", name, res.status, (await res.text()).slice(0, 200)); return null; }
    return (await res.json()).url ?? null;
  } catch (err) {
    console.error("arcade paint threw", name, String(err));
    return null;
  }
}

// Background and a 3x3 sprite sheet on magenta (the console cuts the sprites out), in parallel.
async function paintArt(plan: ArtPlan, inspiredBy: string, style: string, screenshot?: string) {
  const look = `detailed 16-bit pixel art (SNES era), rich colors and shading, crisp pixels, inspired by the look and mood of the video game "${inspiredBy}" (${STYLE[style].split(" — ")[0]})`;
  const [bg, sheet] = await Promise.all([
    paint(`Video game background, ${look}: ${plan.scene}. Side view, layered depth (sky, far scenery, near scenery), open readable ground area at the bottom. No characters, no text, no UI, no logos.${screenshot ? " Use the reference image only for colors and atmosphere." : ""}`, "16:9", "bg", screenshot),
    paint(`Sprite sheet for a 2D video game, ${look}. Exactly 9 separate sprites in a 3x3 grid on a flat pure magenta (#FF00FF) background, each one centered in its own cell with plenty of magenta around it; no grid lines, no text, no shadows on the background, no magenta inside the sprites. Side view, characters facing right, dark outlines. Row 1: ${plan.hero}; ${plan.hero2}; ${plan.enemy}. Row 2: ${plan.enemy2}; ${plan.boss}; ${plan.item}. Row 3: ${plan.shot}; ${plan.tile}; ${plan.decor}.`, "1:1", "sheet"),
  ]);
  return { bg, sheet, plan };
}

const SYSTEM = ({ language, mode, style, res, gfx }: Spec) => `You write tiny one-screen arcade games for the Curios Arcade fantasy console (like WASM-4), played on phones.
Screen ${res}x${res} pixels, 8 colors, 60 fps. Use the detail: sprites about ${Math.round(res / 16)}-${Math.round(res / 10)} px with a few details (eyes, stripes, outlines). Global API:
cls(c) rect(x,y,w,h,c) rectb(x,y,w,h,c) circ(x,y,r,c) line(x0,y0,x1,y1,c)
text(s,x,y,c,k) pixel font, uppercase, 4px per char and 5px tall at scale k=1 — use k=${textScale(res)} for normal text and k=${textScale(res) + 1} for titles
btn(i) held / btnp(i) just pressed: 0 LEFT 1 RIGHT 2 UP 3 DOWN (an on-screen joystick) 4 A 5 B (two buttons)
rnd(n) random float 0..n; over(score) ends the run (the console shows GAME OVER and restarts).
${gfx === "art" ? `PAINTED ART: this game has a painted pixel-art background and 9 painted sprites. Describe them in "art": scene = the background setting in one sentence (no characters); then one short visual description per sprite slot, true to the inspiration: hero, hero2 (the same hero in an action pose: attack or jump), enemy, enemy2, boss, item (pickup), shot (projectile or effect), tile (one ground/platform block), decor (a scenery prop).
bg(scrollX) draws the background (scroll it slowly with the camera for parallax) — call it first each frame instead of cls.
img(slot,x,y,w,h,flip) draws a sprite fitted in that box, feet on its bottom edge; sprites face right, flip=true faces left. Use img for EVERY character, enemy, item and platform block (characters about ${Math.round(res / 9)}-${Math.round(res / 6)} px tall, tiles ${Math.round(res / 14)}-${Math.round(res / 10)} px; alternate hero/hero2 to animate). Use rect/circ/text only for the HUD, bars and small particles.
` : gfx === "plain" ? "" : `PIXEL SPRITES: draw characters, enemies and items with spr(rows,x,y,k,flip) — rows = array of equal-length strings, one character per pixel: '0'-'7' a palette color, '.' transparent; drawn k times bigger, flip mirrors it. Design them 10-16 px wide with an outline, a highlight and eyes or other details, 2 frames for walking/animations (define the row arrays once, outside update), and draw them with k so characters are about ${Math.round(res / 9)} px tall on screen — never tiny.
grad(x,y,w,h,[colors]) fills a dithered vertical gradient through those palette colors (skies, water, light).
`}Colors c = 0..7: 0 background (darkest), 1 dark (ground, walls), 2-5 four clearly different strong colors (player, enemies, items, effects), 6 light, 7 brightest (text, highlights). Keep high contrast against 0.
Sound (use it for every important event): sfx(name) with 'shoot','laser','hit','explode','coin','blip','jump','power','hurt','step','win'; tone(freq,ms,wave) for melodies or marches (wave 'square'|'triangle'|'sawtooth'), e.g. Space Invaders' march = a low tone(110,70) … cycling 4 descending notes as the aliens step, Pac-Man = sfx('blip') per dot.
${mode === "3d" ? `3D (first person, like DOOM/Wolfenstein) — use it for this game:
var map = array of strings ('.' floor, '#' wall, a digit 2-7 = a wall of that color), at least 12x12 with corridors and rooms.
view3d(map,x,y,angle) draws the 3D view (ceiling 0, floor 1, walls in their colors); call it first each frame instead of cls.
sprite3d(x,y,c,size) draws an enemy/item standing on the floor (size 0.3-0.8), hidden by walls; returns its screen box {x,y,w,h} or null — draw eyes or details on that box with rect().
wall(map,x,y) is true inside walls: use it for collisions (keep 0.2 from walls).
Controls: joystick left/right turns (about 0.05 rad per frame), up/down walks (about 0.05 per frame), A shoots: an enemy is hit when it is within 0.15 rad of the view angle and nearer than the wall in that direction. Draw a crosshair and the HUD with rect/text after the 3D view.
` : ""}Style: ${STYLE[style]}
Colors: start from the inspiration's own colors (the screenshot) and shift them toward this mood, so the game still looks like its inspiration.
Write plain JavaScript (no imports, DOM, timers, storage, network, async or while loops) that defines:
function init() — resets ALL game state (called at start and after every game over)
function update() — called 60 times per second: input, logic, then draw the whole frame${mode === "3d" ? " (view3d first)" : " starting with cls(0)"}.
Rules: one screen; no levels, saves or menus; difficulty rises with time; a run lasts 1-3 minutes; call over(score) when the player loses; draw the score with text(). Use only the buttons the game needs. Simple shapes, under ${mode === "3d" ? 180 : 150} lines, no comments, readable (not minified). Use ONE coordinate system consistently (if the world is a tile grid, convert to pixels only when drawing) and make sure the player is on screen from the first frame.
Stay true to the inspiration's spirit: keep its core mechanic, perspective, setting and kind of enemies (a DOOM-like stays a demon shooter; never turn it into a different classic such as Pac-Man). Keep its iconic visual details too, mapped onto the palette — e.g. Pac-Man's four ghosts each in their own color (red, pink, cyan, orange) that turn blue when frightened.
If the player gives an idea, build the game around it as long as it fits a one-screen arcade game.
Return JSON: title (short and original, not the inspiration's name), howTo (one short sentence in language "${language}" naming the controls: the joystick and the button labels), buttons ({ a, b }: what each button does as ONE short uppercase word in language "${language}", max 7 letters, e.g. DISPARA / SALTA; if the game only uses the joystick, a = the word for START; b = "" when B is unused), axes ("x" if the player only moves left/right, like Space Invaders, else "xy"), palette (8 hex colors in the roles above), code.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "howTo", "buttons", "axes", "palette", "code"],
  properties: {
    title: { type: "string" },
    howTo: { type: "string" },
    buttons: {
      type: "object",
      additionalProperties: false,
      required: ["a", "b"],
      properties: { a: { type: "string" }, b: { type: "string" } },
    },
    axes: { type: "string", enum: ["x", "xy"] },
    palette: { type: "array", items: { type: "string" }, minItems: 8, maxItems: 8 },
    code: { type: "string" },
  },
};

// Painted-art games also describe their art.
const ART_SCHEMA = {
  ...SCHEMA,
  required: [...SCHEMA.required, "art"],
  properties: {
    ...SCHEMA.properties,
    art: {
      type: "object",
      additionalProperties: false,
      required: ["scene", ...SLOTS],
      properties: Object.fromEntries(["scene", ...SLOTS].map((k) => [k, { type: "string" }])),
    },
  },
};

interface ArcadeGame { title: string; howTo: string; buttons: { a: string; b: string }; axes: string; palette: string[]; code: string; art?: ArtPlan }

function requestBody(model: string, user: unknown[], spec: Spec, stream: boolean) {
  return JSON.stringify({
    model,
    input: [{ role: "system", content: SYSTEM(spec) }, { role: "user", content: user }],
    max_output_tokens: 9000,
    // A little reasoning even on Luna: without it, it wrote 25 minified lines with the player
    // spawning off-screen (pixel vs tile coordinates).
    reasoning: { effort: "low" },
    text: { format: { type: "json_schema", name: "arcade_game", strict: true, schema: spec.gfx === "art" ? ART_SCHEMA : SCHEMA } },
    stream,
  });
}

async function openai(body: string): Promise<Response> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body,
    signal: AbortSignal.timeout(140_000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

async function ask(model: string, user: unknown[], spec: Spec): Promise<ArcadeGame> {
  const data = await (await openai(requestBody(model, user, spec, false))).json();
  const text = data.output_text ?? data.output?.flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? "").join("") ?? "";
  return JSON.parse(text);
}

// Streamed: reports how much the model has written so far (real progress for the UI).
async function askStreaming(model: string, user: unknown[], spec: Spec, onChars: (n: number) => void): Promise<ArcadeGame> {
  const res = await openai(requestBody(model, user, spec, true));
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "", text = "", reported = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const ev = JSON.parse(line.slice(6));
        if (ev.type === "response.output_text.delta") text += ev.delta ?? "";
      } catch { /* keep-alive or partial line */ }
    }
    if (text.length - reported >= 150) { reported = text.length; onChars(reported); }
  }
  return JSON.parse(text);
}

// Parse only (new Function compiles, it doesn't run the code) + the two required functions.
function codeProblem(code: string): string | null {
  try {
    new Function(code);
  } catch (e) {
    return `SyntaxError: ${e instanceof Error ? e.message : String(e)}`;
  }
  if (!/function\s+init\s*\(/.test(code)) return "function init() is missing";
  if (!/function\s+update\s*\(/.test(code)) return "function update() is missing";
  return null;
}

const fixRequest = (game: unknown, problem: string) => [{
  type: "input_text",
  text: `This game fails with: ${problem}\nFix it and return the full JSON again (same idea, same palette).\n${JSON.stringify(game)}`,
}];

// One repair attempt when the code doesn't even parse.
async function checked(game: ArcadeGame, model: string, spec: Spec, onFixing: () => void): Promise<ArcadeGame> {
  const problem = codeProblem(game.code);
  if (!problem) return game;
  onFixing();
  const fixed = await ask(model, fixRequest(game, problem), spec);
  const again = codeProblem(fixed.code);
  if (again) throw new Error(again);
  return fixed;
}

async function db(path: string, init: RequestInit): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
  });
  if (!res.ok) throw new Error(`DB ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const getRow = async (id: unknown) => (await db(`arcade_games?id=eq.${encodeURIComponent(String(id))}&select=*`, { method: "GET" }))[0];

const out = (row: any) => ({
  id: row.id, title: row.title, howTo: row.how_to, palette: row.palette, code: row.code, inspiredBy: row.inspired_by,
  mode: row.mode, style: row.style, idea: row.idea, buttons: row.buttons, votesUp: row.votes_up, votesDown: row.votes_down,
  creatorName: row.creator_name, res: row.res, axes: row.axes, art: row.art ? { bg: row.art.bg, sheet: row.art.sheet } : null,
});

const specOf = (row: any, language: string, v2: boolean): Spec => ({
  language,
  gfx: !v2 ? "plain" : row.art ? "art" : "code",
  res: Number.isInteger(row.res) && row.res >= 128 && row.res <= 512 ? row.res : 160,
  mode: row.mode === "3d" ? "3d" : "2d",
  style: styleId(row.style),
});

// SSE: model progress while it writes, then the stored game.
function streamGame(
  model: string, user: unknown[], spec: Spec,
  save: (game: ArcadeGame) => Promise<any>,
  painter?: (plan: ArtPlan) => Promise<unknown>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      try {
        const draft = await askStreaming(model, user, spec, (chars) => send({ type: "progress", chars }));
        const game = await checked(draft, model, spec, () => send({ type: "fixing" }));
        if (painter && game.art) {
          send({ type: "painting" });
          (game as any).painted = await painter(game.art);
        }
        send({ type: "done", game: out(await save(game)) });
      } catch (err) {
        console.error("arcade-generate stream error", err);
        send({ type: "error" });
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}

const buttonLabels = (b: { a?: string; b?: string } | undefined) => ({
  a: String(b?.a ?? "").toUpperCase().slice(0, 8),
  b: String(b?.b ?? "").toUpperCase().slice(0, 8),
});

// @ts-ignore: Deno.serve is the entry point for Supabase Edge Functions
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY not configured" }, 500);

  try {
    const body = await req.json().catch(() => ({}));
    const model = MODELS.has(body?.model) ? body.model : DEFAULT_MODEL;
    const language = typeof body?.language === "string" ? body.language.slice(0, 5) : "en";
    const creator = body?.repair ? null : await creatorOf(req);
    const v2 = body?.v === 2;

    // The client's smoke test threw at runtime → one fix of the stored game.
    if (body?.repair?.id) {
      const row = await getRow(body.repair.id);
      if (!row) return json({ error: "Not found" }, 404);
      const spec = specOf(row, language, v2);
      const current = { title: row.title, howTo: row.how_to, buttons: row.buttons, axes: row.axes, palette: row.palette, code: row.code };
      const fixed = await checked(await ask(model, fixRequest(current, String(body.repair.error ?? "").slice(0, 300)), spec), model, spec, () => {});
      const [updated] = await db(`arcade_games?id=eq.${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ code: fixed.code, palette: fixed.palette, buttons: buttonLabels(fixed.buttons), axes: fixed.axes === "x" ? "x" : "xy" }),
      });
      return json(out(updated));
    }

    // Remake: the player said what to improve → a better version (stronger model), new row.
    if (body?.improve?.id) {
      const row = await getRow(body.improve.id);
      if (!row) return json({ error: "Not found" }, 404);
      const spec = specOf(row, language, v2);
      const feedback = String(body.improve.feedback ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
      const previous = { title: row.title, howTo: row.how_to, buttons: row.buttons, axes: row.axes, palette: row.palette, code: row.code, ...(row.art ? { art: row.art.plan } : {}) };
      const user = [{
        type: "input_text",
        text: `Inspiration: ${row.inspired_by}.${row.idea ? ` Player's idea: ${row.idea}.` : ""}
The player didn't like this version. What to improve: ${feedback || "make it more fun and closer to the inspiration"}.
Rewrite the game to fix that, keeping what works${row.art ? " (the painted art stays: return the same art)" : ""}. Return the full JSON.
${JSON.stringify(previous)}`,
      }];
      return streamGame(model, user, spec, async (game) => (await db("arcade_games", {
        method: "POST",
        body: JSON.stringify({
          title: game.title.slice(0, 60), inspired_by: row.inspired_by, how_to: game.howTo.slice(0, 200),
          palette: game.palette, code: game.code, model, mode: spec.mode, style: spec.style, idea: row.idea,
          buttons: buttonLabels(game.buttons), parent_id: row.id, genres: row.genres ?? [], res: spec.res, ...creator,
          axes: game.axes === "x" ? "x" : "xy", art: row.art ?? null,
        }),
      }))[0]);
    }

    const inspiredBy = String(body?.inspiredBy ?? "").slice(0, 80);
    if (!inspiredBy) return json({ error: "Missing inspiredBy" }, 400);
    const genres = Array.isArray(body?.genres) ? body.genres.slice(0, 4).join(", ") : "";
    const description = String(body?.description ?? "").replace(/\s+/g, " ").slice(0, 600);
    const mode = body?.mode === "3d" ? "3d" : "2d", style = styleId(body?.style);
    const gfx: Gfx = !v2 ? "plain" : await gfxFor({
      inspiredBy, mode, style, genres,
      year: String(body?.year ?? "").slice(0, 4),
      platforms: Array.isArray(body?.platforms) ? body.platforms.slice(0, 6).join(", ") : "",
    });
    const spec: Spec = { language, mode, style, gfx, res: gfx === "art" ? ART_RES : resFor(style, mode) };
    const idea = String(body?.idea ?? "").replace(/\s+/g, " ").trim().slice(0, 140);

    const user: unknown[] = [{
      type: "input_text",
      text: `Inspiration: ${inspiredBy} (${genres}). ${description}${idea ? `\nPlayer's idea: ${idea}` : ""}`,
    }];
    // The inspiration's look (low detail, ~85 tokens): palette and mood.
    const screenshot = typeof body?.screenshot === "string" && body.screenshot.startsWith("https://") ? body.screenshot : undefined;
    if (screenshot) user.push({ type: "input_image", image_url: screenshot, detail: "low" });

    return streamGame(model, user, spec, async (game) => (await db("arcade_games", {
      method: "POST",
      body: JSON.stringify({
        title: game.title.slice(0, 60), inspired_by: inspiredBy, how_to: game.howTo.slice(0, 200),
        palette: game.palette, code: game.code, model, mode: spec.mode, style: spec.style, idea: idea || null,
        buttons: buttonLabels(game.buttons),
        axes: game.axes === "x" ? "x" : "xy",
        res: spec.res,
        genres: Array.isArray(body?.genres) ? body.genres.slice(0, 6).map((g: unknown) => String(g).slice(0, 40)) : [],
        art: (game as any).painted ?? null,
        ...creator,
      }),
    }))[0], gfx === "art" ? (plan) => paintArt(plan, inspiredBy, style, screenshot) : undefined);
  } catch (err) {
    console.error("arcade-generate error", err);
    return json({ error: "Could not create the game" }, 500);
  }
});
