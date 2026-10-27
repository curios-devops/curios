// Animation (Video page type) — the studio. A model writes the answer as a live stage: a 3D machine
// you can turn and run (three.js) or an animated story (SVG + GSAP) in a famous explainer style
// (prompts.ts). Writing one takes Sol 1-3 minutes, longer than an edge call may wait, so it runs in
// OpenAI's background mode: `start` launches it, the page polls `status` until the page is written.
// One animation per question (animations table), so the same question opens at once and is free.
//
// Body { action }:
//   lookup { key }                          → { ready: true, animation } | { ready: false, left }
//   start  { key, question, tier }          → { status: 'making' } — tier luna|sol|astra (Astra for Pro only).
//          Daily caps: guest 2 per connection (hashed IP), free 5, Pro 20; GLOBAL_CAP overall.
//   status { key }                          → { status: 'making' } | { ready: true, animation } | { status: 'failed' }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { CLASSIFY, MACHINE, STORY, STORY_STYLES } from "./prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// @ts-ignore: Deno env
const env = (k: string) => (Deno.env.get(k) ?? "").trim();
const CAP = { guest: 2, free: 5, pro: 20 } as const;
const GLOBAL_CAP = 300;
const STALE_MS = 12 * 60 * 1000; // a page still unwritten after this is given up
const MODELS = {
  luna: () => env("MODEL_LUNA") || "gpt-6-luna",
  sol: () => env("MODEL_SOL") || "gpt-6.1-sol",
  astra: () => env("MODEL_ASTRA") || "gpt-6-astra",
};

const db = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const openai = (path: string, init: RequestInit = {}) =>
  fetch(`https://api.openai.com/v1${path}`, { ...init, headers: { Authorization: `Bearer ${env("OPENAI_API_KEY")}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });

async function userId(req: Request): Promise<string | null> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token || token === env("SUPABASE_ANON_KEY")) return null;
  const res = await fetch(`${env("SUPABASE_URL")}/auth/v1/user`, { headers: { apikey: env("SUPABASE_ANON_KEY"), Authorization: `Bearer ${token}` } });
  return res.ok ? String((await res.json()).id ?? "") || null : null;
}

/** A guest's connection, hashed — counted for the guest cap, never stored in clear. */
async function ipHash(req: Request): Promise<string> {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${env("SUPABASE_URL")}`));
  return [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function isPro(uid: string | null): Promise<boolean> {
  if (!uid) return false;
  const { data } = await db().from("profiles").select("is_pro").eq("id", uid).maybeSingle();
  return Boolean((data as { is_pro?: boolean } | null)?.is_pro);
}

async function left(req: Request, uid: string | null): Promise<number> {
  const since = new Date(Date.now() - 864e5).toISOString();
  const recent = () => db().from("animations").select("id", { count: "exact", head: true }).gte("created_at", since);
  const [{ count: all }, { count: mine }, pro] = await Promise.all([
    recent(),
    uid ? recent().eq("user_id", uid) : recent().eq("creator_ip_hash", await ipHash(req)),
    isPro(uid),
  ]);
  const cap = !uid ? CAP.guest : pro ? CAP.pro : CAP.free;
  return Math.max(0, Math.min(cap - (mine ?? 0), GLOBAL_CAP - (all ?? 0)));
}

const toAnimation = (r: Record<string, unknown>) => ({ question: r.question, kind: r.kind, style: r.style, model: r.model, html: r.html });

/** Luna picks the technique: a 3D machine or a story, and the story's style. */
async function classify(question: string): Promise<{ kind: "machine" | "story"; style: string }> {
  const res = await openai("/responses", {
    method: "POST",
    body: JSON.stringify({ model: MODELS.luna(), reasoning: { effort: "none" }, instructions: CLASSIFY, input: question, text: { format: { type: "json_object" } }, max_output_tokens: 200 }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  const data = res?.ok ? await res.json().catch(() => null) : null;
  const text = data?.output_text ?? (data?.output ?? []).flatMap((o: Record<string, any>) => o.content ?? []).map((c: Record<string, any>) => c.text ?? "").join("");
  let out: Record<string, unknown> = {};
  try { out = JSON.parse(text); } catch { /* → story */ }
  const kind = out.kind === "machine" ? "machine" : "story";
  return { kind, style: kind === "machine" ? "3d" : String(out.style) in STORY_STYLES ? String(out.style) : "kurzgesagt" };
}

const pageOf = (data: Record<string, any>) => {
  const text = data.output_text ?? (data.output ?? []).flatMap((o: Record<string, any>) => o.content ?? []).map((c: Record<string, any>) => c.text ?? "").join("");
  const m = String(text).match(/```html\s*\n([\s\S]*?)```/);
  const html = (m ? m[1] : String(text)).trim();
  return /id=["']manifest["']/.test(html) && html.length > 500 ? html : null;
};

// @ts-ignore: Deno global
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const key = typeof body.key === "string" ? body.key.trim().slice(0, 300) : "";
    if (!key) return json({ error: "key required" }, 400);
    const uid = await userId(req);
    const { data: row } = await db().from("animations").select("*").eq("question_key", key).maybeSingle();
    const stale = row && row.status === "making" && Date.now() - new Date(row.created_at).getTime() > STALE_MS;

    if (body.action === "lookup") {
      if (row?.status === "ready") return json({ ready: true, animation: toAnimation(row) });
      if (row?.status === "making" && !stale) return json({ ready: false, status: "making" });
      return json({ ready: false, left: await left(req, uid) });
    }

    if (body.action === "start") {
      if (row?.status === "ready") return json({ ready: true, animation: toAnimation(row) });
      if (row?.status === "making" && !stale) return json({ status: "making" });
      const question = typeof body.question === "string" ? body.question.trim().slice(0, 500) : "";
      if (!question) return json({ error: "question required" }, 400);
      if (await left(req, uid) <= 0) return json({ error: uid ? "daily_limit" : "sign_in_required" }, 429);
      const tier = body.tier === "astra" && await isPro(uid) ? "astra" : body.tier === "luna" ? "luna" : "sol";
      const { kind, style } = await classify(question);
      const effort = tier === "luna" ? "none" : kind === "machine" ? "medium" : "low";
      const started = await openai("/responses", {
        method: "POST",
        body: JSON.stringify({
          model: MODELS[tier](), reasoning: { effort }, instructions: kind === "machine" ? MACHINE : STORY(style),
          input: question, background: true, store: true, max_output_tokens: 48000,
        }),
      });
      const job = await started.json().catch(() => null);
      if (!started.ok || !job?.id) { console.error("openai start", started.status, JSON.stringify(job).slice(0, 300)); return json({ error: "start_failed" }, 502); }
      const fields = {
        question_key: key, question, kind, style, model: MODELS[tier](), status: "making", response_id: job.id, html: null,
        user_id: uid, creator_ip_hash: uid ? null : await ipHash(req), created_at: new Date().toISOString(),
      };
      const { error } = await db().from("animations").upsert(fields, { onConflict: "question_key" });
      if (error) throw error;
      return json({ status: "making", kind, style });
    }

    if (body.action === "status") {
      if (!row) return json({ status: "failed" });
      if (row.status === "ready") return json({ ready: true, animation: toAnimation(row) });
      if (stale || row.status === "failed") return json({ status: "failed" });
      const res = await openai(`/responses/${row.response_id}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) return json({ status: "making" }); // a hiccup: ask again
      if (data.status === "queued" || data.status === "in_progress") return json({ status: "making" });
      const html = data.status === "completed" ? pageOf(data) : null;
      if (!html) {
        console.error("animation failed", data.status, data.incomplete_details ?? data.error ?? "no page");
        await db().from("animations").delete().eq("question_key", key); // the next visit can try again
        return json({ status: "failed" });
      }
      const { data: saved, error } = await db().from("animations").update({ status: "ready", html, updated_at: new Date().toISOString() }).eq("question_key", key).select("*").single();
      if (error) throw error;
      return json({ ready: true, animation: toAnimation(saved) });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("animation-studio", e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
