/**
 * Studio Writer Agent
 * Streams key ideas first, then generates the video script
 * Similar to SearchWriterAgent but optimized for video content
 */

import { logger } from '../../../utils/logger';

// Callback type for streaming content chunks
export type StreamingCallback = (chunk: string, isComplete: boolean) => void;

export interface StudioWriterInput {
  query: string;
  onKeyIdeasChunk?: StreamingCallback;
  onScriptChunk?: StreamingCallback;
  onDescriptionChunk?: StreamingCallback;
}

export interface StudioWriterOutput {
  success: boolean;
  keyIdeas: string;
  script: string;
  description?: string;
  error?: string;
}

export class StudioWriterAgent {
  private defaultModel = 'gpt-4o-mini';

  /**
   * Execute with streaming support
   * Streams key ideas first, then generates script and description
   */
  async executeWithStreaming(input: StudioWriterInput): Promise<StudioWriterOutput> {
    const { query, onKeyIdeasChunk, onScriptChunk, onDescriptionChunk } = input;

    try {
      logger.info('[Studio Writer] Starting content generation', { query });

      // Step 1: Stream key ideas (only if callback provided)
      let keyIdeas = '';
      if (onKeyIdeasChunk) {
        try {
          keyIdeas = await this.generateKeyIdeas(query, onKeyIdeasChunk);
          logger.info('[Studio Writer] Key ideas generated', { length: keyIdeas.length });
        } catch (error) {
          logger.error('[Studio Writer] Key ideas failed', { error });
          throw new Error('Failed to generate key ideas. Please try again.');
        }
      }

      // Small delay between API calls to avoid rate limiting
      if (onKeyIdeasChunk && onScriptChunk) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Step 2: Generate script (can also stream if needed)
      let script = '';
      if (onScriptChunk) {
        try {
          script = await this.generateScript(query, keyIdeas, onScriptChunk);
          logger.info('[Studio Writer] Script generated', { length: script.length });
        } catch (error) {
          logger.error('[Studio Writer] Script failed', { error });
          throw new Error('Failed to generate script. Please try again.');
        }
      }

      // Step 3: Generate short description for video (YouTube-style)
      let description = '';
      if (keyIdeas) {
        try {
          description = await this.generateDescription(query, keyIdeas, onDescriptionChunk);
          logger.info('[Studio Writer] Description generated', { length: description.length });
        } catch (error) {
          logger.error('[Studio Writer] Description failed', { error });
          // Non-fatal, continue without description
        }
      }

      return {
        success: true,
        keyIdeas,
        script,
        description,
      };
    } catch (error) {
      logger.error('[Studio Writer] Generation failed', { error });
      return {
        success: false,
        keyIdeas: '',
        script: '',
        description: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate short, plain video description (YouTube-style)
   */
  private async generateDescription(
    query: string,
    keyIdeas: string,
    onChunk?: StreamingCallback
  ): Promise<string> {
    const messages = [
      {
        role: 'system',
        content: `You are creating a short description for a video.

Question: "${query}"

Key Ideas:
${keyIdeas}

Generate a plain text description (2-3 sentences) that:
- Summarizes what the video is about
- Uses simple, conversational language
- Includes the main insights
- NO conclusion or call-to-action
- Just factual overview

Generate the description now:`
      }
    ];

    // Use streaming for real-time display
    if (onChunk) {
      return await this.callOpenAIStreaming(messages, this.defaultModel, onChunk);
    } else {
      return await this.callOpenAI(messages, this.defaultModel);
    }
  }

  /**
   * Generate key ideas with streaming
   */
  private async generateKeyIdeas(
    query: string,
    onChunk?: StreamingCallback
  ): Promise<string> {
    const messages = [
      {
        role: 'system',
        content: `You are a curiosity-driven content creator for short-form videos.
        
Your task: Extract 3-5 KEY IDEAS from the question that will become bullet points.

Rules:
- Each idea should be ONE clear, concise statement
- Use simple, conversational language
- Focus on surprising or interesting aspects
- Each bullet should stand alone
- No more than 12-15 words per bullet
- Format as a bulleted list using "• " prefix

Question: "${query}"

Generate the key ideas now:`
      }
    ];

    if (onChunk) {
      return await this.callOpenAIStreaming(messages, this.defaultModel, onChunk);
    } else {
      return await this.callOpenAI(messages, this.defaultModel);
    }
  }

  /**
   * Generate video script with YouTube-style timestamps and chapter titles
   * Always uses streaming to avoid JSON format issues
   */
  private async generateScript(
    query: string,
    keyIdeas: string,
    onChunk?: StreamingCallback
  ): Promise<string> {
    const messages = [
      {
        role: 'system',
        content: `You are creating a script for a 30-second vertical video (TikTok/Reels/Shorts).

Question: "${query}"

Key Ideas:
${keyIdeas}

Generate a video script with YouTube-style chapter structure. Each chapter should have:
1. A chapter title (bold, standalone line)
2. Timestamps with descriptions below it

Format like this:

**Opening Hook**
00:00 - Attention-grabbing opening statement

**Main Content**
00:05 - First key point explained
00:10 - Second key point with example
00:15 - Third key point with detail

**Supporting Details**
00:20 - Additional insight or context
00:25 - Final supporting point

**Conclusion**
00:28 - Memorable closing takeaway

Rules:
- Use 3-5 chapter titles (bold with **)
- Each chapter has 1-3 timestamps
- Format: MM:SS - Description (8-10 words max)
- Total: 5-8 timestamps spanning 0:00 to 0:30
- Chapter titles should be descriptive (2-4 words)
- Keep descriptions concise and engaging
- Start with hook, end with conclusion

Generate the chaptered script now:`
      }
    ];

    // Always use streaming to avoid JSON format issues
    return await this.callOpenAIStreaming(messages, this.defaultModel, onChunk || (() => {}));
  }

  /**
   * Call OpenAI with streaming (with retry on 500 errors)
   */
  private async callOpenAIStreaming(
    messages: Array<{ role: string; content: string }>,
    model: string,
    onChunk: StreamingCallback,
    retryCount: number = 0
  ): Promise<string> {
    const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseEdgeUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    const payload = {
      prompt: JSON.stringify({
        messages,
        model,
        temperature: 0.7,
        max_output_tokens: 800
      }),
      stream: true
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      logger.debug('[Studio Writer] Sending streaming request', {
        model,
        messageCount: messages.length,
        url: supabaseEdgeUrl,
        retry: retryCount
      });

      const response = await fetch(supabaseEdgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[Studio Writer] Streaming API error', {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 500),
          retry: retryCount
        });

        // Retry on 500 errors (server issues) up to 2 times
        if (response.status === 500 && retryCount < 2) {
          logger.info('[Studio Writer] Retrying after 500 error', { retryCount: retryCount + 1 });
          await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
          return this.callOpenAIStreaming(messages, model, onChunk, retryCount + 1);
        }

        throw new Error(`API error ${response.status}: ${errorText.substring(0, 200)}`);
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              onChunk('', true);
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.content || '';
              if (content) {
                fullContent += content;
                onChunk(content, false);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      logger.info('[Studio Writer] Streaming completed', { contentLength: fullContent.length });
      return fullContent;

    } catch (error) {
      clearTimeout(timeoutId);
      logger.error('[Studio Writer] Streaming failed', { error });
      throw error;
    }
  }

  /**
   * Call OpenAI without streaming (fallback)
   * Note: We don't use response_format JSON for text content
   */
  private async callOpenAI(
    messages: Array<{ role: string; content: string }>,
    model: string
  ): Promise<string> {
    const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseEdgeUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    // Prepare payload WITHOUT response_format (we want plain text/markdown, not JSON)
    const payload = {
      prompt: JSON.stringify({
        messages,
        model,
        temperature: 0.7,
        max_output_tokens: 800
        // NO response_format - plain text is default
      }),
      stream: false
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(supabaseEdgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[Studio Writer] API error', { status: response.status, error: errorText.substring(0, 200) });
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // The edge function returns { text: content }
      return data.text || data.content || '';
      
    } catch (error) {
      clearTimeout(timeoutId);
      logger.error('[Studio Writer] Non-streaming call failed', { error });
      throw error;
    }
  }
}
