// Storage retention. Guest Movie clips/frames (movie-assets/curios-guest/ and
// movie-assets/guest/) are never referenced by public rows, so anything older
// than RETENTION_DAYS is deleted to keep Storage inside the Free plan.
// Called daily by .github/workflows/storage-retention.yml.
//
// It also archives saved creations: their media moves from Supabase Storage to Cloudinary
// (movies a day after they are saved, so a movie being watched right away keeps playing;
// songs and game art right away — new ones already go straight to Cloudinary).
//
// Auth: header `x-retention-secret` must equal the RETENTION_SECRET secret, or a signed-in
// account in TELE_ADMIN_EMAILS (to run it by hand).
// Body: { "dryRun": true } → only reports what would be deleted / archived.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { deleteSupabaseObjects, storeMedia, supabaseObject } from "../_shared/cloudinary.ts";

const BUCKET = "movie-assets";
const GUEST_PREFIXES = ["curios-guest", "guest"];
const RETENTION_DAYS = 7; // was 30: guest frames (~2 MB PNGs, ~30 a day) filled the 1 GB plan in three weeks

// @ts-ignore
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-ignore
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// @ts-ignore
const RETENTION_SECRET = Deno.env.get("RETENTION_SECRET");
// @ts-ignore
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
// @ts-ignore
const ADMINS = (Deno.env.get("TELE_ADMIN_EMAILS") ?? "").toLowerCase().split(",").map((e: string) => e.trim()).filter(Boolean);

const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
type Obj = { path: string; size: number; createdAt: string };

// Recursively list every file under `prefix` (folders come back with id === null).
async function listAll(prefix: string, out: Obj[] = []): Promise<Obj[]> {
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ prefix, limit: 1000, offset }),
    });
    if (!res.ok) throw new Error(`list ${prefix} failed: ${res.status} ${await res.text()}`);
    const items = await res.json();
    for (const it of items) {
      const path = `${prefix}/${it.name}`;
      if (it.id === null) await listAll(path, out);
      else out.push({ path, size: it.metadata?.size ?? 0, createdAt: it.created_at });
    }
    if (items.length < 1000) break;
  }
  return out;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// ---------- Archive: creation media → Cloudinary ----------
const ARCHIVE_MOVIES_AFTER_MS = 864e5;
const MOVIES_PER_RUN = 5;
const ON_SUPABASE = "*/storage/v1/object/public/*";
const rest = async (path: string, init: RequestInit = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...headers, Prefer: "return=minimal", ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`rest ${path.split("?")[0]} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
};
const ours = (u: string | null | undefined): u is string => supabaseObject(u, SUPABASE_URL) !== null;

/** Copies each of our Storage URLs to Cloudinary once (same file → same copy); returns old → new. */
async function copyAll(urls: (string | null | undefined)[], folder: string) {
  const unique = [...new Set(urls.filter(ours))];
  const moved = await Promise.all(unique.map((u) => {
    const path = supabaseObject(u, SUPABASE_URL)!.path;
    const video = /\.(mp4|webm|mov|mp3|wav|m4a|ogg)$/i.test(path);
    return storeMedia(u, { folder, publicId: path.replace(/\.[a-z0-9]+$/i, "").replace(/[^\w-]+/g, "_"), resourceType: video ? "video" : "image" });
  }));
  return new Map(unique.map((u, i) => [u, moved[i]]));
}
const swap = (m: Map<string, string>, u: string | null) => (u && m.get(u)) || u;

async function archiveCreations(dryRun: boolean) {
  const like = `like.${encodeURIComponent(ON_SUPABASE)}`;
  const orLike = (cols: string[]) => `or=(${cols.map((c) => `${c}.${like}`).join(",")})`;
  const songs = await rest(`songs?select=id,audio_url,instrumental_url&${orLike(["audio_url", "instrumental_url"])}`, { headers: { Prefer: "" } });
  const games = await rest(`arcade_games?select=id,art&${orLike(["art->>bg", "art->>sheet"])}`, { headers: { Prefer: "" } });
  const before = new Date(Date.now() - ARCHIVE_MOVIES_AFTER_MS).toISOString();
  const movies = await rest(`movie_projects?select=id,full_video_url,thumbnail_url&status=eq.complete&created_at=lt.${before}&full_video_url=${like}&order=created_at.asc&limit=${MOVIES_PER_RUN}`, { headers: { Prefer: "" } });
  const summary = { songs: songs.length, games: games.length, movies: movies.length, files: 0 };
  if (dryRun) return summary;

  for (const s of songs) {
    const m = await copyAll([s.audio_url, s.instrumental_url], "songs");
    await rest(`songs?id=eq.${s.id}`, { method: "PATCH", body: JSON.stringify({ audio_url: swap(m, s.audio_url), instrumental_url: swap(m, s.instrumental_url) }) });
    await deleteSupabaseObjects([...m.keys()], SUPABASE_URL, SERVICE_KEY);
    summary.files += m.size;
  }
  for (const g of games) {
    const m = await copyAll([g.art?.bg, g.art?.sheet], "games");
    await rest(`arcade_games?id=eq.${g.id}`, { method: "PATCH", body: JSON.stringify({ art: { ...g.art, bg: swap(m, g.art?.bg ?? null), sheet: swap(m, g.art?.sheet ?? null) } }) });
    await deleteSupabaseObjects([...m.keys()], SUPABASE_URL, SERVICE_KEY);
    summary.files += m.size;
  }
  for (const p of movies) {
    const scenes = await rest(`movie_scenes?project_id=eq.${p.id}&select=id,image_url,video_url,narration_audio_url`, { headers: { Prefer: "" } });
    const m = await copyAll([p.full_video_url, p.thumbnail_url, ...scenes.flatMap((s: any) => [s.image_url, s.video_url, s.narration_audio_url])], "movies");
    for (const s of scenes) {
      if (![s.image_url, s.video_url, s.narration_audio_url].some((u) => u && m.has(u))) continue;
      await rest(`movie_scenes?id=eq.${s.id}`, { method: "PATCH", body: JSON.stringify({ image_url: swap(m, s.image_url), video_url: swap(m, s.video_url), narration_audio_url: swap(m, s.narration_audio_url) }) });
    }
    // The project last: if anything above failed, it is picked up again tomorrow.
    await rest(`movie_projects?id=eq.${p.id}`, { method: "PATCH", body: JSON.stringify({ full_video_url: swap(m, p.full_video_url), thumbnail_url: swap(m, p.thumbnail_url) }) });
    await deleteSupabaseObjects([...m.keys()], SUPABASE_URL, SERVICE_KEY);
    summary.files += m.size;
  }
  return summary;
}

async function isAdmin(req: Request) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token || token === ANON_KEY || !ADMINS.length) return false;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } });
  return res.ok && ADMINS.includes(String((await res.json()).email ?? "").toLowerCase());
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  const bySecret = !!RETENTION_SECRET && req.headers.get("x-retention-secret") === RETENTION_SECRET;
  if (!bySecret && !(await isAdmin(req))) {
    return json({ error: "unauthorized" }, 401);
  }
  const { dryRun = false } = await req.json().catch(() => ({}));

  try {
    const cutoff = Date.now() - RETENTION_DAYS * 864e5;
    const files: Obj[] = [];
    for (const p of GUEST_PREFIXES) await listAll(p, files);
    const expired = files.filter((f) => new Date(f.createdAt).getTime() < cutoff);

    let deleted = 0;
    if (!dryRun) {
      for (let i = 0; i < expired.length; i += 100) {
        const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
          method: "DELETE",
          headers,
          body: JSON.stringify({ prefixes: expired.slice(i, i + 100).map((f) => f.path) }),
        });
        if (!res.ok) throw new Error(`delete failed: ${res.status} ${await res.text()}`);
        deleted += (await res.json()).length;
      }
    }

    const summary = {
      dryRun,
      retentionDays: RETENTION_DAYS,
      scanned: files.length,
      expired: expired.length,
      expiredMB: +(expired.reduce((s, f) => s + f.size, 0) / 1048576).toFixed(1),
      deleted,
      archived: await archiveCreations(dryRun).catch((e) => ({ error: String(e) })),
    };
    console.log("storage-retention", summary);
    return json(summary);
  } catch (e) {
    console.error("storage-retention failed", e);
    return json({ error: String(e) }, 500);
  }
});
