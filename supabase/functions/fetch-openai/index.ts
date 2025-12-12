// Simplified Supabase Edge Function for OpenAI API calls
// Supports both streaming and non-streaming modes for chat completions
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const streamingCorsHeaders = {
  ...corsHeaders,
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  "Connection": "keep-alive"
};

// @ts-ignore
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
// @ts-ignore
const OPENAI_ORG_ID = Deno.env.get("OPENAI_ORG_ID");
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";
const DEFAULT_MODEL = "gpt-4.1-mini-2025-04-14";
const TIMEOUT_MS = 28000; // 28 seconds (leave buffer for edge function)
const STREAMING_TIMEOUT_MS = 60000; // 60 seconds for streaming (longer to allow full response)
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
    const { prompt, stream: enableStreaming } = body;
    
    // Parse prompt
    let parsedPrompt;
    try {
      parsedPrompt = typeof prompt === 'string' ? JSON.parse(prompt) : prompt;
    } catch {
      parsedPrompt = { messages: [{ role: 'user', content: prompt }] };
    }

    // Build OpenAI payload - add stream option if requested
    const payload: Record<string, any> = {
      model: parsedPrompt.model || DEFAULT_MODEL,
      messages: parsedPrompt.messages || [{ role: "user", content: String(prompt) }],
      temperature: parsedPrompt.temperature || 0.7,
      max_tokens: parsedPrompt.max_output_tokens || 2000, // Increased for longer essays (~1500 words max)
    };
    
    // Only add response_format for non-streaming requests (JSON mode not compatible with streaming)
    // For streaming, we'll handle the response as plain text and parse later
    if (!enableStreaming) {
      payload.response_format = parsedPrompt.response_format || { type: 'json_object' };
    }
    
    // Enable streaming if requested
    if (enableStreaming) {
      payload.stream = true;
      console.log('🔄 Streaming mode enabled');
    }

    // Call OpenAI with timeout (longer timeout for streaming)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), enableStreaming ? STREAMING_TIMEOUT_MS : TIMEOUT_MS);

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
      console.error('OpenAI API error:', { status: response.status, error, payload });
      return new Response(JSON.stringify({ 
        error: `OpenAI error: ${response.status}`,
        details: error,
        payload_info: {
          model: payload.model,
          max_tokens: payload.max_tokens,
          messages_count: payload.messages.length
        }
      }), {
        status: response.status,
        headers: corsHeaders
      });
    }

    // Handle streaming response
    if (enableStreaming && response.body) {
      console.log('🔄 Starting to stream response');
      
      // Create a TransformStream to process SSE data and forward it
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          const text = decoder.decode(chunk);
          const lines = text.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                // Send done signal
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                continue;
              }
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  // Forward the content chunk as SSE
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      });
      
      // Pipe the OpenAI response through our transform
      const readableStream = response.body.pipeThrough(transformStream);
      
      return new Response(readableStream, {
        headers: streamingCorsHeaders
      });
    }

    // Non-streaming response (original behavior)
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
