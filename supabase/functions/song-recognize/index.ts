// Song recognition (Music mode's "listen" button) — like Shazam. The page records a few seconds from
// the mic and posts them here; the clip goes to our storage for a moment (the recognizer only takes
// links), Apify's Shazam actor (omkar-cloud/shazam-song-recognition) listens to it (~5 s) and the
// clip is deleted. Only recognized clips are billed ($0.002 each).
//
// POST raw audio (webm/opus, or mp4 on iPhone), header x-audio-type = the recorder's mime type
//   → { found: true, song } | { found: false } | 429 { error: 'daily_limit' | 'sign_in_required' }
// Daily caps on recognized songs (the only ones billed; a miss is free, so listening to someone talk
// costs nothing): guest 30 per connection (hashed IP), free 60, Pro 200; GLOBAL_CAP overall.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-audio-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// @ts-ignore: Deno env
const env = (k: string) => (Deno.env.get(k) ?? "").trim();
const CAP = { guest: 30, free: 60, pro: 200 } as const;
const GLOBAL_CAP = 3000;
const MAX_BYTES = 3_000_000; // ~3 min of opus; a clip is 6-12 s
const BUCKET = "movie-assets";
const ACTOR = "omkar-cloud~shazam-song-recognition";

const db = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

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

async function left(uid: string | null, ip: string): Promise<number> {
  const since = new Date(Date.now() - 864e5).toISOString();
  const recent = () => db().from("song_recognitions").select("id", { count: "exact", head: true }).gte("created_at", since).not("title", "is", null);
  const [{ count: all }, { count: mine }, pro] = await Promise.all([
    recent(),
    uid ? recent().eq("user_id", uid) : recent().eq("creator_ip_hash", ip),
    isPro(uid),
  ]);
  const cap = !uid ? CAP.guest : pro ? CAP.pro : CAP.free;
  return Math.max(0, Math.min(cap - (mine ?? 0), GLOBAL_CAP - (all ?? 0)));
}

type Row = Record<string, any>;
/** The actor's row → what the Music page needs. */
const toSong = (r: Row) => ({
  title: String(r.title ?? ""),
  artist: String(r.artist_name ?? ""),
  album: r.album_name ?? null,
  year: r.release_date ?? null,
  genre: r.genre ?? null,
  coverUrl: r.images?.cover_art_hq ?? r.images?.cover_art ?? null,
  isrc: r.isrc ?? null,
  shazamKey: r.shazam_key ?? null,
  appleMusicUrl: r.hub?.listen_link ?? null,
  previewUrl: r.hub?.preview_link ?? null,
  offsetSec: typeof r.recognition?.offset_in_song_seconds === "number" ? r.recognition.offset_in_song_seconds : null,
});

// @ts-ignore: Deno serve
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!env("APIFY_API_KEY")) return json({ error: "not_configured" }, 503);

  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.length < 1000 || bytes.length > MAX_BYTES) return json({ error: "bad_audio" }, 400);
  const type = (req.headers.get("x-audio-type") ?? "").split(";")[0].trim();
  const ext = type === "audio/mp4" ? "m4a" : type === "audio/ogg" ? "ogg" : "webm";

  const [uid, ip] = await Promise.all([userId(req), ipHash(req)]);
  if (await left(uid, ip) <= 0) return json({ error: uid ? "daily_limit" : "sign_in_required" }, 429);

  const client = db();
  const path = `song-clips/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await client.storage.from(BUCKET).upload(path, bytes, { contentType: type || "audio/webm" });
  if (upErr) return json({ error: `upload: ${upErr.message}` }, 500);
  const url = client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  try {
    // Short clips: listen from the start (left empty, the actor tries the middle first).
    const res = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?timeout=40&maxTotalChargeUsd=0.01`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env("APIFY_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ audioUrls: [url], offsetSeconds: 0 }),
      signal: AbortSignal.timeout(50000),
    });
    if (!res.ok) return json({ error: `apify ${res.status}` }, 502);
    const row = ((await res.json()) as Row[])[0];
    const song = row?.title && row?.artist_name ? toSong(row) : null;
    await client.from("song_recognitions").insert({
      title: song?.title ?? null, artist: song?.artist ?? null, shazam_key: song?.shazamKey ?? null,
      user_id: uid, creator_ip_hash: uid ? null : ip,
    });
    return json(song ? { found: true, song } : { found: false });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502);
  } finally {
    await client.storage.from(BUCKET).remove([path]);
  }
});
