/*
 * Client-side OpenAI Chat Completions helper
 * Location: src/common/openai/chatClient.ts
 * WARNING: This uses a public Vite env var (VITE_OPENAI_API_KEY) as instructed.
 */

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'developer';
  content: string;
};

export type ChatCompletionParams = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  timeoutMs?: number; // client-side fetch timeout
};

export type ChatCompletionResult = {
  content: string;
  raw: any;
};

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODELS_URL = 'https://api.openai.com/v1/models';

// IMPORTANT: use direct import.meta.env access so Vite can statically replace it
function getViteOpenAIKey(): string | undefined {
  const injected = (import.meta as ImportMeta).env.VITE_OPENAI_API_KEY as string | undefined;
  if (injected) return injected;
  // Dev-only fallback to allow manual testing when env injection fails
  if ((import.meta as ImportMeta).env.DEV) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = globalThis as any;
    const fromWindow = win?.__VITE_OPENAI_API_KEY as string | undefined;
    const fromStorage = globalThis?.localStorage?.getItem?.('VITE_OPENAI_API_KEY') as string | null;
    return fromWindow || fromStorage || undefined;
  }
  return undefined;
}

function getViteOpenAIOrg(): string | undefined {
  return (import.meta as ImportMeta).env.VITE_OPENAI_ORGANIZATION as string | undefined;
}

function getViteOpenAIProject(): string | undefined {
  return (import.meta as ImportMeta).env.VITE_OPENAI_PROJECT_ID as string | undefined;
}

function buildOpenAIHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };
  
  // Add organization header if available
  const org = getViteOpenAIOrg();
  if (org) {
    headers['OpenAI-Organization'] = org;
  }
  
  // Add project header if available
  const project = getViteOpenAIProject();
  if (project) {
    headers['OpenAI-Project'] = project;
  }
  
  return headers;
}

export function isOpenAIKeyPresent(): boolean {
  return Boolean(getViteOpenAIKey());
}

export async function probeOpenAIModels(timeoutMs = 5000): Promise<{ ok: boolean; status?: number; body?: any; error?: string }> {
  const apiKey = getViteOpenAIKey();
  if (!apiKey) return { ok: false, error: 'Missing VITE_OPENAI_API_KEY' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(OPENAI_MODELS_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...(() => {
          const org = getViteOpenAIOrg();
          const project = getViteOpenAIProject();
          const extraHeaders: Record<string, string> = {};
          if (org) extraHeaders['OpenAI-Organization'] = org;
          if (project) extraHeaders['OpenAI-Project'] = project;
          return extraHeaders;
        })(),
      },
      signal: controller.signal,
    });
    let body: any = null;
    try { body = await res.json(); } catch {}
    return { ok: res.ok, status: res.status, body };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  } finally {
    clearTimeout(timer);
  }
}

export async function createChatCompletion({ model, messages, temperature = 0.3, max_tokens, timeoutMs = 30000 }: ChatCompletionParams): Promise<ChatCompletionResult> {
  const apiKey = getViteOpenAIKey();
  if (!apiKey) {
    throw new Error('Missing VITE_OPENAI_API_KEY');
  }

  console.log('🚀 [chatClient] Starting chat completion:', {
    model,
    messageCount: messages?.length || 0,
    temperature,
    max_tokens,
    timeout: timeoutMs
  });

  // Validate messages
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages must be a non-empty array');
  }

  // Validate message format
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg.role || !msg.content) {
      throw new Error(`Invalid message format at index ${i}: missing role or content`);
    }
    if (!['system', 'user', 'assistant', 'developer'].includes(msg.role)) {
      throw new Error(`Invalid role "${msg.role}" at message index ${i}`);
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Models that expect max_completion_tokens instead of max_tokens
    // Fixed regex patterns to properly match model names
    const usesMaxCompletionTokens = model.match(/^(gpt-5|gpt-4\.1|gpt-4-turbo|gpt-4o|gpt-4-1106-preview|gpt-4-0125-preview)(-|_|$)/);
    const body: Record<string, unknown> = {
      model,
      messages,
    };
    
    // Add temperature for most models, but be conservative with newer models
    if (typeof temperature === 'number') {
      // Only exclude temperature for very specific newer models that don't support it
      const restrictedTempModels = model.match(/^gpt-5(-|_|$)/);
      if (!restrictedTempModels) {
        body.temperature = temperature;
      } else {
        console.log('🔍 [chatClient] Skipping temperature for restricted model:', model);
      }
    }
    
    if (typeof max_tokens === 'number') {
      if (usesMaxCompletionTokens) {
        // Newer models expect max_completion_tokens
        body.max_completion_tokens = max_tokens;
        console.log('🔍 [chatClient] Using max_completion_tokens for model:', model);
      } else {
        body.max_tokens = max_tokens;
        console.log('🔍 [chatClient] Using max_tokens for model:', model);
      }
    }

    const res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: buildOpenAIHeaders(apiKey),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    console.log('🔍 [chatClient] Request details:', {
      url: OPENAI_CHAT_URL,
      model: body.model,
      messageCount: Array.isArray(body.messages) ? body.messages.length : 0,
      temperature: body.temperature,
      maxTokens: body.max_tokens || body.max_completion_tokens,
      maxTokensParam: body.max_tokens ? 'max_tokens' : 'max_completion_tokens',
      headers: Object.keys(buildOpenAIHeaders(apiKey)),
      bodySize: JSON.stringify(body).length,
      requestBody: JSON.stringify(body, null, 2)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const requestId = res.headers.get('x-request-id');
      
      console.error('❌ [chatClient] OpenAI API Error:', {
        status: res.status,
        statusText: res.statusText,
        requestId,
        model: body.model,
        requestBody: JSON.stringify(body, null, 2),
        responseText: text,
        headers: Object.fromEntries([...res.headers.entries()])
      });
      
      // Try to parse error response for better debugging
      let errorDetails = text;
      try {
        const errorData = JSON.parse(text);
        if (errorData?.error?.message) {
          errorDetails = `${errorData.error.message} (type: ${errorData.error.type || 'unknown'})`;
          if (errorData.error.param) {
            errorDetails += ` - Invalid parameter: ${errorData.error.param}`;
          }
        }
      } catch (parseError) {
        // Keep original text if parsing fails
      }
      
      throw new Error(`OpenAI chat error ${res.status}: ${errorDetails}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    if (!content) {
      throw new Error('No content in OpenAI chat response');
    }
    return { content, raw: data };
  } finally {
    clearTimeout(timer);
  }
}
