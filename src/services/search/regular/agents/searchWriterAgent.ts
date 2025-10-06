// searchWriterAgent.ts
// Simplified following Swarm architecture: lightweight, stateless, minimal abstractions
// Regular search flow: Research data → OpenAI (via Supabase Edge Function) → Article

import { AgentResponse, ResearchResult, ArticleResult, SearchResult } from '../../../../commonApp/types/index';
import { logger } from '../../../../utils/logger.ts';

export class SearchWriterAgent {
  private readonly defaultModel: string = 'gpt-4o';

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

      if (!supabaseEdgeUrl) {
        throw new Error('Supabase Edge Function URL not configured');
      }

      if (!supabaseAnonKey) {
        throw new Error('Supabase anon key not found');
      }

      // Simple fetch call with timeout (matching test page pattern)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(supabaseEdgeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            prompt: JSON.stringify({
              messages,
              model,
              response_format: { type: 'json_object' },
              temperature: 0.7,
              max_output_tokens: 1200
            })
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          logger.error('OpenAI API error', {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText.substring(0, 500)
          });
          throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

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
        clearTimeout(timeoutId);
        
        // Handle timeout specifically
        if (error instanceof Error && error.name === 'AbortError') {
          logger.error('OpenAI call timeout after 30 seconds');
          throw new Error('OpenAI request timeout - please try again');
        }
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('OpenAI call failed', { error: errorMessage });
        throw error;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('OpenAI call failed (outer catch)', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Executes the article generation process
   * @param research - The research data gathered by the Retriever agent
   * @param onStatusUpdate - Optional callback for status updates
   * @returns An AgentResponse containing the generated article
   */
  async execute(
    research: ResearchResult,
    onStatusUpdate?: (status: string) => void
  ): Promise<AgentResponse<ArticleResult>> {
    try {
      logger.info('WriterAgent: Starting execution', {
        query: research?.query,
        resultsCount: research?.results?.length || 0
      });

      onStatusUpdate?.('Analyzing search results...');

      if (!research || !research.query) {
        throw new Error('Invalid research data: missing query');
      }

      const { query, results = [] } = research;

      logger.info('WriterAgent: Processing research data', {
        query,
        resultsCount: results.length
      });

      // Prepare source context from search results
      const maxResults = 8;
      const maxContentPerResult = 600;

      // Helper function to extract website name from URL
      const extractSiteName = (url: string): string => {
        try {
          const domain = new URL(url).hostname;
          return domain.replace('www.', '').split('.')[0];
        } catch {
          return 'Unknown Site';
        }
      };

      const sourceContext = results
        .slice(0, maxResults)
        .map((result: SearchResult, index: number) => {
          const content = 'content' in result
            ? (result as { content?: string }).content || ''
            : 'snippet' in result
              ? (result as { snippet?: string }).snippet || ''
              : '';
          const truncatedContent = content.length > maxContentPerResult
            ? content.slice(0, maxContentPerResult) + '...'
            : content;
          const siteName = extractSiteName(result.url);

          return `Source ${index + 1} - ${siteName}:
URL: ${result.url}
Website: ${siteName}
Title: ${result.title}
Content: ${truncatedContent}
---`;
        })
        .join('\n\n');

      logger.info('WriterAgent: Source context prepared', {
        sourceContextLength: sourceContext.length,
        maxResults
      });

      onStatusUpdate?.('Generating comprehensive answer...');

      const systemPrompt = `You are an expert research analyst creating comprehensive, well-sourced articles with intelligent follow-up questions.

CRITICAL: You must base your content ONLY on the provided sources. Do not add information not found in the sources.

RESPONSE FORMAT - Return a JSON object with this exact structure:
{
  "content": "Your comprehensive answer here...",
  "followUpQuestions": [
    "Follow-up question 1",
    "Follow-up question 2",
    "Follow-up question 3",
    "Follow-up question 4",
    "Follow-up question 5"
  ],
  "citations": [
    {
      "url": "url1",
      "title": "Article Title",
      "siteName": "Website Name"
    }
  ]
}

CONTENT GUIDELINES:
- Base ALL information directly on the provided sources
- Use website names for citations: [Website Name] instead of [Source X]
- When multiple sources from same site, use: [Website Name +2] format
- Include specific facts, dates, numbers, and quotes from the sources
- Structure with clear sections using ### headers
- Use **bold** for key terms and *italic* for emphasis
- Synthesize information from multiple sources when they discuss the same topic
- Present different viewpoints when sources conflict
- Maintain professional, informative tone
- Focus on the most current and relevant information from sources
- Do NOT add external knowledge not found in the provided sources

CONCLUSION GUIDELINES:
- Avoid temptation to create summary that references all sources
- End naturally with concluding thoughts or key takeaways
- Keep conclusions focused and concise
- Don't force citations into the conclusion unless naturally relevant

FOLLOW-UP QUESTIONS GUIDELINES:
- Generate 5 intelligent follow-up questions that naturally extend the topic
- Questions should explore deeper aspects, related implications, or practical applications
- Make questions specific and actionable based on the content discussed
- Focus on what readers would logically want to explore next
- Ensure questions build upon the information presented in the article

CITATION REQUIREMENTS:
- Use [Website Name] format for single sources
- Use [Website Name +2] format when 3+ sources from same site
- Cite specific claims, statistics, quotes, and facts
- Include multiple citations when information comes from different sources
- Ensure every major point is properly attributed
- Provide full citation details in the citations array with url, title, and siteName`;

      const userPrompt = `Query: "${query}"

Source Material:
${sourceContext}

TASK: Create a comprehensive, well-sourced article that directly addresses the query using ONLY the information provided in the sources above.

Requirements:
- Ground ALL information in the provided sources
- Use [Website Name] citations (not [Source X]) for every major claim or fact
- For multiple sources from same site, use [Website Name +X] format
- Include specific details, statistics, dates, and quotes from sources
- Structure with clear sections that organize the information logically
- Generate 5 thoughtful follow-up questions that extend the topic naturally
- Focus on the most current and relevant information available in the sources
- When sources conflict, present different perspectives clearly
- Synthesize related information from multiple sources when appropriate
- End with natural concluding thoughts, avoid forced summary citing all sources

CITATION EXAMPLES:
- Single source: [Wikipedia]
- Multiple from same site: [Wikipedia +2] (for 3 total sources)
- Different sites: [Wikipedia] [Reuters] [TechCrunch]

Remember: Base your response entirely on the source material provided. Do not add external information.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      logger.info('WriterAgent: Calling OpenAI', { model: this.defaultModel });

      // Simple call without retries or Promise.race
      const articleResult = await this.callOpenAI(messages, this.defaultModel);

      logger.info('WriterAgent: Successfully generated article', {
        contentLength: articleResult.content.length,
        followUpQuestionsCount: articleResult.followUpQuestions.length,
        citationsCount: articleResult.citations.length
      });

      onStatusUpdate?.('Article generation completed!');

      return {
        success: true,
        data: articleResult
      };

    } catch (error) {
      logger.error('WriterAgent execution failed:', error);
      onStatusUpdate?.('Article generation completed with fallback content');

      return {
        success: true,
        data: this.getFallbackData(research?.query || '')
      };
    }
  }
}
