// searchWriterAgent.ts
// Simplified following Swarm architecture: lightweight, stateless, minimal abstractions
// Regular search flow: Research data → OpenAI (via Supabase Edge Function) → Article

import { AgentResponse, ResearchResult, ArticleResult } from '../../../../commonApp/types/index';
import { logger } from '../../../../utils/logger.ts';

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
