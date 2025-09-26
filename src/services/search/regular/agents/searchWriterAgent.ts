import { AgentResponse, ResearchResult, ArticleResult, SearchResult } from '../../../../commonApp/types/index';
import { logger } from '../../../../utils/logger.ts';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export class SearchWriterAgent {
  private readonly defaultModel: string = 'gpt-4o'; // Use gpt-4o model

  constructor() {
    logger.info('SearchWriterAgent: Initialized with direct OpenAI API integration');
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
   * Calls the OpenAI API directly with retry logic
   */
  private async callOpenAI(
    messages: Array<{ role: string; content: string }>,
    model: string = this.defaultModel,
    retryCount: number = 0
  ): Promise<ArticleResult> {
    const currentRetry = typeof retryCount === 'number' ? retryCount : 0;
    try {
      logger.debug('Calling OpenAI API directly', { 
        model, 
        messageCount: messages.length,
        retryCount 
      });


  // Use the deployed Supabase Edge Function endpoint
  const supabaseEdgeUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENAI_API_URL)
    ? import.meta.env.VITE_OPENAI_API_URL
    : 'VITE_OPENAI_API_URL';

      // Get Supabase anon key from environment
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseAnonKey) {
        throw new Error('Supabase anon key not found in environment variables');
      }

      logger.debug('Sending request to Supabase Edge Function', { 
        url: supabaseEdgeUrl,
        model,
        messageCount: messages.length
      });

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
        })
      });

      logger.debug('OpenAI API response received', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Error from OpenAI API', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`OpenAI API error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      


      // The Supabase Edge Function returns { text, openai }
      if (!data.text) {
        throw new Error('No content in Supabase Edge Function response');
      }

      logger.debug('Successfully received content from Supabase Edge Function', { 
        contentLength: data.text.length 
      });

      // Debug: log the raw data.text
      logger.debug('Raw OpenAI data.text', { textPreview: String(data.text).slice(0, 200) });
      let articleResult: ArticleResult | null = null;
      // Try to parse as JSON, fallback to plain text if not valid JSON
      try {
        // Accept either a direct object or a stringified JSON
        if (typeof data.text === 'object') {
          articleResult = data.text;
        } else if (typeof data.text === 'string') {
          // Remove Markdown code block markers if present
          let cleanText = data.text.trim();
          // Remove leading/trailing triple backticks and optional json/lang
          cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '');
          articleResult = JSON.parse(cleanText);
        }
        logger.debug('Parsed ArticleResult from data.text', { articleResult });
      } catch (e) {
        logger.warn('Failed to parse OpenAI response as JSON', { error: e, textPreview: String(data.text).slice(0, 200) });
      }
      if (
        articleResult &&
        typeof articleResult.content === 'string' &&
        Array.isArray(articleResult.followUpQuestions) &&
        Array.isArray(articleResult.citations)
      ) {
        logger.debug('ArticleResult is valid, returning', { articleResult });
        return articleResult;
      }

      // If not valid JSON, treat as plain text/Markdown and wrap in ArticleResult
      if (typeof data.text === 'string') {
        // Try to extract follow-up questions and citations if present in the text
        let followUpQuestions: string[] = [];
        let citations: any[] = [];
        // Simple heuristics: look for sections in the text
        const fqMatch = data.text.match(/Follow[- ]?up Questions:?\n([\s\S]*?)(\n\n|$)/i);
        if (fqMatch) {
          followUpQuestions = fqMatch[1]
            .split(/\n|\r/)
            .map((q: string) => q.trim())
            .filter((q: string) => q.length > 0 && !/^[-*]?$/.test(q));
        }
        const citMatch = data.text.match(/Citations?:?\n([\s\S]*?)(\n\n|$)/i);
        if (citMatch) {
          citations = citMatch[1]
            .split(/\n|\r/)
            .map((c: string) => c.trim())
            .filter((c: string) => c.length > 0 && !/^[-*]?$/.test(c))
            .map((c: string) => ({ url: '', title: c, siteName: '' }));
        }
        logger.debug('Wrapped plain text as ArticleResult', { followUpQuestions, citations });
        return {
          content: data.text,
          followUpQuestions,
          citations
        };
      }

      logger.warn('OpenAI response did not match ArticleResult format, using fallback', { textPreview: String(data.text).slice(0, 200), articleResult });
      return this.getFallbackData(messages[messages.length - 1]?.content || '');

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
        return this.callOpenAI(messages, model, currentRetry + 1);
      }

      logger.error('Max retries reached, returning fallback response', {
        error: errorMessage,
        query: messages.find(m => m.role === 'user')?.content?.substring(0, 100) || 'No query'
      });

      // Return a fallback response that matches the expected format
      return {
        content: 'Sorry, I encountered an error while generating the response. Please try again later.',
        followUpQuestions: [
          'What specific information would be most valuable about this topic?',
          'How can I explore different aspects of this subject?',
          'What current developments should I know about?',
          'Where can I find expert insights on this topic?',
          'What practical applications relate to this subject?'
        ],
        citations: []
      };
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
        url: 'https://api.openai.com/v1/chat/completions',
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
  const completionPromise = this.callOpenAI(messages, this.defaultModel);
      
      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          logger.warn('WriterAgent OpenAI call timeout after 30 seconds');
          reject(new Error('WriterAgent OpenAI call timeout after 30 seconds'));
        }, 30000);
      });

      let articleResult: ArticleResult;
      try {
        articleResult = await Promise.race([completionPromise, timeoutPromise]);
        // CRITICAL: Clear timeout on successful completion to prevent memory leak
        if (timeoutId) clearTimeout(timeoutId);
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
      return {
        success: true,
        data: articleResult
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
    // If for some reason the try block completes without returning, return fallback
    return {
      success: true,
      data: this.getFallbackData(research?.query || '')
    };
  }
}
