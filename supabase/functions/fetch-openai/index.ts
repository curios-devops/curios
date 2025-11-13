// Simplified Supabase Edge Function for OpenAI API calls
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// @ts-ignore
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
// @ts-ignore
const OPENAI_ORG_ID = Deno.env.get("OPENAI_ORG_ID");
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";
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
    const body = await req.json();
    
    // Check if this is an image generation request
    if (body.imageGeneration) {
      console.log('🎨 Image generation request received');
      
      // Build gpt-image-1 payload
      const imagePayload = {
        model: body.model || "gpt-image-1",
        prompt: body.prompt,
        size: body.size || "1024x1536",
        quality: body.quality || "low",
        n: body.n || 1
      };

      console.log('📝 Image payload:', imagePayload);

      // Call OpenAI Image API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      };
      
      // Add organization header if available
      if (OPENAI_ORG_ID) {
        headers["OpenAI-Organization"] = OPENAI_ORG_ID;
      }

      const response = await fetch(OPENAI_IMAGE_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(imagePayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        console.error('OpenAI Image API error:', { status: response.status, error });
        return new Response(JSON.stringify({ error: `OpenAI Image error: ${response.status}`, details: error }), {
          status: response.status,
          headers: corsHeaders
        });
      }

      const data = await response.json();
      console.log('🖼️ Image API response:', data);
      
      if (!data.data || data.data.length === 0) {
        throw new Error('No image data in OpenAI response');
      }

      const imageUrl = data.data[0].url;
      const revisedPrompt = data.data[0].revised_prompt;

      return new Response(JSON.stringify({
        url: imageUrl,
        revised_prompt: revisedPrompt,
        openai: data
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Otherwise, handle as chat completion request
    const { prompt } = body;
    
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

    const chatHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    };
    
    // Add organization header if available
    if (OPENAI_ORG_ID) {
      chatHeaders["OpenAI-Organization"] = OPENAI_ORG_ID;
    }

    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: chatHeaders,
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

