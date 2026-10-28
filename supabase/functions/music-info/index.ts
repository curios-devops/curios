// Music 🎵 fact sheet: a song, an artist or an album. Luna reads the query ("¿quién canta
// Despacito?", "OK Computer", "canciones de Shakira") into { kind, artist, title }; Deezer
// (no key) gives the sheet, photos, covers, top songs, discography, similar artists and 30 s
// previews; Last.fm (optional LASTFM_API_KEY) adds listeners, tags and a short bio. When
// Deezer finds nothing, MusicBrainz + Wikipedia fill a smaller sheet.
// Body { query, language?: "es" } or { kind, artist, title, album?, year?, language? } (links
// inside the page; a recognized song also knows its album and year) → MusicInfo JSON, or { found: false }.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
// @ts-ignore: Deno.env is available in Supabase Edge Functions runtime
const LASTFM_API_KEY = Deno.env.get("LASTFM_API_KEY") ?? "";
const UA = "CuriosAI/1.0 (https://curiosai.com)";

type Kind = "track" | "artist" | "album";
// album / year: the song's ORIGINAL album and year, from Luna's knowledge (Deezer's most-played
// version usually sits on a later compilation or remaster).
interface Parsed { kind: Kind; artist: string; title: string; album?: string; year?: string }

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const res = await fetch(url, { headers: { "User-Agent": UA, ...headers }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`${new URL(url).hostname} ${res.status}`);
  return res.json();
}
const quiet = <T>(p: Promise<T>, fallback: T): Promise<T> => p.catch(() => fallback);

// "Bohemian Rhapsody (Remastered 2011)" → "bohemian rhapsody"
const norm = (s: string) => s.toLowerCase().replace(/\s*[([].*?[)\]]/g, "").replace(/\s+-\s+.*$/, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const year = (date?: string) => (date ?? "").slice(0, 4);

async function parseQuery(query: string): Promise<Parsed | null> {
  if (!OPENAI_API_KEY) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-6-luna",
        input: [
          {
            role: "system",
            content: 'The user asks about music. Say whether they mean one song ("track"), a singer/band ("artist") or a record ("album"), and name it with its canonical title and main artist (fill the artist from your knowledge when only a song or album is named; for an artist, title = artist). A bare name that is both an album and its title song means the album only when the user says album/disc/record. For a song also give the original studio album it first appeared on and its original release year, or null when unsure. Reply with strict JSON {"kind":"track|artist|album","artist":"...","title":"...","album":null,"year":null}.',
          },
          { role: "user", content: query },
        ],
        max_output_tokens: 60,
        reasoning: { effort: "none" },
        text: { format: { type: "json_object" } },
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.output_text ?? data.output?.flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? "").join("") ?? "";
    const p = JSON.parse(text);
    if (!["track", "artist", "album"].includes(p?.kind) || typeof p?.artist !== "string") return null;
    return {
      kind: p.kind,
      artist: p.artist.trim(),
      title: String(p.title ?? p.artist).trim(),
      album: typeof p.album === "string" && p.album.trim() ? p.album.trim() : undefined,
      year: /^(19|20)\d\d$/.test(String(p.year)) ? String(p.year) : undefined,
    };
  } catch {
    return null;
  }
}

// ---------- Deezer ----------
const DZ = "https://api.deezer.com";
const dz = (path: string) => getJson(`${DZ}${path}`).then((d) => {
  if (d?.error) throw new Error(`Deezer ${d.error.message}`);
  return d;
});
// Compilations Deezer still types as "album".
const COMPILATION_WORDS = /\b(greatest hits|best of|collection|anthology|essential|essentials|gold|hits|soundtrack|grandes [eé]xitos|lo mejor de)\b/i;
const VERSION_WORDS = /\b(live|karaoke|instrumental|cover|remix|acoustic|demo|version|edit|en vivo|tribute)\b/i;

// Best match: same title (ignoring "(Remastered…)"), not a live/karaoke version unless asked, most popular.
// Deezer's search ignores "artist:" filters and ranks covers high: keep the requested artist's items.
function byArtist<T extends { artist?: { name?: string } }>(items: T[], artist: string): T[] {
  const want = norm(artist);
  const mine = want ? items.filter((x) => norm(x.artist?.name ?? "") === want) : [];
  return mine.length ? mine : items;
}

function bestByTitle<T extends { title: string }>(items: T[], title: string, score: (x: T) => number): T | undefined {
  const want = norm(title);
  const versionAsked = VERSION_WORDS.test(title);
  const ok = (x: T) => versionAsked || !VERSION_WORDS.test(x.title);
  const exact = items.filter((x) => norm(x.title) === want);
  const pool = exact.filter(ok).length ? exact.filter(ok) : exact.length ? exact : items.filter(ok).length ? items.filter(ok) : items;
  return [...pool].sort((a, b) => score(b) - score(a))[0];
}

const trackItem = (t: any) => ({
  title: t.title,
  artist: t.artist?.name ?? "",
  durationSec: t.duration ?? null,
  previewUrl: t.preview || null,
  coverUrl: t.album?.cover_xl ?? t.album?.cover_big ?? null,
  rank: t.rank ?? 0,
});

async function artistExtras(id: number) {
  const [top, albums, related] = await Promise.all([
    quiet(dz(`/artist/${id}/top?limit=10`), { data: [] }),
    quiet(dz(`/artist/${id}/albums?limit=60`), { data: [] }),
    quiet(dz(`/artist/${id}/related?limit=12`), { data: [] }),
  ]);
  // Studio albums, one per title (Deezer lists every deluxe/remaster edition), most loved first:
  // otherwise this year's compilations and live records bury the classic albums.
  const seen = new Set<string>();
  const discography = (albums.data ?? [])
    .filter((a: any) => a.record_type === "album" && !VERSION_WORDS.test(a.title) && !COMPILATION_WORDS.test(a.title))
    .sort((a: any, b: any) => (b.fans ?? 0) - (a.fans ?? 0))
    .filter((a: any) => { const k = norm(a.title); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 12)
    .map((a: any) => ({ id: a.id, title: a.title, year: year(a.release_date), coverUrl: a.cover_xl ?? a.cover_big }));
  return {
    topTracks: (top.data ?? []).map(trackItem),
    albums: discography,
    related: (related.data ?? []).map((a: any) => ({ name: a.name, pictureUrl: a.picture_xl ?? a.picture_big ?? null })),
  };
}

async function findArtist(name: string) {
  const res = await dz(`/search/artist?q=${encodeURIComponent(name)}&limit=10`);
  const want = norm(name);
  const list = res.data ?? [];
  // Several artists share a name ("Queen"): the best-known one.
  const byFans = (xs: any[]) => [...xs].sort((a, b) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0))[0];
  return byFans(list.filter((a: any) => norm(a.name) === want)) ?? byFans(list);
}

// The most-played version of a song usually sits on a compilation or remaster ("Greatest Hits",
// 2005): the song's album and year are those of its earliest non-compilation release.
async function originalAlbum(list: any[], hit: any, p: Parsed) {
  if (p.album) {
    const found = byArtist((await quiet(dz(`/search/album?q=${encodeURIComponent(`${p.album} ${hit.artist.name}`)}&limit=15`), { data: [] })).data ?? [], hit.artist.name);
    const named = found.filter((a: any) => norm(a.title) === norm(p.album!));
    const pick = named.find((a: any) => a.record_type === "album") ?? named[0];
    const album = pick ? await quiet(dz(`/album/${pick.id}`), null) : null;
    if (album) return album;
  }
  const want = norm(hit.title);
  const ids = [...new Set(list
    .filter((t) => norm(t.title) === want && norm(t.artist?.name ?? "") === norm(hit.artist.name) && !VERSION_WORDS.test(t.title))
    .map((t) => t.album.id))].slice(0, 8);
  const albums = (await Promise.all(ids.map((id) => quiet(dz(`/album/${id}`), null)))).filter((a) => a?.release_date);
  const byDate = (a: any, b: any) => a.release_date.localeCompare(b.release_date);
  return albums.filter((a) => a.record_type !== "compile").sort(byDate)[0] ?? albums.sort(byDate)[0] ?? null;
}

async function deezer(p: Parsed) {
  if (p.kind === "artist") {
    const hit = await findArtist(p.artist);
    if (!hit) return null;
    const [artist, extras] = await Promise.all([dz(`/artist/${hit.id}`), artistExtras(hit.id)]);
    // Deezer artists have no genre: take it from their most loved album.
    const topAlbum = extras.albums[0] ? await quiet(dz(`/album/${extras.albums[0].id}`), null) : null;
    return {
      kind: "artist" as const,
      title: artist.name,
      artist: { name: artist.name, pictureUrl: artist.picture_xl ?? null },
      fans: artist.nb_fan ?? null,
      albumCount: artist.nb_album ?? null,
      genres: (topAlbum?.genres?.data ?? []).map((g: any) => g.name),
      link: artist.link ?? null,
      images: [artist.picture_xl, ...extras.albums.slice(0, 8).map((a: any) => a.coverUrl)].filter(Boolean),
      ...extras,
    };
  }

  if (p.kind === "album") {
    const list = byArtist((await dz(`/search/album?q=${encodeURIComponent(`${p.title} ${p.artist}`)}&limit=25`)).data ?? [], p.artist);
    const hit = bestByTitle<any>(list, p.title, (a) => (a.record_type === "album" ? 1e9 : 0) + (a.nb_tracks ?? 0));
    if (!hit) return null;
    const album = await dz(`/album/${hit.id}`);
    const extras = await artistExtras(album.artist.id);
    const tracks = (album.tracks?.data ?? []).map(trackItem);
    return {
      kind: "album" as const,
      title: album.title,
      artist: { name: album.artist.name, pictureUrl: album.artist.picture_xl ?? null },
      album: { title: album.title, coverUrl: album.cover_xl ?? null, year: year(album.release_date) },
      year: year(album.release_date),
      genres: (album.genres?.data ?? []).map((g: any) => g.name),
      label: album.label ?? null,
      trackCount: album.nb_tracks ?? tracks.length,
      durationSec: album.duration ?? null,
      fans: album.fans ?? null,
      link: album.link ?? null,
      tracks,
      images: [album.cover_xl, album.artist.picture_xl].filter(Boolean),
      topTracks: extras.topTracks,
      albums: extras.albums.filter((a: any) => norm(a.title) !== norm(album.title)),
      related: extras.related,
    };
  }

  const list = byArtist((await dz(`/search/track?q=${encodeURIComponent(`${p.title} ${p.artist}`.trim())}&limit=25`)).data ?? [], p.artist);
  const hit = bestByTitle<any>(list, p.title, (t) => t.rank ?? 0);
  if (!hit) return null;
  const [track, album, extras] = await Promise.all([dz(`/track/${hit.id}`), originalAlbum(list, hit, p), artistExtras(hit.artist.id)]);
  // Deezer often only has a later edition of the original album ("Deluxe", 2005).
  const songYear = [p.year, year(album?.release_date ?? track.release_date)].filter(Boolean).sort()[0] ?? "";
  return {
    kind: "track" as const,
    title: track.title_short ?? track.title,
    artist: { name: track.artist.name, pictureUrl: track.artist.picture_xl ?? null },
    album: { title: album?.title ?? track.album.title, coverUrl: album?.cover_xl ?? track.album.cover_xl ?? null, year: songYear },
    year: songYear,
    genres: (album?.genres?.data ?? []).map((g: any) => g.name),
    label: album?.label ?? null,
    durationSec: track.duration ?? null,
    bpm: track.bpm || null,
    previewUrl: track.preview || null,
    link: track.link ?? null,
    featuring: (track.contributors ?? []).map((c: any) => c.name).filter((n: string) => n !== track.artist.name),
    featuringArtists: (track.contributors ?? []).filter((c: any) => c.name !== track.artist.name).map((c: any) => ({ name: c.name, pictureUrl: c.picture_xl ?? null })),
    images: [track.album.cover_xl, track.artist.picture_xl, ...extras.albums.slice(0, 6).map((a: any) => a.coverUrl)].filter(Boolean),
    topTracks: extras.topTracks.filter((t: any) => norm(t.title) !== norm(track.title)),
    albums: extras.albums,
    related: extras.related,
  };
}

// ---------- Last.fm (optional) ----------
const stripHtml = (s: string) => s.replace(/<a [^>]*>.*?<\/a>/gi, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function lastfm(kind: Kind, artist: string, title: string, lang: string) {
  if (!LASTFM_API_KEY) return null;
  const method = kind === "artist" ? "artist.getinfo" : kind === "album" ? "album.getinfo" : "track.getinfo";
  const params = new URLSearchParams({ method, api_key: LASTFM_API_KEY, format: "json", autocorrect: "1", artist, lang });
  if (kind === "album") params.set("album", title);
  if (kind === "track") params.set("track", title);
  const d = await quiet(getJson(`https://ws.audioscrobbler.com/2.0/?${params}`), null);
  const node = d?.artist ?? d?.album ?? d?.track;
  if (!node) return null;
  const stats = node.stats ?? node;
  // Listeners often tag a song with its artist ("Queen"): not a genre.
  const tags = (node.tags?.tag ?? node.toptags?.tag ?? []).map((t: any) => t.name).filter((t: string) => norm(t) !== norm(artist)).slice(0, 5);
  const bio = stripHtml(node.bio?.summary ?? node.wiki?.summary ?? "");
  return {
    listeners: Number(stats.listeners) || null,
    playcount: Number(stats.playcount) || null,
    tags,
    bio: bio.length > 40 ? bio : "",
    lastfmUrl: node.url ?? null,
  };
}

// ---------- Lyrics (LRCLIB, no key) — licence-compliant ----------
// Lyrics are copyrighted unless public domain in both the US (published more than 95 years
// ago) and the EU (lyricist dead more than 70 years) → then the full text; otherwise a short quotation
// (4 lines) to support the commentary, and the full lyrics stay a link to a licensed site.
// Nothing (or instrumental) → null, and the page shows no Lyrics tab. The full protected
// text never leaves this function.
const EXCERPT_LINES = 4;

async function lyricistDeath(artist: string, title: string): Promise<number | null> {
  if (!OPENAI_API_KEY) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-6-luna",
        input: [
          { role: "system", content: 'Who wrote the LYRICS of this song, and in which year did the last surviving lyricist die? Traditional/anonymous lyrics count as 1800. Reply with strict JSON {"died": year} or {"died": null} when any lyricist is alive or you are not sure.' },
          { role: "user", content: `"${title}" as recorded by ${artist}` },
        ],
        max_output_tokens: 40,
        reasoning: { effort: "none" },
        text: { format: { type: "json_object" } },
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.output_text ?? data.output?.flatMap((o: any) => o.content ?? []).map((c: any) => c.text ?? "").join("") ?? "";
    const died = Number(JSON.parse(text)?.died);
    return died > 1000 ? died : null;
  } catch {
    return null;
  }
}
async function lyrics(artist: string, title: string, durationSec: number | null, songYear: string) {
  const params = new URLSearchParams({ artist_name: artist, track_name: title });
  if (durationSec) params.set("duration", String(durationSec));
  const d = await quiet(getJson(`https://lrclib.net/api/get?${params}`), null)
    ?? (durationSec ? await quiet(getJson(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`), null) : null);
  const text: string = d?.plainLyrics ?? "";
  if (!text.trim() || d?.instrumental) return null;
  const now = new Date().getFullYear();
  const usFree = Number(songYear) > 0 && Number(songYear) <= now - 96;
  // Rare case, so only then: when did the lyricist die? Unknown → treated as protected.
  if (usFree) {
    const died = await lyricistDeath(artist, title);
    if (died && died <= now - 71) return { text: text.trim(), full: true };
  }
  // Opening lines with words, not ad-libs ("Ohhh, oh, no").
  const realWords = (l: string) => new Set((l.toLowerCase().match(/\p{L}{3,}/gu) ?? [])).size;
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => !/^\[.*\]$/.test(l) && realWords(l) >= 3);
  return { text: [...new Set(lines)].slice(0, EXCERPT_LINES).join("\n"), full: false };
}

// ---------- Line-up (songs): the band and its members, or the singer and their bands ----------
// MusicBrainz "member of band" relations (free; 1 request/s, so the two calls run in sequence).
// Members who stayed less than a year (early bassists who left within weeks) are left out.
// Photos: the member's Deezer artist page, else their Wikipedia picture.
const MB = "https://musicbrainz.org/ws/2";
const mbYear = (d?: string) => (d ?? "").slice(0, 4);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// MusicBrainz answers 503 when its 1 request/s limit is hit (shared by every function call): wait and retry.
async function mbJson(url: string): Promise<any> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await getJson(url);
    } catch (err) {
      if (!String(err).includes("503") || attempt === 2) throw err;
      await sleep(1100 * (attempt + 1));
    }
  }
}

async function photoOf(name: string, context: string): Promise<string | null> {
  const dzHit = await quiet(findArtist(name), null);
  if (dzHit && norm(dzHit.name) === norm(name) && (dzHit.nb_fan ?? 0) > 1000) return dzHit.picture_xl ?? null;
  return (await wikipedia(`${name} ${context}`, "en"))?.imageUrl ?? null;
}

async function lineup(artistName: string, artistPicture: string | null) {
  const found = await quiet(mbJson(`${MB}/artist/?query=${encodeURIComponent(`artist:"${artistName}"`)}&fmt=json&limit=5`), null);
  const hit = (found?.artists ?? []).find((a: any) => norm(a.name) === norm(artistName));
  if (!hit) return null;
  await sleep(1000);
  const full = await quiet(mbJson(`${MB}/artist/${hit.id}?inc=artist-rels&fmt=json`), null);
  const rels = (full?.relations ?? []).filter((r: any) => r.type === "member of band");
  const isGroup = hit.type !== "Person";
  const lasted = (r: any) => {
    if (!r.end) return true;
    const days = (Date.parse(r.end.padEnd(10, "-01").replace(/-$/, "")) - Date.parse((r.begin ?? r.end).padEnd(10, "-01").replace(/-$/, ""))) / 86_400_000;
    return days >= 365;
  };
  const seen = new Set<string>();
  const people = rels
    .filter((r: any) => r.direction === (isGroup ? "backward" : "forward") && lasted(r))
    // A band's members without a start date are usually founders → first; a singer's bands
    // without dates are side projects (charity supergroups) → last.
    .sort((a: any, b: any) => (a.begin ?? (isGroup ? "0" : "9")).localeCompare(b.begin ?? (isGroup ? "0" : "9")))
    .filter((r: any) => !seen.has(r.artist.name) && seen.add(r.artist.name))
    .slice(0, 8);
  if (!people.length) return null;
  const photos = await Promise.all(people.map((r: any) => photoOf(r.artist.name, isGroup ? artistName : "band")));
  const list = people.map((r: any, i: number) => ({
    name: r.artist.name,
    pictureUrl: photos[i],
    from: mbYear(r.begin),
    to: r.end ? mbYear(r.end) : "",
  }));
  // A band → its members; a person → the bands they played in.
  return isGroup
    ? { group: { name: artistName, pictureUrl: artistPicture }, members: list, groups: [] }
    : { group: null, members: [], groups: list.filter((g: { pictureUrl: string | null }) => g.pictureUrl) };
}

// ---------- Fallback: MusicBrainz + Wikipedia ----------
async function wikipedia(subject: string, lang: string) {
  const host = `https://${lang}.wikipedia.org`;
  const search = await quiet(getJson(`${host}/w/api.php?action=query&list=search&srlimit=1&format=json&srsearch=${encodeURIComponent(subject)}`), null);
  const page = search?.query?.search?.[0]?.title;
  if (!page) return null;
  const s = await quiet(getJson(`${host}/api/rest_v1/page/summary/${encodeURIComponent(page)}`), null);
  if (!s) return null;
  return { extract: s.extract ?? "", imageUrl: s.originalimage?.source ?? s.thumbnail?.source ?? null, url: s.content_urls?.desktop?.page ?? null };
}

async function musicbrainz(p: Parsed, lang: string) {
  const MB = "https://musicbrainz.org/ws/2";
  const entity = p.kind === "artist" ? "artist" : p.kind === "album" ? "release-group" : "recording";
  const q = p.kind === "artist" ? `artist:"${p.artist}"` : `${p.kind === "album" ? "releasegroup" : "recording"}:"${p.title}" AND artist:"${p.artist}"`;
  const d = await quiet(getJson(`${MB}/${entity}/?query=${encodeURIComponent(q)}&fmt=json&limit=5`), null);
  const hit = (d?.artists ?? d?.["release-groups"] ?? d?.recordings ?? [])[0];
  if (!hit) return null;
  const artistName = p.kind === "artist" ? hit.name : hit["artist-credit"]?.[0]?.name ?? p.artist;
  const title = p.kind === "artist" ? hit.name : hit.title;
  const wiki = await wikipedia(p.kind === "artist" ? artistName : `${title} ${artistName}`, lang)
    ?? (lang !== "en" ? await wikipedia(p.kind === "artist" ? artistName : `${title} ${artistName}`, "en") : null);
  return {
    kind: p.kind,
    title,
    artist: { name: artistName, pictureUrl: p.kind === "artist" ? wiki?.imageUrl ?? null : null },
    year: year(hit["first-release-date"] ?? hit["life-span"]?.begin),
    genres: (hit.tags ?? []).sort((a: any, b: any) => b.count - a.count).map((t: any) => t.name).slice(0, 3),
    link: null,
    images: wiki?.imageUrl ? [wiki.imageUrl] : [],
    bio: wiki?.extract ?? "",
    wikipediaUrl: wiki?.url ?? null,
    topTracks: [],
    albums: [],
    related: [],
  };
}

// @ts-ignore: Deno.serve is the entry point for Supabase Edge Functions
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const lang = typeof body?.language === "string" ? body.language.slice(0, 2) : "en";
    const query = typeof body?.query === "string" ? body.query.trim() : "";

    // Body { lineup: { artist, pictureUrl } } → { lineup }: asked after the sheet is shown
    // (MusicBrainz's rate limit makes it the slowest part).
    if (typeof body?.lineup?.artist === "string") {
      const pic = typeof body.lineup.pictureUrl === "string" ? body.lineup.pictureUrl : null;
      return json({ lineup: await quiet(lineup(body.lineup.artist, pic), null) });
    }

    // Body { videos: [youtubeId…] } → { id }: the first one YouTube lets other sites embed
    // (label videos often block it and show "video unavailable" inside the player).
    if (Array.isArray(body?.videos)) {
      const ids = body.videos.filter((v: unknown) => typeof v === "string" && /^[\w-]{11}$/.test(v)).slice(0, 6);
      const ok = await Promise.all(ids.map((id: string) =>
        fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`, { signal: AbortSignal.timeout(3000) })
          .then((r) => r.ok).catch(() => false)));
      return json({ id: ids.find((_: string, i: number) => ok[i]) ?? null });
    }

    // Links inside the page already know what they open; free text goes through Luna.
    let parsed: Parsed | null = ["track", "artist", "album"].includes(body?.kind) && typeof body?.artist === "string"
      ? { kind: body.kind, artist: body.artist, title: typeof body?.title === "string" ? body.title : body.artist, ...(typeof body?.album === "string" ? { album: body.album } : {}), ...(typeof body?.year === "string" ? { year: body.year } : {}) }
      : null;
    if (!parsed && !query) return json({ error: "Missing query" }, 400);
    parsed ??= (await parseQuery(query)) ?? { kind: "track", artist: "", title: query };

    const info = (await quiet(deezer(parsed), null)) ?? (await musicbrainz(parsed, lang));
    if (!info) return json({ found: false });

    const [fm, words] = await Promise.all([
      lastfm(info.kind, info.artist.name, info.title, lang),
      info.kind === "track" ? lyrics(info.artist.name, info.title, (info as { durationSec?: number | null }).durationSec ?? null, (info as { year?: string }).year ?? "") : null,
    ]);
    return json({
      found: true,
      source: info.link ? "deezer" : "musicbrainz",
      ...info,
      listeners: fm?.listeners ?? null,
      playcount: fm?.playcount ?? null,
      tags: fm?.tags ?? [],
      bio: fm?.bio || (info as { bio?: string }).bio || "",
      lastfmUrl: fm?.lastfmUrl ?? null,
      lyrics: words,
    });
  } catch (err) {
    console.error("music-info error", err);
    return json({ found: false });
  }
});
