const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

 Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    // Handle CORS preflight
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { prompt } = await req.json();

    const payload = {
      model: "gpt-4o", // or "gpt-3.5-turbo", "gpt-4o-mini", etc.
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1500
    };

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error }), { status: response.status, headers: corsHeaders });
    }

    const data = await response.json();
    return new Response(JSON.stringify({
      text: data.choices?.[0]?.message?.content ?? "",
      openai: data
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
