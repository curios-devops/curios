import { AgentResponse, ResearchResult, ArticleResult, SearchResult } from '../../../../commonApp/types/index';
import { logger } from '../../../../utils/logger.ts';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export class SearchWriterAgent {
  private readonly netlifyFunctionUrl: string;
  private readonly defaultModel: string = 'gpt-4.1'; // Updated to use gpt-4.1

  constructor() {
    this.netlifyFunctionUrl = '/.netlify/functions/fetch-openai';
    logger.info('SearchWriterAgent: Initialized with OpenAI Responses API integration');
  }

  /**
   * Provides fallback article data if article generation fails.
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
   * Calls the OpenAI Responses API via Netlify function with retry logic
   */
  private async callOpenAIViaNetlify(
    messages: Array<{ role: string; content: string }>,
    model: string = this.defaultModel,
    retryCount: number = 0
  ): Promise<string> {
    const currentRetry = typeof retryCount === 'number' ? retryCount : 0;
    try {
      logger.debug('Calling OpenAI Responses API via Netlify function', { 
        model, 
        messageCount: messages.length,
        retryCount 
      });

      // Format the messages into a single input string for the Responses API
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const userMessage = messages.find(m => m.role === 'user')?.content || '';
      
      // Create input for the Responses API
      const input = `${systemMessage}\n\n${userMessage}`;

      logger.debug('Sending request to fetch-openai', { 
        url: this.netlifyFunctionUrl,
        inputLength: input.length,
        requestBody: {
          query: input.substring(0, 100) + '...',
          model: 'gpt-4.1',
          temperature: 0.3,
          max_output_tokens: 2000
        }
      });

      // Create AbortController for proper timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        logger.warn('Fetch request timeout - aborting');
        console.log('✍️ [WRITER] Fetch timeout - aborting request');
        controller.abort();
      }, 25000); // 25 second timeout for fetch

      console.log('✍️ [WRITER] About to make fetch request', {
        url: this.netlifyFunctionUrl,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(this.netlifyFunctionUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          query: input, // Fixed: Netlify function expects 'query' not 'input'
          model: 'gpt-4.1', // Use gpt-4.1 as per official example
          temperature: 0.3,
          max_output_tokens: 2000, // Changed from max_completion_tokens
          response_format: { type: 'json_object' } // This will be converted to text.format
          // Note: reasoning_effort removed as it's not supported with gpt-4.1
        }),
        signal: controller.signal
      });

      console.log('✍️ [WRITER] Fetch response received', {
        status: response.status,
        ok: response.ok,
        timestamp: new Date().toISOString()
      });

      // Clear the timeout since the request completed
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Error from fetch-openai function', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          url: this.netlifyFunctionUrl,
          requestBodySample: input.substring(0, 200) + '...'
        });
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      logger.debug('Received response from fetch-openai', { 
        success: data.success,
        hasContent: !!data.content,
        hasError: !!data.error
      });

      // Handle error response
      if (data.error) {
        logger.error('API error in response', { error: data.error });
        throw new Error(`API Error: ${data.error}`);
      }

      if (!data.success || !data.content) {
        throw new Error('No content in response');
      }

      // Return the content from the Responses API
      return data.content;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle AbortError specifically
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('Fetch request was aborted due to timeout', {
          error: errorMessage,
          query: messages.find(m => m.role === 'user')?.content?.substring(0, 100) || 'No query'
        });
      }
      
      if (currentRetry < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, currentRetry);
        logger.warn(`Retry ${currentRetry + 1}/${MAX_RETRIES} after error:`, {
          error: errorMessage
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callOpenAIViaNetlify(messages, model, currentRetry + 1);
      }
      
      logger.error('Max retries reached, returning fallback response', {
        error: errorMessage,
        query: messages.find(m => m.role === 'user')?.content?.substring(0, 100) || 'No query'
      });
      
      // Return a fallback response that matches the expected format
      return JSON.stringify({
        content: 'Sorry, I encountered an error while generating the response. Please try again later.',
        followUpQuestions: [
          'What specific information would be most valuable about this topic?',
          'How can I explore different aspects of this subject?',
          'What current developments should I know about?',
          'Where can I find expert insights on this topic?',
          'What practical applications relate to this subject?'
        ],
        citations: []
      });
    }
  }

  /**
   * Executes the article generation process following the proven BaseAgent pattern.
   * @param research - The research data gathered by the Retriever/UI agents.
   * @param onStatusUpdate - Optional callback for status updates
   * @returns An AgentResponse containing the generated article and follow-up questions.
   */
  async execute(
    research: ResearchResult, 
    onStatusUpdate?: (status: string) => void
  ): Promise<AgentResponse<ArticleResult>> {
    try {
      console.log('✍️ [WRITER] Starting SearchWriterAgent execution', {
        hasResearch: !!research,
        query: research?.query,
        resultsCount: research?.results?.length || 0,
        perspectivesCount: research?.perspectives?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      // CRITICAL: Signal that writer agent has started
      onStatusUpdate?.('Writer agent starting...');
      
      if (!research || !research.query) {
        console.error('✍️ [WRITER] Invalid research data: missing query');
        throw new Error('Invalid research data: missing query');
      }
      
      const { query, results = [] } = research;
      
      console.log('✍️ [WRITER] Processing research data', {
        query,
        resultsCount: results.length,
        timestamp: new Date().toISOString()
      });
      
      onStatusUpdate?.('Analyzing search results...');
      
      logger.info('WriterAgent: Starting execution', { 
        query, 
        resultsCount: results.length 
      });

      logger.info('WriterAgent: Preparing source context');
      // Prepare detailed context with full source information for better grounding
      const maxResults = 8; // Increase to 8 most relevant results for better coverage
      const maxContentPerResult = 600; // Increase content length for more comprehensive analysis
      
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

      logger.info('WriterAgent: Making OpenAI API call', { 
        sourceContextLength: sourceContext.length,
        maxResults,
        model: this.defaultModel
      });

      onStatusUpdate?.('Generating comprehensive answer...');

      console.log('✍️ [WRITER] Making OpenAI API call', {
        sourceContextLength: sourceContext.length,
        maxResults,
        model: this.defaultModel,
        url: this.netlifyFunctionUrl,
        timestamp: new Date().toISOString()
      });

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

      // Add explicit timeout handling for WriterAgent with proper cleanup
      const completionPromise = this.callOpenAIViaNetlify(messages, this.defaultModel);
      
      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          logger.warn('WriterAgent OpenAI call timeout after 30 seconds');
          reject(new Error('WriterAgent OpenAI call timeout after 30 seconds'));
        }, 30000);
      });

      let content: string;
      try {
        content = await Promise.race([completionPromise, timeoutPromise]);
        
        // CRITICAL: Clear timeout on successful completion to prevent memory leak
        if (timeoutId) clearTimeout(timeoutId);
      } catch (error) {
        // CRITICAL: Clear timeout on error to prevent memory leak
        if (timeoutId) clearTimeout(timeoutId);
        throw error;
      }

      logger.info('WriterAgent: OpenAI call completed', { 
        hasContent: !!content 
      });

      if (!content) {
        throw new Error('No content generated');
      }

      // Parse the JSON response
      let parsed: { content?: string; followUpQuestions?: string[]; citations?: string[] } | null = null;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        logger.warn('JSON parse error:', parseError);
      }

      if (!parsed) {
        // If JSON parsing fails, create a fallback response with follow-up questions
        const fallbackResult: ArticleResult = {
          content: content.trim(),
          followUpQuestions: [
            `What specific developments are shaping ${query} today?`,
            `How are experts addressing challenges in ${query}?`,
            `What practical applications exist for ${query}?`,
            `What future trends are emerging in ${query}?`,
            `How can organizations leverage ${query} effectively?`
          ],
          citations: results.slice(0, 5).map((r: SearchResult) => ({
            url: r.url,
            title: r.title,
            siteName: new URL(r.url).hostname.replace('www.', '')
          }))
        };
        return {
          success: true,
          data: fallbackResult
        };
      }

      // Ensure the parsed object has the expected structure with follow-up questions
      const result: ArticleResult = {
        content: typeof parsed.content === 'string' ? parsed.content : content.trim(),
        followUpQuestions: Array.isArray(parsed.followUpQuestions) && parsed.followUpQuestions.length > 0 
          ? parsed.followUpQuestions 
          : [
              `What specific developments are shaping ${query} today?`,
              `How are experts addressing challenges in ${query}?`,
              `What practical applications exist for ${query}?`,
              `What future trends are emerging in ${query}?`,
              `How can organizations leverage ${query} effectively?`
            ],
        citations: Array.isArray(parsed.citations) && parsed.citations.length > 0
          ? parsed.citations.map((citation: any) => {
              if (typeof citation === 'string') {
                // If citation is just a URL string, convert to CitationInfo
                const matchingResult = results.find(r => r.url === citation);
                return {
                  url: citation,
                  title: matchingResult?.title || 'Source',
                  siteName: new URL(citation).hostname.replace('www.', '')
                };
              }
              return citation; // Already a CitationInfo object
            })
          : results.slice(0, 5).map((r: SearchResult) => ({
              url: r.url,
              title: r.title,
              siteName: new URL(r.url).hostname.replace('www.', '')
            }))
      };

      // CRITICAL: Send completion signal for successful article generation
      onStatusUpdate?.('Article generation completed successfully!');
      await new Promise(resolve => setTimeout(resolve, 150));

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('WriterAgent execution failed:', error);
      
      // CRITICAL: Send completion signal even on error
      onStatusUpdate?.('Article generation completed with fallback content');
      await new Promise(resolve => setTimeout(resolve, 150));
      
      return {
        success: true,
        data: this.getFallbackData(research.query)
      };
    }
  }
}
