// Current weather as one word (clear, cloudy, foggy, rainy, snowy, stormy) for the Character's
// personal touch. Open-Meteo first (no key), then OpenWeather (OPEN_WEATHER_API), then Google
// Weather (GOOGLE_MAPS_API_KEY); a provider without its key is skipped. Keys stay server-side.
// Body { lat, lng } → { weather, source } (weather null when every provider failed).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
// @ts-ignore: Deno env
const env = (k: string) => (Deno.env.get(k) ?? "").trim();
const get = (url: string) => fetch(url, { signal: AbortSignal.timeout(2500) }).then((r) => (r.ok ? r.json() : null));

/** WMO weather code (Open-Meteo). */
function fromWmo(code: number): string | null {
  if (code === 0) return "clear";
  if (code <= 3) return "cloudy";
  if (code === 45 || code === 48) return "foggy";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rainy";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snowy";
  if (code >= 95) return "stormy";
  return null;
}

/** OpenWeather's weather[0].main, or Google's weatherCondition.type (e.g. LIGHT_RAIN, PARTLY_CLOUDY). */
function fromName(name: string): string | null {
  const n = name.toLowerCase();
  if (/thunder|storm/.test(n)) return "stormy";
  if (/snow|sleet|hail|blizzard/.test(n)) return "snowy";
  if (/rain|drizzle|shower/.test(n)) return "rainy";
  if (/fog|mist|haze|smoke/.test(n)) return "foggy";
  if (/cloud|overcast/.test(n)) return "cloudy";
  if (/clear|sunny/.test(n)) return "clear";
  return null;
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => null);
  const lat = Number(body?.lat), lng = Number(body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return json({ error: "lat and lng are required" }, 400);

  const providers: [string, () => Promise<string | null>][] = [
    ["open-meteo", async () => {
      const code = (await get(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=weather_code`))?.current?.weather_code;
      return typeof code === "number" ? fromWmo(code) : null;
    }],
    ["openweather", async () => {
      if (!env("OPEN_WEATHER_API")) return null;
      const main = (await get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${env("OPEN_WEATHER_API")}`))?.weather?.[0]?.main;
      return typeof main === "string" ? fromName(main) : null;
    }],
    ["google", async () => {
      if (!env("GOOGLE_MAPS_API_KEY")) return null;
      const type = (await get(`https://weather.googleapis.com/v1/currentConditions:lookup?key=${env("GOOGLE_MAPS_API_KEY")}&location.latitude=${lat}&location.longitude=${lng}`))?.weatherCondition?.type;
      return typeof type === "string" ? fromName(type) : null;
    }],
  ];
  for (const [source, lookup] of providers) {
    const weather = await lookup().catch(() => null);
    if (weather) return json({ weather, source });
  }
  return json({ weather: null, source: null });
});
