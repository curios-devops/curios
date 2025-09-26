// Removed Deno triple-slash reference for local TypeScript compatibility
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
// Explicitly type req as Request for better TypeScript support
// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    // Handle CORS preflight
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const { prompt } = await req.json();
    let parsedPrompt;
    try {
      parsedPrompt = typeof prompt === 'string' ? JSON.parse(prompt) : prompt;
    } catch {
      parsedPrompt = { messages: [{ role: 'user', content: prompt }] };
    }
    
    const payload = {
      model: parsedPrompt.model || "gpt-4o",
      messages: parsedPrompt.messages || [
        {
          role: "user",
          content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt)
        }
      ],
      temperature: parsedPrompt.temperature || 0.7,
      max_tokens: parsedPrompt.max_output_tokens || 1200,
      response_format: parsedPrompt.response_format || { type: 'json_object' }
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
      return new Response(JSON.stringify({
        error
      }), {
        status: response.status,
        headers: corsHeaders
      });
    }
    const data = await response.json();
    return new Response(JSON.stringify({
      text: data.choices?.[0]?.message?.content ?? "",
      openai: data
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: String(err)
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});

