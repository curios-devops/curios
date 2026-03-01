// searchWriterAgent.ts
// Simplified following Swarm architecture: lightweight, stateless, minimal abstractions
// Regular search flow: Research data → OpenAI (via Supabase Edge Function) → Article
// Supports both streaming and non-streaming modes for optimal latency

import { AgentResponse, ResearchResult, ArticleResult } from '../../../../commonApp/types/index';
import { logger } from '../../../../utils/logger.ts';

// Callback type for streaming content chunks
export type StreamingCallback = (chunk: string, isComplete: boolean) => void;

export class SearchWriterAgent {
  private readonly defaultModel: string = 'gpt-4.1-mini-2025-04-14'; // GPT-4.1 mini model
  private readonly imageSearchModel: string = 'gpt-4.1-mini-2025-04-14'; // Same model for reverse image searches

  constructor() {
    logger.info('SearchWriterAgent: Initialized');
  }

  /**
   * Provides fallback article data if generation fails
   */
  private getFallbackData(query: string): ArticleResult {
    return {
      content: 'We apologize, but we are experiencing high traffic at the moment. Please try your search again in a few minutes.',
      followUpQuestions: [
        `What specific information would be most valuable about ${query}?`,
        `How can I explore different aspects of ${query}?`,
        `What current developments should I know about ${query}?`,
        `Where can I find expert insights on ${query}?`,
        `What practical applications relate to ${query}?`
      ],
      citations: []
    };
  }

  /**
   * Calls OpenAI API via Supabase Edge Function (simplified)
   */
  private async callOpenAI(
    messages: Array<{ role: string; content: string }>,
    model: string = this.defaultModel
  ): Promise<ArticleResult> {
    // Get environment variables
    const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseEdgeUrl) {
      throw new Error('Supabase Edge Function URL not configured');
    }
    if (!supabaseAnonKey) {
      throw new Error('Supabase anon key not found');
    }

    logger.debug('Calling OpenAI via Supabase', { model, messageCount: messages.length });

    // Prepare payload
    const payload = {
      prompt: JSON.stringify({
        messages,
        model,
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_output_tokens: 1200
      })
    };

    // Simple timeout with AbortController
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
        logger.error('OpenAI API error', { status: response.status, error: errorText.substring(0, 200) });
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.text) {
        throw new Error('No content in response');
      }

      // Parse response
      let articleResult: ArticleResult;
      if (typeof data.text === 'object') {
        articleResult = data.text;
      } else if (typeof data.text === 'string') {
        const cleanText = data.text.trim().replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '');
        articleResult = JSON.parse(cleanText);
      } else {
        throw new Error('Unexpected response format');
      }

      // Validate
      if (!articleResult?.content || !Array.isArray(articleResult.followUpQuestions)) {
        throw new Error('Invalid article format');
      }

      logger.debug('Article generated successfully', { contentLength: articleResult.content.length });
      return articleResult;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          logger.error('Request timeout after 30s');
          throw new Error('Request timeout - please try again');
        }
        logger.error('OpenAI call failed', { error: error.message });
      }
      throw error;
    }
  }

  /**
   * Calls OpenAI API with streaming via Supabase Edge Function
   * Returns content progressively through callback
   */
  private async callOpenAIStreaming(
    messages: Array<{ role: string; content: string }>,
    model: string = this.defaultModel,
    onChunk: StreamingCallback
  ): Promise<string> {
    const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseEdgeUrl) {
      throw new Error('Supabase Edge Function URL not configured');
    }
    if (!supabaseAnonKey) {
      throw new Error('Supabase anon key not found');
    }

    console.log('🔄 [WRITER STREAMING] Starting streaming call to OpenAI', { model, messageCount: messages.length });
    logger.debug('Calling OpenAI via Supabase (streaming)', { model, messageCount: messages.length });

    // Prepare payload with streaming enabled
    const payload = {
      prompt: JSON.stringify({
        messages,
        model,
        temperature: 0.7,
        max_output_tokens: 1200
      }),
      stream: true
    };

    console.log('🔄 [WRITER STREAMING] Payload prepared with stream: true');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for streaming

    try {
      console.log('🔄 [WRITER STREAMING] Fetching from edge function...');
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

      console.log('🔄 [WRITER STREAMING] Response received:', {
        status: response.status,
        contentType: response.headers.get('content-type'),
        hasBody: !!response.body
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Handle 429 rate limit error with friendly message
        if (response.status === 429) {
          console.log('🚫 [WRITER STREAMING] Detected 429 rate limit, throwing RATE_LIMIT_EXCEEDED');
          logger.error('OpenAI API rate limit exceeded (429)', { status: 429 });
          throw new Error('RATE_LIMIT_EXCEEDED');
        }

        logger.error('OpenAI streaming API error', { status: response.status, error: errorText.substring(0, 200) });
        throw new Error(`API error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      // Process the SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';
      let chunkCount = 0;

      console.log('🔄 [WRITER STREAMING] Starting to read stream...');

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('🔄 [WRITER STREAMING] Stream done, total chunks:', chunkCount);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              console.log('🔄 [WRITER STREAMING] Received [DONE] signal');
              onChunk('', true);
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.content || '';
              if (content) {
                chunkCount++;
                fullContent += content;
                onChunk(content, false);
                
                // Log first few chunks for debugging
                if (chunkCount <= 3) {
                  console.log(`🔄 [WRITER STREAMING] Chunk ${chunkCount}:`, content.substring(0, 50));
                }
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      console.log('✅ [WRITER STREAMING] Streaming completed', { 
        contentLength: fullContent.length,
        totalChunks: chunkCount 
      });
      logger.debug('Streaming completed', { contentLength: fullContent.length });
      return fullContent;

    } catch (error) {
      clearTimeout(timeoutId);

      console.log('❌ [WRITER STREAMING] Caught error in callOpenAIStreaming catch block:', error);

      if (error instanceof Error) {
        console.log('❌ [WRITER STREAMING] Error message:', error.message);

        if (error.name === 'AbortError') {
          logger.error('Streaming request timeout after 60s');
          throw new Error('Request timeout - please try again');
        }
        logger.error('OpenAI streaming call failed', { error: error.message });
        console.log('❌ [WRITER STREAMING] Re-throwing error:', error.message);
      } else {
        console.log('❌ [WRITER STREAMING] Error is not an Error instance:', typeof error);
      }
      throw error;
    }
  }

  /**
   * Builds the system and user prompts for article generation
   */
  private buildPrompts(query: string, researchResult: ResearchResult): {
    systemPrompt: string;
    userPrompt: string;
  } {
    const systemPrompt = `You are an expert research writer creating comprehensive, well-structured articles.

Your task: Write an article based on the provided search results.

Response format: JSON with this exact structure:
{
  "content": "Your comprehensive article in markdown format...",
  "followUpQuestions": ["Question 1?", "Question 2?", ...],
  "citations": []
}

Guidelines for the article:
- Start directly with the main content (no title, no "# Query" header)
- Use natural, flowing prose
- Structure with relevant section headings (##)
- Include specific facts, data, and details from the sources
- Use inline citations with the source website name like [wikipedia], [nytimes], [bbc], etc. to reference sources
- If multiple sources from the same site, use [sitename +N] format like [wikipedia +2] for 3 wikipedia sources
- Make it comprehensive but well-organized
- Use markdown formatting for readability
- DO NOT include a "References", "Sources", or "Bibliography" section at the end - we display sources separately

Guidelines for followUpQuestions:
- Provide 5 related questions that naturally extend the topic
- Make them specific and actionable
- Focus on practical applications or deeper understanding

Leave citations array empty (we handle it separately).

CRITICAL: You must base your content strictly on the provided sources. Do not invent information.
CRITICAL: Do NOT add any References, Sources, or Bibliography section - these are displayed separately in the UI.`;

    // Extract clean site name from URL
    const extractSiteName = (url: string): string => {
      try {
        const hostname = new URL(url).hostname;
        return hostname
          .replace(/^www\./, '')
          .replace(/\.(com|org|net|io|co|gov|edu|info|biz)(\.[a-z]{2})?$/, '')
          .split('.')[0];
      } catch {
        return 'source';
      }
    };

    const sourcesText = researchResult.results
      .map((source: any) => {
        const siteName = extractSiteName(source.url);
        return `[${siteName}] ${source.title}\nURL: ${source.url}\nContent: ${source.content || 'No content available'}`;
      })
      .join('\n\n');

    const userPrompt = `Query: "${query}"

Search Results:
${sourcesText}

Based on these search results, write a comprehensive article addressing the query. Use inline citations with the website name like [wikipedia], [nytimes], etc.`;

    return { systemPrompt, userPrompt };
  }

  /**
   * Builds the streaming-optimized prompt that returns content directly (not JSON)
   */
  private buildStreamingPrompts(query: string, researchResult: ResearchResult): {
    systemPrompt: string;
    userPrompt: string;
  } {
    const systemPrompt = `You are an expert research writer creating comprehensive, well-structured articles.

Your task: Write an article based on the provided search results.

Guidelines for the article:
- Start directly with the main content (no title, no "# Query" header)
- Use natural, flowing prose
- Structure with relevant section headings (##)
- Include specific facts, data, and details from the sources
- Use inline citations with the source website name like [wikipedia], [nytimes], [bbc], etc.
- If multiple sources from the same site, use [sitename +N] format like [wikipedia +2] for 3 wikipedia sources
- Make it comprehensive but well-organized
- Use markdown formatting for readability
- DO NOT include a "References", "Sources", or "Bibliography" section - sources are displayed separately

CRITICAL: You must base your content strictly on the provided sources. Do not invent information.
CRITICAL: Do NOT add any References, Sources, or Bibliography section at the end.
Write the article content directly - do not wrap in JSON or any other format.`;

    // Extract clean site name from URL
    const extractSiteName = (url: string): string => {
      try {
        const hostname = new URL(url).hostname;
        return hostname
          .replace(/^www\./, '')
          .replace(/\.(com|org|net|io|co|gov|edu|info|biz)(\.[a-z]{2})?$/, '')
          .split('.')[0];
      } catch {
        return 'source';
      }
    };

    const sourcesText = researchResult.results
      .map((source: any) => {
        const siteName = extractSiteName(source.url);
        return `[${siteName}] ${source.title}\nURL: ${source.url}\nContent: ${source.content || 'No content available'}`;
      })
      .join('\n\n');

    const userPrompt = `Query: "${query}"

Search Results:
${sourcesText}

Based on these search results, write a comprehensive article addressing the query. Use inline citations with the website name like [wikipedia], [nytimes], etc. Do NOT include a References or Sources section at the end.`;

    return { systemPrompt, userPrompt };
  }

  /**
   * Generates default follow-up questions based on the query
   */
  private generateFollowUpQuestions(query: string): string[] {
    return [
      `What are the latest developments related to ${query}?`,
      `How does ${query} compare to alternatives?`,
      `What are the practical applications of ${query}?`,
      `What are experts saying about ${query}?`,
      `What should I know before getting started with ${query}?`
    ];
  }

  /**
   * Transforms research data into an article with streaming support
   * Content is streamed progressively through the onContentChunk callback
   */
  async executeWithStreaming(params: {
    query: string;
    researchResult: ResearchResult;
    model?: string;
    isImageSearch?: boolean;
    onContentChunk: StreamingCallback;
  }): Promise<AgentResponse<ArticleResult>> {
    const { query, researchResult, model, isImageSearch, onContentChunk } = params;
    const modelToUse = model || (isImageSearch ? this.imageSearchModel : this.defaultModel);

    console.log('🔄 [WRITER] executeWithStreaming called', {
      query: query.substring(0, 50),
      sourceCount: researchResult.results.length,
      hasCallback: !!onContentChunk
    });

    try {
      logger.info('SearchWriterAgent: Starting streaming execution', {
        query,
        sourceCount: researchResult.results.length,
        isImageSearch: !!isImageSearch,
        model: modelToUse
      });

      const { systemPrompt, userPrompt } = this.buildStreamingPrompts(query, researchResult);
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      console.log('🔄 [WRITER] Calling callOpenAIStreaming...');
      logger.debug('Calling OpenAI to generate article (streaming)', {
        promptLength: systemPrompt.length + userPrompt.length,
        sourceCount: researchResult.results.length
      });

      // Call OpenAI with streaming
      const fullContent = await this.callOpenAIStreaming(messages, modelToUse, onContentChunk);

      console.log('✅ [WRITER] Streaming complete, content length:', fullContent.length);
      logger.info('SearchWriterAgent: Successfully generated article (streaming)', {
        contentLength: fullContent.length
      });

      // Build the final article result
      const articleResult: ArticleResult = {
        content: fullContent,
        followUpQuestions: this.generateFollowUpQuestions(query),
        citations: []
      };

      return {
        success: true,
        data: articleResult
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      console.log('❌ [WRITER] Caught error in executeWithStreaming:', errorMessage);

      logger.error('SearchWriterAgent: Streaming execution failed', {
        query,
        error: errorMessage
      });

      // Re-throw rate limit errors so they can be handled by UI with redirect
      if (errorMessage === 'RATE_LIMIT_EXCEEDED') {
        console.log('🚫 [WRITER] Re-throwing RATE_LIMIT_EXCEEDED to propagate to UI');
        throw error;
      }

      // Return fallback data for other errors
      return {
        success: false,
        error: errorMessage,
        data: this.getFallbackData(query)
      };
    }
  }

  /**
   * Transforms research data into an article
   */
  async execute(params: {
    query: string;
    researchResult: ResearchResult;
    model?: string;
    isImageSearch?: boolean;
  }): Promise<AgentResponse<ArticleResult>> {
    const { query, researchResult, model, isImageSearch } = params;
    const modelToUse = model || (isImageSearch ? this.imageSearchModel : this.defaultModel);

    try {
      logger.info('SearchWriterAgent: Starting execution', {
        query,
        sourceCount: researchResult.results.length,
        isImageSearch: !!isImageSearch,
        model: modelToUse
      });

      // Build prompts using shared method
      const { systemPrompt, userPrompt } = this.buildPrompts(query, researchResult);
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      logger.debug('Calling OpenAI to generate article', {
        promptLength: systemPrompt.length + userPrompt.length,
        sourceCount: researchResult.results.length
      });

      // Call OpenAI
      const articleResult = await this.callOpenAI(messages, modelToUse);

      logger.info('SearchWriterAgent: Successfully generated article', {
        contentLength: articleResult.content.length,
        followUpQuestionsCount: articleResult.followUpQuestions.length
      });

      return {
        success: true,
        data: articleResult
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      logger.error('SearchWriterAgent: Execution failed', {
        query,
        error: errorMessage
      });

      // Return fallback data
      return {
        success: false,
        error: errorMessage,
        data: this.getFallbackData(query)
      };
    }
  }
}
