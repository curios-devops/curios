// Simplified Supabase Edge Function for OpenAI API calls
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// @ts-ignore
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4.1-mini-2025-04-14";
const TIMEOUT_MS = 28000; // 28 seconds (leave buffer for edge function)
// @ts-ignore
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Require Authorization header
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: corsHeaders
    });
  }

  try {
    const { prompt } = await req.json();
    
    // Parse prompt
    let parsedPrompt;
    try {
      parsedPrompt = typeof prompt === 'string' ? JSON.parse(prompt) : prompt;
    } catch {
      parsedPrompt = { messages: [{ role: 'user', content: prompt }] };
    }

    // Build OpenAI payload
    const payload = {
      model: parsedPrompt.model || DEFAULT_MODEL,
      messages: parsedPrompt.messages || [{ role: "user", content: String(prompt) }],
      temperature: parsedPrompt.temperature || 0.7,
      max_tokens: parsedPrompt.max_output_tokens || 1200,
      response_format: parsedPrompt.response_format || { type: 'json_object' }
    };

    // Call OpenAI with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', { status: response.status, error });
      return new Response(JSON.stringify({ error: `OpenAI error: ${response.status}` }), {
        status: response.status,
        headers: corsHeaders
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    return new Response(JSON.stringify({
      text: content,
      openai: data
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (err) {
    console.error('Edge function error:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: corsHeaders
    });
  }
});

