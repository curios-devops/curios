// Curios Arcade: writes a tiny one-screen arcade game "inspired by" a video game, for the
// fixed fantasy console in src/services/games/arcade/arcadeRuntime.ts (160×160, 4 colors,
// touch D-pad + A/B). The model only writes init()/update() against that small API, which
// keeps output short (cheap) and the game runnable. The code is parsed (never executed)
// here; the client smoke-tests it in a sandboxed iframe and sends { repair } if it throws.
//
// Body { inspiredBy, genres, description, screenshot?, model, language, mode: '2d'|'3d', idea? }
//   → Server-Sent Events: { type: 'progress', chars } while the model writes, { type: 'fixing' },
//     then { type: 'done', game: { id, title, howTo, palette, code, mode } } or { type: 'error' }.
// Body { repair: { id, error }, model, language } → JSON game, after one fix (not streamed).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Luna / Sol / Astra (appSettings.models defaults). The client picks by perceived difficulty.
const MODELS = new Set(["gpt-6-luna", "gpt-6.1-sol", "gpt-6-astra"]);
const DEFAULT_MODEL = "gpt-6.1-sol";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const SYSTEM = (language: string, mode: string) => `You write tiny one-screen arcade games for the Curios Arcade fantasy console (like WASM-4), played on phones.
Screen 160x160 pixels, 4 colors (0 = background), 60 fps. Global API:
cls(c) rect(x,y,w,h,c) rectb(x,y,w,h,c) circ(x,y,r,c) line(x0,y0,x1,y1,c)
text(s,x,y,c,k) pixel font, uppercase, 4px per char and 5px tall at scale k=1 (k=2 for titles)
btn(i) held / btnp(i) just pressed: 0 LEFT 1 RIGHT 2 UP 3 DOWN 4 A 5 B
rnd(n) random float 0..n; over(score) ends the run (the console shows GAME OVER and restarts).
${mode === "3d" ? `3D (first person, like DOOM/Wolfenstein) — use it for this game:
var map = array of strings ('.' floor, '#' wall, '3' bright wall), at least 12x12 with corridors and rooms.
view3d(map,x,y,angle) draws the 3D view (ceiling 0, floor 1, walls 2/3); call it first each frame instead of cls.
sprite3d(x,y,c,size) draws an enemy/item standing on the floor (size 0.3-0.8), hidden by walls; returns its screen box {x,y,w,h} or null — draw eyes or details on that box with rect().
wall(map,x,y) is true inside walls: use it for collisions (keep 0.2 from walls).
Controls: ◀ ▶ turn (about 0.05 rad per frame), ▲ ▼ walk (about 0.05 per frame), A shoots: an enemy is hit when it is within 0.15 rad of the view angle and nearer than the wall in that direction. Draw a crosshair and the HUD with rect/text after the 3D view.
` : ""}Write plain JavaScript (no imports, DOM, timers, storage, network, async or while loops) that defines:
function init() — resets ALL game state (called at start and after every game over)
function update() — called 60 times per second: input, logic, then draw the whole frame${mode === "3d" ? " (view3d first)" : " starting with cls(0)"}.
Rules: one screen; no levels, saves or menus; difficulty rises with time; a run lasts 1-3 minutes; call over(score) when the player loses; draw the score with text(). Use only the buttons the game needs. Simple shapes, under ${mode === "3d" ? 180 : 150} lines, no comments.
If the player gives an idea, build the game around it as long as it fits a one-screen arcade game.
Return JSON: title (short and original, not the inspiration's name), howTo (one short sentence in language "${language}" naming the controls as ◀ ▶ ▲ ▼ A B), palette (4 hex colors from the inspiration's look; index 0 = background, 3 = strongest contrast), code.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "howTo", "palette", "code"],
  properties: {
    title: { type: "string" },
    howTo: { type: "string" },
    palette: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
    code: { type: "string" },
  },
};

interface ArcadeGame { title: string; howTo: string; palette: string[]; code: string }

function requestBody(model: string, user: unknown[], language: string, mode: string, stream: boolean) {
  return JSON.stringify({
    model,
    input: [{ role: "system", content: SYSTEM(language, mode) }, { role: "user", content: user }],
    max_output_tokens: 9000,
    reasoning: { effort: model.includes("luna") ? "none" : "low" },
    text: { format: { type: "json_schema", name: "arcade_game", strict: true, schema: SCHEMA } },
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

async function ask(model: string, user: unknown[], language: string, mode: string): Promise<ArcadeGame> {
  const data = await (await openai(requestBody(model, user, language, mode, false))).json();
  const text = data.output_text ?? data.output?.flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? "").join("") ?? "";
  return JSON.parse(text);
}

// Streamed: reports how much the model has written so far (real progress for the UI).
async function askStreaming(model: string, user: unknown[], language: string, mode: string, onChars: (n: number) => void): Promise<ArcadeGame> {
  const res = await openai(requestBody(model, user, language, mode, true));
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

const fixRequest = (game: ArcadeGame, problem: string) => [{
  type: "input_text",
  text: `This game fails with: ${problem}\nFix it and return the full JSON again (same idea, same palette).\n${JSON.stringify(game)}`,
}];

// One repair attempt when the code doesn't even parse.
async function checked(game: ArcadeGame, model: string, language: string, mode: string, onFixing: () => void): Promise<ArcadeGame> {
  const problem = codeProblem(game.code);
  if (!problem) return game;
  onFixing();
  const fixed = await ask(model, fixRequest(game, problem), language, mode);
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

const out = (row: any) => ({ id: row.id, title: row.title, howTo: row.how_to, palette: row.palette, code: row.code, inspiredBy: row.inspired_by, mode: row.mode, idea: row.idea });

// @ts-ignore: Deno.serve is the entry point for Supabase Edge Functions
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY not configured" }, 500);

  try {
    const body = await req.json().catch(() => ({}));
    const model = MODELS.has(body?.model) ? body.model : DEFAULT_MODEL;
    const language = typeof body?.language === "string" ? body.language.slice(0, 5) : "en";

    // The client's smoke test threw at runtime → one fix of the stored game.
    if (body?.repair?.id) {
      const [row] = await db(`arcade_games?id=eq.${encodeURIComponent(body.repair.id)}&select=*`, { method: "GET" });
      if (!row) return json({ error: "Not found" }, 404);
      const current: ArcadeGame = { title: row.title, howTo: row.how_to, palette: row.palette, code: row.code };
      const fixed = await checked(
        await ask(model, fixRequest(current, String(body.repair.error ?? "").slice(0, 300)), language, row.mode),
        model, language, row.mode, () => {},
      );
      const [updated] = await db(`arcade_games?id=eq.${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ code: fixed.code, palette: fixed.palette }),
      });
      return json(out(updated));
    }

    const inspiredBy = String(body?.inspiredBy ?? "").slice(0, 80);
    if (!inspiredBy) return json({ error: "Missing inspiredBy" }, 400);
    const genres = Array.isArray(body?.genres) ? body.genres.slice(0, 4).join(", ") : "";
    const description = String(body?.description ?? "").replace(/\s+/g, " ").slice(0, 600);
    const mode = body?.mode === "3d" ? "3d" : "2d";
    const idea = String(body?.idea ?? "").replace(/\s+/g, " ").trim().slice(0, 140);

    const user: unknown[] = [{
      type: "input_text",
      text: `Inspiration: ${inspiredBy} (${genres}). ${description}${idea ? `\nPlayer's idea: ${idea}` : ""}`,
    }];
    // The world the player picked (low detail, ~85 tokens): palette and mood.
    if (typeof body?.screenshot === "string" && body.screenshot.startsWith("https://")) {
      user.push({ type: "input_image", image_url: body.screenshot, detail: "low" });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        try {
          const draft = await askStreaming(model, user, language, mode, (chars) => send({ type: "progress", chars }));
          const game = await checked(draft, model, language, mode, () => send({ type: "fixing" }));
          const [row] = await db("arcade_games", {
            method: "POST",
            body: JSON.stringify({
              title: game.title.slice(0, 60),
              inspired_by: inspiredBy,
              how_to: game.howTo.slice(0, 200),
              palette: game.palette,
              code: game.code,
              model,
              mode,
              idea: idea || null,
            }),
          });
          send({ type: "done", game: out(row) });
        } catch (err) {
          console.error("arcade-generate stream error", err);
          send({ type: "error" });
        }
        controller.close();
      },
    });
    return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  } catch (err) {
    console.error("arcade-generate error", err);
    return json({ error: "Could not create the game" }, 500);
  }
});
