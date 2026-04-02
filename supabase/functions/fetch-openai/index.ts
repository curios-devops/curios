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
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";
const DEFAULT_MODEL = "gpt-4.1-mini-2025-04-14";
const TIMEOUT_MS = 28000; // 28 seconds (leave buffer for edge function)
const STREAMING_TIMEOUT_MS = 60000; // 60 seconds for streaming (longer to allow full response)

function isGpt5Model(model: string): boolean {
  return /^gpt-5(?:-|_|$)/i.test(model);
}

function normalizeResponsesInput(messages: Array<{ role?: string; content?: unknown }>): Array<{ role: string; content: string }> {
  return messages.map((message) => {
    const role = typeof message?.role === 'string' ? message.role : 'user';
    const rawContent = message?.content;

    if (typeof rawContent === 'string') {
      return { role, content: rawContent };
    }

    if (Array.isArray(rawContent)) {
      const joined = rawContent
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'text' in item) {
            const textValue = (item as { text?: unknown }).text;
            return typeof textValue === 'string' ? textValue : '';
          }
          return '';
        })
        .filter(Boolean)
        .join('\n');
      return { role, content: joined };
    }

    return { role, content: String(rawContent ?? '') };
  });
}

function extractResponsesSSEContent(event: Record<string, unknown>): string {
  if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
    return event.delta;
  }

  if (event.type === 'response.delta' && event.delta && typeof event.delta === 'object') {
    const deltaObj = event.delta as { text?: unknown; output_text?: unknown };
    if (typeof deltaObj.text === 'string') return deltaObj.text;
    if (typeof deltaObj.output_text === 'string') return deltaObj.output_text;
  }

  return '';
}

function extractResponsesOutputText(data: Record<string, unknown>): string {
  if (typeof data.output_text === 'string' && data.output_text.length > 0) {
    return data.output_text;
  }

  if (Array.isArray(data.output_text)) {
    const combined = data.output_text
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const text = (item as { text?: unknown }).text;
          return typeof text === 'string' ? text : '';
        }
        return '';
      })
      .filter(Boolean)
      .join('');

    if (combined.length > 0) {
      return combined;
    }
  }

  const output = data.output;
  if (!Array.isArray(output)) {
    return '';
  }

  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;

    const directText = (item as { text?: unknown; output_text?: unknown }).text;
    if (typeof directText === 'string' && directText.length > 0) {
      parts.push(directText);
    }

    const directOutputText = (item as { output_text?: unknown }).output_text;
    if (typeof directOutputText === 'string' && directOutputText.length > 0) {
      parts.push(directOutputText);
    }

    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      const text = (block as { text?: unknown; output_text?: unknown }).text;
      if (typeof text === 'string' && text.length > 0) {
        parts.push(text);
      }

      const blockOutputText = (block as { output_text?: unknown }).output_text;
      if (typeof blockOutputText === 'string' && blockOutputText.length > 0) {
        parts.push(blockOutputText);
      }
    }
  }

  if (parts.length > 0) {
    return parts.join('');
  }

  const fallbackCandidates: string[] = [];
  const collectTextValues = (value: unknown): void => {
    if (!value) return;
    if (typeof value === 'string') {
      if (value.trim().length > 0) fallbackCandidates.push(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) collectTextValues(item);
      return;
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (typeof obj.text === 'string' && obj.text.trim().length > 0) fallbackCandidates.push(obj.text);
      if (typeof obj.output_text === 'string' && obj.output_text.trim().length > 0) fallbackCandidates.push(obj.output_text);
      if (obj.text && typeof obj.text === 'object') {
        const nestedTextValue = (obj.text as Record<string, unknown>).value;
        if (typeof nestedTextValue === 'string' && nestedTextValue.trim().length > 0) {
          fallbackCandidates.push(nestedTextValue);
        }
      }
      if (typeof obj.value === 'string' && obj.value.trim().length > 0) fallbackCandidates.push(obj.value);
      if (obj.content !== undefined) collectTextValues(obj.content);
      if (obj.output !== undefined) collectTextValues(obj.output);
    }
  };

  collectTextValues(data);
  return fallbackCandidates.join('');
}

function shouldRetryForIncompleteMaxTokens(
  useResponsesApi: boolean,
  data: Record<string, unknown>,
): boolean {
  if (!useResponsesApi) return false;

  const status = data.status;
  if (status !== 'incomplete') return false;

  const incompleteDetails = data.incomplete_details;
  if (!incompleteDetails || typeof incompleteDetails !== 'object') return false;

  const reason = (incompleteDetails as { reason?: unknown }).reason;
  return reason === 'max_output_tokens';
}

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
      // Build gpt-image-1 payload
      const imagePayload = {
        model: body.model || "gpt-image-1",
        prompt: body.prompt,
        size: body.size || "1024x1536",
        quality: body.quality || "low",
        n: body.n || 1
      };

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

    // Check if this is a TTS request
    if (body.tts) {
      // Parse TTS parameters from prompt
      let ttsParams;
      try {
        ttsParams = typeof body.prompt === 'string' ? JSON.parse(body.prompt) : body.prompt;
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid TTS parameters' }), {
          status: 400,
          headers: corsHeaders
        });
      }

      const ttsPayload = {
        model: ttsParams.model || 'tts-1',
        input: ttsParams.input,
        voice: ttsParams.voice || 'alloy',
        response_format: ttsParams.response_format || 'mp3'
      };

      // Call OpenAI TTS API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      };
      
      if (OPENAI_ORG_ID) {
        headers["OpenAI-Organization"] = OPENAI_ORG_ID;
      }

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: "POST",
        headers,
        body: JSON.stringify(ttsPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        console.error('OpenAI TTS API error:', { status: response.status, error });
        return new Response(JSON.stringify({ error: `OpenAI TTS error: ${response.status}`, details: error }), {
          status: response.status,
          headers: corsHeaders
        });
      }

      // Return audio blob directly
      const audioBlob = await response.blob();
      return new Response(audioBlob, {
        headers: {
          ...corsHeaders,
          "Content-Type": "audio/mpeg"
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
    const model = parsedPrompt.model || DEFAULT_MODEL;
    const gpt5 = isGpt5Model(model);
    const useResponsesApi = gpt5;

    const payload: Record<string, any> = {
      model,
    };

    const normalizedMessages = parsedPrompt.messages || [{ role: "user", content: String(prompt) }];

    if (useResponsesApi) {
      payload.input = normalizeResponsesInput(normalizedMessages);
    } else {
      payload.messages = normalizedMessages;
    }

    // GPT-5 family on Responses API uses max_output_tokens.
    if (gpt5 && useResponsesApi) {
      payload.max_output_tokens = parsedPrompt.max_output_tokens || 2000;
      payload.reasoning = parsedPrompt.reasoning || { effort: 'low' };
    } else if (gpt5) {
      payload.max_completion_tokens = parsedPrompt.max_output_tokens || 2000;
    } else {
      payload.temperature = parsedPrompt.temperature || 0.7;
      payload.max_tokens = parsedPrompt.max_output_tokens || 2000;
    }
    
    // Only add response_format for non-streaming requests (JSON mode not compatible with streaming)
    // For streaming, we'll handle the response as plain text and parse later
      if (!enableStreaming && !useResponsesApi) {
        // Only add response_format if explicitly requested in the prompt
        if (parsedPrompt.response_format) {
          payload.response_format = parsedPrompt.response_format;
        }
    }
    
    // Enable streaming if requested
    if (enableStreaming) {
      payload.stream = true;
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

    const targetUrl = useResponsesApi ? OPENAI_RESPONSES_URL : OPENAI_CHAT_URL;

    const response = await fetch(targetUrl, {
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
          endpoint: useResponsesApi ? 'responses' : 'chat.completions',
          model: payload.model,
          max_tokens: payload.max_tokens,
          max_completion_tokens: payload.max_completion_tokens,
          max_output_tokens: payload.max_output_tokens,
          messages_count: payload.messages?.length,
          input_count: payload.input?.length,
        }
      }), {
        status: response.status,
        headers: corsHeaders
      });
    }

    // Handle streaming response
    if (enableStreaming && response.body) {
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
                const content = useResponsesApi
                  ? extractResponsesSSEContent(parsed)
                  : (parsed.choices?.[0]?.delta?.content || '');
                if (content) {
                  // Forward the content chunk as SSE
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }

                if (useResponsesApi && parsed.type === 'response.completed') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
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

    // Non-streaming response
    let data = await response.json();
    let content = useResponsesApi
      ? extractResponsesOutputText(data as Record<string, unknown>)
      : data.choices?.[0]?.message?.content;

  if (shouldRetryForIncompleteMaxTokens(useResponsesApi, data as Record<string, unknown>)) {
      const originalContent = String(content || '');
      const runRetry = async (previousMaxOutputTokens: number, label: 'first' | 'second') => {
        const retryMaxOutputTokens = Math.max(previousMaxOutputTokens * 2, 160);
        const retryPayload = {
          ...payload,
          max_output_tokens: retryMaxOutputTokens,
          reasoning: { effort: 'low' },
        };

        console.warn(`Retrying Responses request (${label}) after incomplete max_output_tokens`, {
          model,
          previous_max_output_tokens: previousMaxOutputTokens,
          retry_max_output_tokens: retryMaxOutputTokens,
        });

        const retryResponse = await fetch(targetUrl, {
          method: "POST",
          headers: chatHeaders,
          body: JSON.stringify(retryPayload),
          signal: controller.signal
        });

        if (!retryResponse.ok) {
          const retryError = await retryResponse.text();
          console.error('OpenAI retry error:', { status: retryResponse.status, retryError, label });
          return new Response(JSON.stringify({
            error: `OpenAI retry error: ${retryResponse.status}`,
            details: retryError,
            retry: label,
          }), {
            status: retryResponse.status,
            headers: corsHeaders,
          });
        }

        const retryData = await retryResponse.json();
        const retryContent = extractResponsesOutputText(retryData as Record<string, unknown>);
        return { retryData, retryContent, retryMaxOutputTokens };
      };

      const initialMaxOutputTokens = Number(payload.max_output_tokens || 0);
      const firstRetryResult = await runRetry(initialMaxOutputTokens, 'first');
      if (firstRetryResult instanceof Response) return firstRetryResult;

      data = firstRetryResult.retryData;
      content = firstRetryResult.retryContent || originalContent;

      if (shouldRetryForIncompleteMaxTokens(useResponsesApi, data as Record<string, unknown>)) {
        const secondRetryResult = await runRetry(firstRetryResult.retryMaxOutputTokens, 'second');
        if (secondRetryResult instanceof Response) return secondRetryResult;

        data = secondRetryResult.retryData;
        const secondContent = secondRetryResult.retryContent;
        content = secondContent && secondContent.trim().length > 0 ? secondContent : content;
      }
    }
    
    if (!content) {
      const diagnosticInfo = useResponsesApi
        ? {
            endpoint: 'responses',
            has_output_text: Object.prototype.hasOwnProperty.call(data, 'output_text'),
            output_text_type: Array.isArray((data as Record<string, unknown>).output_text)
              ? 'array'
              : typeof (data as Record<string, unknown>).output_text,
            output_type: Array.isArray((data as Record<string, unknown>).output)
              ? 'array'
              : typeof (data as Record<string, unknown>).output,
            output_length: Array.isArray((data as Record<string, unknown>).output)
              ? ((data as Record<string, unknown>).output as unknown[]).length
              : null,
          }
        : { endpoint: 'chat.completions' };

      console.error('No content extracted from OpenAI response', diagnosticInfo);

      return new Response(JSON.stringify({
        error: 'No content in OpenAI response',
        diagnostic: diagnosticInfo,
        openai: data,
      }), {
        status: 502,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
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
