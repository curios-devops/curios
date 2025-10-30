// searchWriterAgent.ts
// Simplified following Swarm architecture: lightweight, stateless, minimal abstractions
// Regular search flow: Research data → OpenAI (via Supabase Edge Function) → Article

import { AgentResponse, ResearchResult, ArticleResult } from '../../../../commonApp/types/index';
import { logger } from '../../../../utils/logger.ts';

export class SearchWriterAgent {
  private readonly defaultModel: string = 'gpt-4o-mini-2024-07-18'; // Latest stable gpt-4o-mini version
  private readonly imageSearchModel: string = 'gpt-4o-mini-2024-07-18'; // Same model for reverse image searches

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
   * Calls OpenAI API via Supabase Edge Function (simplified - no retries)
   */
  private async callOpenAI(
    messages: Array<{ role: string; content: string }>,
    model: string = this.defaultModel
  ): Promise<ArticleResult> {
    try {
      logger.debug('Calling OpenAI API via Supabase Edge Function', {
        model,
        messageCount: messages.length
      });

      // Get environment variables
      const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      console.log('[WRITER] Environment check:', {
        hasUrl: !!supabaseEdgeUrl,
        hasKey: !!supabaseAnonKey,
        url: supabaseEdgeUrl
      });

      if (!supabaseEdgeUrl) {
        throw new Error('Supabase Edge Function URL not configured');
      }

      if (!supabaseAnonKey) {
        throw new Error('Supabase anon key not found');
      }

      // Use fetch with AbortController for timeout
      try {
        const payload = {
          prompt: JSON.stringify({
            messages,
            model,
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_output_tokens: 1200
          })
        };

        console.log('[WRITER] Request payload:', {
          model,
          messagesCount: messages.length,
          payloadSize: JSON.stringify(payload).length
        });

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.error('[WRITER] TIMEOUT - Aborting request after 30 seconds');
          controller.abort();
        }, 30000);

        console.log('[WRITER] Calling fetch...');
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
        console.log('[WRITER] Fetch completed!', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error('OpenAI API error', {
            status: response.status,
            statusText: response.statusText,
            errorPreview: errorText.substring(0, 200)
          });
          throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        console.log('[WRITER] Response parsed:', {
          hasText: !!data.text,
          textLength: data.text?.length || 0
        });

        // The Supabase Edge Function returns { text, openai }
        if (!data.text) {
          throw new Error('No content in Supabase Edge Function response');
        }

        logger.debug('Successfully received content from Supabase Edge Function', {
          contentLength: data.text.length
        });

        // Parse the response
        let articleResult: ArticleResult;

        try {
          // Accept either a direct object or a stringified JSON
          if (typeof data.text === 'object') {
            articleResult = data.text;
          } else if (typeof data.text === 'string') {
            // Remove Markdown code block markers if present
            let cleanText = data.text.trim();
            cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '');
            articleResult = JSON.parse(cleanText);
          } else {
            throw new Error('Unexpected data.text type');
          }

          logger.debug('Parsed ArticleResult from data.text', { articleResult });
        } catch (parseError) {
          logger.warn('Failed to parse OpenAI response as JSON', {
            error: parseError,
            textPreview: String(data.text).slice(0, 200)
          });

          console.error('[WRITER] JSON parsing failed:', {
            error: parseError instanceof Error ? parseError.message : String(parseError),
            rawTextSample: String(data.text).slice(0, 1000)
          });

          // Fallback: wrap as plain text
          if (typeof data.text === 'string') {
            return {
              content: data.text,
              followUpQuestions: [],
              citations: []
            };
          }

          throw new Error('Failed to parse OpenAI response');
        }

        // Validate the result
        if (
          articleResult &&
          typeof articleResult.content === 'string' &&
          Array.isArray(articleResult.followUpQuestions) &&
          Array.isArray(articleResult.citations)
        ) {
          logger.debug('ArticleResult is valid, returning', {
            contentLength: articleResult.content.length,
            followUpQuestionsCount: articleResult.followUpQuestions.length,
            citationsCount: articleResult.citations.length
          });
          return articleResult;
        }

        logger.warn('OpenAI response did not match ArticleResult format');
        throw new Error('Invalid ArticleResult format');

      } catch (error: unknown) {
        // Handle timeout specifically
        if (error instanceof Error && error.name === 'AbortError') {
          logger.error('OpenAI call timeout after 30 seconds');
          console.error('[WRITER] Request aborted due to timeout');
          throw new Error('OpenAI request timeout - please try again');
        }
        
        // Handle network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          logger.error('Network error calling OpenAI', { error: error.message });
          console.error('[WRITER] Network error:', error);
          throw new Error('Network error - please check your connection');
        }

        // Re-throw other errors
        logger.error('Error in callOpenAI', { error });
        throw error;
      }
    } catch (error: unknown) {
      logger.error('Error in SearchWriterAgent.callOpenAI', { error });
      throw error;
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

      // Build system prompt
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
- Use inline citations like [1], [2], etc. to reference sources
- Make it comprehensive but well-organized
- Use markdown formatting for readability

Guidelines for followUpQuestions:
- Provide 5 related questions that naturally extend the topic
- Make them specific and actionable
- Focus on practical applications or deeper understanding

Leave citations array empty (we handle it separately).

CRITICAL: You must base your content strictly on the provided sources. Do not invent information.`;

      // Build user prompt with sources
      const sourcesText = researchResult.results
        .map((source: any, index: number) => {
          return `[${index + 1}] ${source.title}\nURL: ${source.url}\nContent: ${source.content || 'No content available'}`;
        })
        .join('\n\n');

      const userPrompt = `Query: "${query}"

Search Results:
${sourcesText}

Based on these search results, write a comprehensive article addressing the query. Remember to use inline citations like [1], [2], etc.`;

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
