// Telemetry for the hidden /tele dashboard. Only accounts in TELE_ADMIN_EMAILS (comma list)
// get data; anyone else gets a plain 404, as if the function did not exist.
//
import { getVertexAccessToken, vertexModelUrl } from "../_shared/vertex.ts";

// Body { from, to } (ISO) → { stats, providers, at }
//   stats      our own numbers from the database (tele_stats: users, visits, sizes)
//   providers  one entry per API in use: reachable or not, and its raw meters (used / limit /
//              billing cycle), grouped by `section` the same way .env is (General · Search ·
//              Video · Magazine · Character · Otros modos). The page turns meters into %,
//              month projection and colors.
// Every probe is a free account/usage endpoint, except Brave (no usage endpoint: one search
// per dashboard load, read from its rate-limit headers).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const env = (k: string) => (Deno.env.get(k) ?? "").trim();
const SUPABASE_URL = env("SUPABASE_URL");
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const ANON_KEY = env("SUPABASE_ANON_KEY");
const ADMINS = env("TELE_ADMIN_EMAILS").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface Meter {
  label: string;
  used: number;
  limit: number | null;
  unit: "usd" | "bytes" | "users" | "chars" | "credits" | "searches" | "requests";
  /** quota: used of limit per cycle · balance: prepaid money left · info: just a number */
  kind: "quota" | "balance" | "info";
  cycleStart?: string;
  cycleEnd?: string;
  /** balance only: spend per day, for "days left" */
  burnPerDay?: number;
}
interface Provider { id: string; name: string; section?: string; reachable: boolean | null; meters: Meter[]; note?: string }

// Where each API lives — the .env sections, in order.
const SECTIONS = ["General", "Search", "Video", "Magazine", "Character", "Otros modos"] as const;
const SECTION_OF: Record<string, (typeof SECTIONS)[number]> = {
  supabase: "General", openai: "General", gemini: "General", "gemini-studio": "General", stripe: "General", apify: "General",
  serpapi: "Search", "serpapi-news": "Search", tavily: "Search", brave: "Search", exa: "Search", rapidapi: "Search",
  vertex: "Video", runpod: "Video", wavespeed: "Video", pruna: "Video", viggle: "Video", cloudinary: "Video",
  "find-scene": "Video", "find-scene-k": "Video", supadata: "Video", tunelio: "Video", vidkraken: "Video",
  pexels: "Magazine", pixabay: "Magazine",
  elevenlabs: "Character", anam: "Character", characterai: "Character",
  tmdb: "Otros modos", omdb: "Otros modos", rawg: "Otros modos", lastfm: "Otros modos",
};

const monthCycle = () => {
  const n = new Date();
  return {
    cycleStart: new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)).toISOString(),
    cycleEnd: new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 1)).toISOString(),
  };
};

async function get(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body, headers: res.headers };
}

/** Runs one probe: no key → N.A.; thrown/HTTP error → unreachable. */
async function probe(id: string, name: string, keys: string[], fn: () => Promise<Omit<Provider, "id" | "name">>): Promise<Provider> {
  const missing = keys.filter((k) => !env(k));
  if (missing.length) return { id, name, reachable: null, meters: [], note: `Falta ${missing.join(", ")} en Supabase` };
  try {
    return { id, name, ...(await fn()) };
  } catch (e) {
    return { id, name, reachable: false, meters: [], note: String(e instanceof Error ? e.message : e).slice(0, 160) };
  }
}

const fail = (r: { status: number; body: any }) => {
  const b = r.body;
  const msg = b?.error?.message ?? b?.message ?? b?.error ?? b?.detail?.message ?? "";
  throw new Error(`HTTP ${r.status}${msg ? `: ${typeof msg === "string" ? msg : JSON.stringify(msg)}` : ""}`);
};

/** Plain reachability for APIs without a usage endpoint. */
const ping = (url: string, init: RequestInit = {}, note = "Conectado; la API no expone consumo") => async () => {
  const r = await get(url, init);
  if (!r.ok) fail(r);
  return { reachable: true, meters: [], note };
};

const FREE = { db: 500 * 1024 ** 2, storage: 1024 ** 3, mau: 50_000 };

async function providers(stats: any): Promise<Provider[]> {
  const list = await probes(stats);
  return list.map((p) => ({ ...p, section: SECTION_OF[p.id] ?? "General" }));
}

async function probes(stats: any): Promise<Provider[]> {
  const month = monthCycle();
  return Promise.all([
    probe("supabase", "Supabase (Free)", [], async () => ({
      reachable: true,
      meters: [
        { label: "Base de datos", used: stats.db_bytes, limit: FREE.db, unit: "bytes", kind: "quota" },
        { label: "Storage", used: stats.storage_bytes, limit: FREE.storage, unit: "bytes", kind: "quota" },
        { label: "Usuarios activos (30 d)", used: stats.users.active30, limit: FREE.mau, unit: "users", kind: "quota" },
      ],
      note: "Egress e invocaciones de edge functions: N.A. (solo en el panel de Supabase)",
    })),
    probe("openai", "OpenAI", ["OPENAI_API_KEY"], async () => {
      const key = env("OPENAI_ADMIN_KEY") || env("OPENAI_API_KEY");
      const auth = { headers: { Authorization: `Bearer ${key}` } };
      const start = Math.floor(new Date(month.cycleStart).getTime() / 1000);
      const costs = await get(`https://api.openai.com/v1/organization/costs?start_time=${start}&limit=31`, auth);
      if (costs.ok) {
        const usd = (costs.body?.data ?? []).flatMap((b: any) => b.results ?? []).reduce((n: number, r: any) => n + Number(r.amount?.value ?? 0), 0);
        return { reachable: true, meters: [{ label: "Gasto del mes", used: usd, limit: null, unit: "usd", kind: "quota", ...month }] };
      }
      const models = await get("https://api.openai.com/v1/models", auth);
      if (!models.ok) fail(models);
      return { reachable: true, meters: [], note: "Conectado; el consumo requiere una clave admin con permiso api.usage.read (OPENAI_ADMIN_KEY)" };
    }),
    probe("elevenlabs", "ElevenLabs", ["ELEVENLAB_API_KEY"], async () => {
      const r = await get("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": env("ELEVENLAB_API_KEY") } });
      if (!r.ok) fail(r);
      const end = new Date(Number(r.body.next_character_count_reset_unix) * 1000);
      const start = new Date(end); start.setUTCMonth(start.getUTCMonth() - 1);
      return {
        reachable: true,
        meters: [{ label: "Créditos del ciclo", used: r.body.character_count, limit: r.body.character_limit, unit: "credits", kind: "quota", cycleStart: start.toISOString(), cycleEnd: end.toISOString() }],
        note: `Plan ${r.body.tier}`,
      };
    }),
    ...[["serpapi", "SerpAPI", "SERPAPI_API_KEY"], ["serpapi-news", "SerpAPI (News)", "SERPAPI_NEWS_API_KEY"]].map(([id, name, k]) =>
      probe(id, name, [k], async () => {
        const r = await get(`https://serpapi.com/account.json?api_key=${env(k)}`);
        if (!r.ok) fail(r);
        return {
          reachable: true,
          meters: [{ label: "Búsquedas del mes", used: r.body.this_month_usage, limit: r.body.searches_per_month, unit: "searches", kind: "quota", ...month }],
          note: r.body.plan_name,
        };
      })),
    probe("tavily", "Tavily", ["TAVILY_API_KEY"], async () => {
      const r = await get("https://api.tavily.com/usage", { headers: { Authorization: `Bearer ${env("TAVILY_API_KEY")}` } });
      if (!r.ok) fail(r);
      const a = r.body.account ?? {};
      return { reachable: true, meters: [{ label: "Créditos del mes", used: a.plan_usage, limit: a.plan_limit ?? null, unit: "credits", kind: "quota", ...month }], note: `Plan ${a.current_plan}` };
    }),
    probe("brave", "Brave Search", ["BRAVE_API_KEY"], async () => {
      const r = await get("https://api.search.brave.com/res/v1/web/search?q=curios&count=1", { headers: { "X-Subscription-Token": env("BRAVE_API_KEY"), Accept: "application/json" } });
      if (!r.ok) fail(r);
      // "per-second, per-month" pairs, e.g. limit "1, 2000" / remaining "1, 1874"
      const pair = (h: string) => (r.headers.get(h) ?? "").split(",").map((s) => Number(s.trim()));
      const [, limit] = pair("x-ratelimit-limit");
      const [, left] = pair("x-ratelimit-remaining");
      if (!limit) return { reachable: true, meters: [], note: "Conectado; sin cabeceras de cuota" };
      return { reachable: true, meters: [{ label: "Consultas del mes", used: limit - left, limit, unit: "requests", kind: "quota", ...month }] };
    }),
    probe("exa", "Exa", ["EXA_API_KEY"], async () => ({ reachable: null, meters: [], note: "Sin API de uso ni ping gratuito" })),
    probe("gemini", "Gemini (GEMINI_API_KEY)", ["GEMINI_API_KEY"], ping(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${env("GEMINI_API_KEY")}`, {}, "Conectado; Google no expone consumo por API")),
    probe("gemini-studio", "Gemini AI Studio", ["GEMINI_STUDIO_API_KEY"], ping(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${env("GEMINI_STUDIO_API_KEY")}`, {}, "Conectado; Google no expone consumo por API")),
    probe("runpod", "RunPod", ["RUNPOD_API_KEY"], async () => {
      const r = await get("https://api.runpod.io/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env("RUNPOD_API_KEY")}` },
        body: JSON.stringify({ query: "{ myself { clientBalance currentSpendPerHr } }" }),
      });
      const me = r.body?.data?.myself;
      if (!r.ok || !me) fail(r);
      return { reachable: true, meters: [{ label: "Saldo prepago", used: me.clientBalance, limit: null, unit: "usd", kind: "balance", burnPerDay: me.currentSpendPerHr * 24 }] };
    }),
    probe("wavespeed", "WaveSpeed", ["WAVESPEED_API_KEY"], async () => {
      const r = await get("https://api.wavespeed.ai/api/v3/balance", { headers: { Authorization: `Bearer ${env("WAVESPEED_API_KEY")}` } });
      if (!r.ok || r.body?.data?.balance == null) fail(r);
      return { reachable: true, meters: [{ label: "Saldo prepago", used: r.body.data.balance, limit: null, unit: "usd", kind: "balance" }] };
    }),
    probe("pruna", "Pruna", ["PRUNA_API_KEY"], async () => ({ reachable: null, meters: [], note: "Sin API de uso conocida" })),
    // 3D scenes for the Tour video type. Prepaid credits (1 credit = $0.01; a scene from a prompt = 6).
    probe("viggle", "Viggle (escenas 3D)", ["VIGGLE_API_KEY"], async () => {
      const r = await get("https://apis.viggle.ai/v1/credits", { headers: { Authorization: `Bearer ${env("VIGGLE_API_KEY")}` } });
      if (!r.ok || typeof r.body?.balance !== "number") fail(r);
      return {
        reachable: true,
        meters: [{ label: "Saldo prepago", used: r.body.balance / 100, limit: null, unit: "usd", kind: "balance" }],
        note: `${r.body.balance} créditos ≈ ${Math.floor(r.body.balance / 6)} escenas nuevas (6 créditos c/u)`,
      };
    }),
    // Clips: film/TV scenes. Each clip downloaded costs 1 credit, returned 30 days after use.
    ...[["find-scene", "find-scene (escenas)", "FIND_SCENE_API_KEY"], ["find-scene-k", "find-scene (respaldo)", "FIND_SCENE_K_API_KEY"]].map(([id, name, k]) =>
      probe(id, name, [k], async () => {
        const r = await get("https://api.find-scene.com/api/check_quota", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ _token: env(k) }) });
        const left = r.body?.result?.creditsRemaining;
        if (!r.ok || typeof left !== "number") fail(r);
        const back = r.body.result.nextCreditReturnMs;
        return {
          reachable: true,
          meters: [{ label: "Créditos (30 días móviles)", used: 20 - left, limit: 20, unit: "credits", kind: "quota" }],
          note: `${left} clips de películas/series disponibles${back ? ` · el próximo vuelve en ${Math.ceil(back / 864e5)} d` : ""}`,
        };
      })),
    // Clips: YouTube transcripts (1 credit each; a clip search reads up to 3).
    probe("supadata", "Supadata (transcripciones)", ["SUPADATA_API_KEY"], async () => {
      const r = await get("https://api.supadata.ai/v1/me", { headers: { "x-api-key": env("SUPADATA_API_KEY") } });
      if (!r.ok || typeof r.body?.maxCredits !== "number") fail(r);
      return { reachable: true, meters: [{ label: "Créditos del mes", used: r.body.usedCredits, limit: r.body.maxCredits, unit: "credits", kind: "quota", ...month }], note: `Plan ${r.body.plan}` };
    }),
    // Clips: YouTube downloads for the real paused frame + last 5 s (Tunelio first, VidKraken fallback).
    probe("tunelio", "Tunelio (descargas YouTube)", ["TUNELIO_API_KEY"], async () => {
      const r = await get("https://tunelio.dev/credits", { headers: { Authorization: `Bearer ${env("TUNELIO_API_KEY")}` } });
      if (!r.ok || typeof r.body?.credits !== "number") fail(r);
      return { reachable: true, meters: [{ label: "Créditos restantes", used: r.body.credits, limit: null, unit: "credits", kind: "balance" }], note: `Plan ${r.body.plan}` };
    }),
    probe("vidkraken", "VidKraken (respaldo descargas)", ["VIDKRAKEN_API_KEY"], async () => {
      const r = await get("https://vidkraken.com/api/v2/me", { headers: { Authorization: `Bearer ${env("VIDKRAKEN_API_KEY")}` } });
      const b = r.body?.balances;
      if (!r.ok || !b?.download_count) fail(r);
      const MB = 1024 * 1024;
      return {
        reachable: true,
        meters: [
          { label: "Descargas", used: b.download_count.used, limit: b.download_count.unlimited ? null : b.download_count.granted, unit: "requests", kind: "quota" },
          { label: "Ancho de banda", used: b.bandwidth_mb.used * MB, limit: b.bandwidth_mb.unlimited ? null : b.bandwidth_mb.granted * MB, unit: "bytes", kind: "quota" },
        ],
        note: `Plan ${r.body.plan?.id ?? "?"}${b.download_count.resetsAt ? ` · se renueva ${String(b.download_count.resetsAt).slice(0, 10)}` : ""}`,
      };
    }),
    // Swipe frames (Nano Banana) and Veo (Mejorar). countTokens is free and fails the same way a
    // real call would — e.g. billing disabled on the project.
    probe("vertex", "Vertex AI (imágenes · Veo)", ["VERTEX_AI_SERVICE_ACCOUNT_EMAIL", "VERTEX_AI_PRIVATE_KEY"], async () => {
      const token = await getVertexAccessToken();
      const r = await get(`${vertexModelUrl("gemini-2.5-flash", "global")}:countTokens`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "ping" }] }] }),
      });
      if (!r.ok) fail(r);
      return { reachable: true, meters: [], note: "Conectado; el consumo se ve en Google Cloud Billing" };
    }),
    probe("anam", "Anam", ["ANAM_API_KEY"], ping("https://api.anam.ai/v1/personas", { headers: { Authorization: `Bearer ${env("ANAM_API_KEY")}` } })),
    probe("cloudinary", "Cloudinary", ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"], async () => {
      const auth = btoa(`${env("CLOUDINARY_API_KEY")}:${env("CLOUDINARY_API_SECRET")}`);
      const r = await get(`https://api.cloudinary.com/v1_1/${env("CLOUDINARY_CLOUD_NAME")}/usage`, { headers: { Authorization: `Basic ${auth}` } });
      if (!r.ok) fail(r);
      const c = r.body.credits ?? {};
      return {
        reachable: true,
        meters: [
          { label: "Créditos del mes", used: c.usage ?? 0, limit: c.limit ?? null, unit: "credits", kind: "quota", ...month },
          { label: "Almacenamiento", used: r.body.storage?.usage ?? 0, limit: null, unit: "bytes", kind: "info" },
          { label: "Transferencia", used: r.body.bandwidth?.usage ?? 0, limit: null, unit: "bytes", kind: "info" },
        ],
        note: `Plan ${r.body.plan}`,
      };
    }),
    probe("stripe", "Stripe", ["STRIPE_SECRET_KEY"], async () => {
      const r = await get("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}` } });
      if (!r.ok) fail(r);
      const usd = (r.body.available ?? []).filter((b: any) => b.currency === "usd").reduce((n: number, b: any) => n + b.amount, 0) / 100;
      return { reachable: true, meters: [{ label: "Saldo disponible", used: usd, limit: null, unit: "usd", kind: "balance" }] };
    }),
    probe("apify", "Apify", ["APIFY_API_KEY"], async () => {
      const r = await get(`https://api.apify.com/v2/users/me/limits?token=${env("APIFY_API_KEY")}`);
      if (!r.ok) fail(r);
      const d = r.body.data;
      return {
        reachable: true,
        meters: [{ label: "Gasto del ciclo", used: d.current.monthlyUsageUsd, limit: d.limits.maxMonthlyUsageUsd, unit: "usd", kind: "quota", cycleStart: d.monthlyUsageCycle.startAt, cycleEnd: d.monthlyUsageCycle.endAt }],
      };
    }),
    probe("pexels", "Pexels", ["PEXELS_API_KEY"], async () => {
      const r = await get("https://api.pexels.com/v1/curated?per_page=1", { headers: { Authorization: env("PEXELS_API_KEY") } });
      if (!r.ok) fail(r);
      const limit = Number(r.headers.get("x-ratelimit-limit")), left = Number(r.headers.get("x-ratelimit-remaining"));
      return { reachable: true, meters: limit ? [{ label: "Consultas del mes", used: limit - left, limit, unit: "requests", kind: "quota", ...month }] : [] };
    }),
    // Two keys: PIXABAY_API_KEY_2 serves, PIXABAY_API_KEY is its fallback (same catalog; 100/min each).
    probe("pixabay", "Pixabay", ["PIXABAY_API_KEY_2", "PIXABAY_API_KEY"], async () => {
      const check = async (k: string) => (await get(`https://pixabay.com/api/?key=${env(k)}&q=sky&per_page=3`)).ok;
      const [main, backup] = await Promise.all([check("PIXABAY_API_KEY_2"), check("PIXABAY_API_KEY")]);
      if (!main && !backup) throw new Error("Ninguna llave responde");
      return { reachable: true, meters: [], note: `Llave principal ${main ? "OK" : "FALLA"} · respaldo ${backup ? "OK" : "FALLA"}; 100 consultas/min cada una` };
    }),
    probe("tmdb", "TMDB", ["TMDB_API_KEY"], ping(`https://api.themoviedb.org/3/configuration?api_key=${env("TMDB_API_KEY")}`, {}, "Conectado; sin cuota mensual")),
    probe("omdb", "OMDb", ["OMDB_API_KEY"], async () => {
      const r = await get(`https://www.omdbapi.com/?apikey=${env("OMDB_API_KEY")}&i=tt0111161`);
      if (!r.ok || r.body?.Response === "False") fail({ status: r.status, body: { message: r.body?.Error } });
      return { reachable: true, meters: [], note: "Conectado; 1.000 consultas/día sin contador" };
    }),
    probe("rawg", "RAWG", ["RAWG_API_KEY"], ping(`https://api.rawg.io/api/platforms/lists/parents?key=${env("RAWG_API_KEY")}`, {}, "Conectado; sin contador de uso")),
    probe("lastfm", "Last.fm", ["LASTFM_API_KEY"], async () => {
      const r = await get(`https://ws.audioscrobbler.com/2.0/?method=chart.gettopartists&limit=1&format=json&api_key=${env("LASTFM_API_KEY")}`);
      if (!r.ok || r.body?.error) fail({ status: r.status, body: { message: r.body?.message } });
      return { reachable: true, meters: [], note: "Conectado; sin cuota publicada" };
    }),
    probe("rapidapi", "RapidAPI (Searx)", [], async () => ({ reachable: null, meters: [], note: "Cada consulta consume cuota; sin endpoint de uso gratis" })),
    probe("characterai", "Character AI", [], async () => ({ reachable: null, meters: [], note: "Sin API de uso conocida" })),
  ]);
}

/** Cloud Run minutes: each animation recording is one job run (animations.render_seconds), by day. */
async function cloudRun(p_from: string, p_to: string) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/animations?select=render_status,render_seconds,render_requested_at&render_requested_at=gte.${p_from}&render_requested_at=lte.${p_to}`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  const rows: { render_status: string | null; render_seconds: number | null; render_requested_at: string }[] = res.ok ? await res.json() : [];
  const byDay: Record<string, number> = {};
  for (const r of rows) {
    const day = r.render_requested_at.slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + (r.render_seconds ?? 0) / 60;
  }
  return {
    minutes: Math.round(rows.reduce((n, r) => n + (r.render_seconds ?? 0), 0) / 6) / 10,
    renders: rows.filter((r) => r.render_status === "ready").length,
    failed: rows.filter((r) => r.render_status === "failed").length,
    daily: Object.entries(byDay).map(([day, minutes]) => ({ day, minutes: Math.round(minutes * 10) / 10 })),
  };
}

async function adminEmail(req: Request): Promise<string | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token || token === ANON_KEY) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const email = String((await res.json()).email ?? "").toLowerCase();
  return ADMINS.includes(email) ? email : null;
}

// @ts-ignore: Deno.serve is available in Supabase Edge Functions runtime
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!(await adminEmail(req))) return json({ error: "not found" }, 404);
  try {
    const { from, to } = await req.json().catch(() => ({}));
    const now = Date.now();
    const p_from = new Date(from ?? now - 30 * 864e5).toISOString();
    const p_to = new Date(to ?? now).toISOString();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/tele_stats`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_from, p_to }),
    });
    if (!res.ok) throw new Error(`tele_stats ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const stats = await res.json();
    return json({ stats, providers: await providers(stats), cloudRun: await cloudRun(p_from, p_to), at: new Date().toISOString() });
  } catch (e) {
    return json({ error: "telemetry failed", detail: String(e instanceof Error ? e.message : e) }, 500);
  }
});
