// Storage retention. Guest Movie clips/frames (movie-assets/curios-guest/ and
// movie-assets/guest/) are never referenced by public rows, so anything older
// than RETENTION_DAYS is deleted to keep Storage inside the Free plan.
// Called daily by .github/workflows/storage-retention.yml.
//
// Auth: header `x-retention-secret` must equal the RETENTION_SECRET secret.
// Body: { "dryRun": true } → only reports what would be deleted.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const BUCKET = "movie-assets";
const GUEST_PREFIXES = ["curios-guest", "guest"];
const RETENTION_DAYS = 30;

// @ts-ignore
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-ignore
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// @ts-ignore
const RETENTION_SECRET = Deno.env.get("RETENTION_SECRET");

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

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (!RETENTION_SECRET || req.headers.get("x-retention-secret") !== RETENTION_SECRET) {
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
    };
    console.log("storage-retention", summary);
    return json(summary);
  } catch (e) {
    console.error("storage-retention failed", e);
    return json({ error: String(e) }, 500);
  }
});
