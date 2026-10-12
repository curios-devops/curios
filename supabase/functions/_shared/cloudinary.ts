// Media of saved creations (songs, game art, movies) lives in Cloudinary, not Supabase Storage,
// which is small on our plan. Signed uploads with CLOUDINARY_* secrets.

// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const env = (k: string) => (Deno.env.get(k) ?? "").trim();
const CLOUD = env("CLOUDINARY_CLOUD_NAME");
const KEY = env("CLOUDINARY_API_KEY");
const SECRET = env("CLOUDINARY_API_SECRET");
const ROOT = env("CLOUDINARY_FOLDER") || "curios";

async function sha1Hex(input: string) {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Uploads bytes (or a public URL Cloudinary fetches itself) and returns its https URL.
 * `folder` is under the root folder ("songs" → curios/creations/songs). Audio is a "video" resource.
 */
export async function storeMedia(
  file: Uint8Array | string,
  o: { folder: string; publicId: string; resourceType: "image" | "video"; contentType?: string },
): Promise<string> {
  if (!CLOUD || !KEY || !SECRET) throw new Error("Cloudinary is not configured");
  const params: Record<string, string> = {
    folder: `${ROOT}/creations/${o.folder}`,
    overwrite: "true",
    public_id: o.publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) form.append(k, v);
  form.append("api_key", KEY);
  form.append("signature", await sha1Hex(toSign + SECRET));
  form.append("file", typeof file === "string" ? file : new Blob([file], { type: o.contentType ?? "application/octet-stream" }));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/${o.resourceType}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Cloudinary ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).secure_url as string;
}

/** Bucket + path of one of our Supabase Storage public URLs (null for anything else). */
export function supabaseObject(url: string | null | undefined, supabaseUrl: string): { bucket: string; path: string } | null {
  const prefix = `${supabaseUrl}/storage/v1/object/public/`;
  if (!url || !url.startsWith(prefix)) return null;
  const [bucket, ...rest] = url.slice(prefix.length).split("?")[0].split("/");
  return rest.length ? { bucket, path: decodeURIComponent(rest.join("/")) } : null;
}

/** Deletes Supabase Storage objects by their public URLs (after they were copied elsewhere). */
export async function deleteSupabaseObjects(urls: (string | null | undefined)[], supabaseUrl: string, serviceKey: string) {
  const byBucket = new Map<string, string[]>();
  for (const u of urls) {
    const o = supabaseObject(u, supabaseUrl);
    if (o) byBucket.set(o.bucket, [...(byBucket.get(o.bucket) ?? []), o.path]);
  }
  for (const [bucket, prefixes] of byBucket) {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}`, {
      method: "DELETE",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes }),
    });
    if (!res.ok) throw new Error(`Storage delete ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}
