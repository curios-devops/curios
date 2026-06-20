// searchWriterAgent.ts
// Simplified following Swarm architecture: lightweight, stateless, minimal abstractions
// Regular search flow: Research data → OpenAI (via Supabase Edge Function) → Article

import { AgentResponse, ResearchResult, ArticleResult, SearchResult } from '../../../../commonApp/types/index';
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

      console.log('🔍 [WRITER] Environment check:', {
        hasUrl: !!supabaseEdgeUrl,
        hasKey: !!supabaseAnonKey,
        urlPreview: supabaseEdgeUrl ? supabaseEdgeUrl.substring(0, 50) + '...' : 'MISSING',
        keyPreview: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING'
      });

      if (!supabaseEdgeUrl) {
        throw new Error('Supabase Edge Function URL not configured');
      }

      if (!supabaseAnonKey) {
        throw new Error('Supabase anon key not found');
      }

      // Use fetch with AbortController for timeout handling
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
        
        console.log('🔍 [WRITER] Payload model being sent:', model);

        console.log('🔍 [WRITER] Initiating fetch to Supabase Edge Function...', {
          url: supabaseEdgeUrl,
          hasAuth: !!supabaseAnonKey,
          timeout: '30s',
          model,
          messagesCount: messages.length,
          payloadSize: JSON.stringify(payload).length
        });

        console.log('🔍 [WRITER] Request payload structure:', {
          hasPrompt: !!payload.prompt,
          promptType: typeof payload.prompt,
          promptLength: payload.prompt.length,
          promptPreview: payload.prompt.substring(0, 200)
        });

        console.log('🔍 [WRITER] About to call fetch with:', {
          url: supabaseEdgeUrl,
          method: 'POST',
          hasAuthHeader: !!supabaseAnonKey,
          bodyLength: JSON.stringify(payload).length
        });
        
        console.log('🔍 [WRITER] Calling OpenAI via XMLHttpRequest (more reliable than fetch)...');
        
        // Use XMLHttpRequest with explicit timeout instead of fetch
        // fetch() can hang indefinitely in some browsers/network conditions
        const response = await new Promise<Response>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.timeout = 30000; // 30 second timeout
          
          xhr.open('POST', supabaseEdgeUrl, true);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('Authorization', `Bearer ${supabaseAnonKey}`);
          
          // Add progress event to detect network activity
          xhr.upload.onprogress = (event) => {
            console.log('📤 [WRITER] Upload progress:', {
              loaded: event.loaded,
              total: event.total,
              percentage: event.total ? Math.round((event.loaded / event.total) * 100) : 'unknown'
            });
          };
          
          xhr.onprogress = (event) => {
            console.log('📥 [WRITER] Download progress:', {
              loaded: event.loaded,
              total: event.total,
              percentage: event.total ? Math.round((event.loaded / event.total) * 100) : 'unknown'
            });
          };
          
          xhr.onreadystatechange = () => {
            console.log('� [WRITER] XHR state change:', {
              readyState: xhr.readyState,
              status: xhr.status,
              readyStateText: ['UNSENT', 'OPENED', 'HEADERS_RECEIVED', 'LOADING', 'DONE'][xhr.readyState],
              statusText: xhr.statusText
            });
            
            // Log headers when received
            if (xhr.readyState === 2) { // HEADERS_RECEIVED
              console.log('📋 [WRITER] Response headers received:', {
                contentType: xhr.getResponseHeader('Content-Type'),
                contentLength: xhr.getResponseHeader('Content-Length'),
                allHeaders: xhr.getAllResponseHeaders()
              });
            }
          };
          
          xhr.onload = () => {
            console.log('✅ [WRITER] XHR request completed!', {
              status: xhr.status,
              statusText: xhr.statusText,
              responseLength: xhr.responseText?.length || 0,
              responsePreview: xhr.responseText?.substring(0, 200)
            });
            
            // Check for error status codes
            if (xhr.status >= 400) {
              console.error('❌ [WRITER] XHR returned error status:', {
                status: xhr.status,
                statusText: xhr.statusText,
                response: xhr.responseText
              });
              reject(new Error(`Supabase Edge Function returned ${xhr.status}: ${xhr.statusText}`));
              return;
            }
            
            // Convert XHR to Response-like object
            const response = new Response(xhr.responseText, {
              status: xhr.status,
              statusText: xhr.statusText,
              headers: new Headers({
                'Content-Type': 'application/json'
              })
            });
            resolve(response);
          };
          
          xhr.onerror = (event) => {
            console.error('❌ [WRITER] XHR network error:', {
              type: event.type,
              readyState: xhr.readyState,
              status: xhr.status,
              statusText: xhr.statusText,
              message: 'This usually means CORS error, network issue, or blocked request'
            });
            reject(new Error('Network error - CORS or connection issue with Supabase'));
          };
          
          xhr.ontimeout = () => {
            console.error('❌ [WRITER] XHR timeout after 30 seconds', {
              readyState: xhr.readyState,
              status: xhr.status
            });
            reject(new Error('Request timeout after 30 seconds'));
          };
          
          console.log('🔍 [WRITER] Sending XHR request...');
          console.log('🔍 [WRITER] Request details:', {
            method: 'POST',
            url: supabaseEdgeUrl,
            timeout: xhr.timeout,
            withCredentials: xhr.withCredentials
          });
          
          try {
            xhr.send(JSON.stringify(payload));
            console.log('✅ [WRITER] XHR send() called successfully - now waiting for response...');
          } catch (error) {
            console.error('❌ [WRITER] Error calling xhr.send():', error);
            reject(error);
          }
        });
        
        console.log('🔍 [WRITER] Fetch call RETURNED, response received!');
        
        console.log('🔍 [WRITER] Fetch completed, response received:', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error('OpenAI API error', {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText.substring(0, 500)
          });
          console.error('❌ [WRITER] OpenAI API error:', {
            status: response.status,
            errorPreview: errorText.substring(0, 200)
          });
          throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        console.log('🔍 [WRITER] Response parsed successfully:', {
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

        // 🔍 DEBUG: Log what OpenAI returned (first 500 chars)
        console.log('🔍 [WRITER] OpenAI returned:', {
          textType: typeof data.text,
          textLength: typeof data.text === 'string' ? data.text.length : 'N/A',
          textPreview: typeof data.text === 'string' ? data.text.slice(0, 500) : JSON.stringify(data.text).slice(0, 500),
          hasOpenAIMetadata: !!data.openai
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

          // 🔍 DEBUG: Show problematic JSON for debugging
          console.error('❌ [WRITER] JSON parsing failed:', {
            error: parseError instanceof Error ? parseError.message : String(parseError),
            rawTextSample: String(data.text).slice(0, 1000),
            textLength: String(data.text).length,
            rawTextEnd: String(data.text).slice(-500)
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
          console.error('❌ [WRITER] Request aborted due to timeout');
          throw new Error('OpenAI request timeout - please try again');
        }
        
        // Handle network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          logger.error('Network error calling OpenAI', { error: error.message });
          console.error('❌ [WRITER] Network error:', error.message);
          throw new Error('Network error connecting to OpenAI - check your connection');
        }
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('OpenAI call failed', { error: errorMessage });
        console.error('❌ [WRITER] OpenAI call failed:', errorMessage);
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

      if (!research) {
        throw new Error('Invalid research data: missing research object');
      }

      // Allow empty query for image-only searches
      const { query = '', results = [], images = [], videos = [], isReverseImageSearch = false } = research;

      logger.info('WriterAgent: Processing research data', {
        query: query || '(image-only search)',
        resultsCount: results.length,
        imagesCount: images.length,
        videosCount: videos.length,
        isReverseImageSearch
      });

      // 🔍 DEBUG: Log payload details for combined text+image searches
      console.log('🔍 [WRITER] Received research payload:', {
        query,
        resultsCount: results.length,
        imagesCount: images.length,
        videosCount: videos.length,
        isReverseImageSearch,
        firstResult: results[0] ? {
          title: results[0].title,
          url: results[0].url,
          contentPreview: (results[0] as any).content?.slice(0, 100) + '...'
        } : null,
        firstImage: images[0] ? {
          url: images[0].url,
          alt: images[0].alt
        } : null
      });

      // Use flag from Retriever Agent to determine search type
      // For reverse image searches, use simpler/cheaper gpt-4o-mini model
      const model = isReverseImageSearch ? this.imageSearchModel : this.defaultModel;

      logger.info('WriterAgent: Using model', { 
        model, 
        reason: isReverseImageSearch ? 'reverse image search detected' : 'regular text search' 
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

      // Handle image-based searches with appropriate prompt
      const queryContext = isReverseImageSearch
        ? (query 
            ? `Image + Text Search: The user uploaded an image and provided the query "${query}". We performed a reverse image search combined with their text query. Based on the search results below, provide a comprehensive analysis.`
            : `Image-Only Search: The user uploaded an image without any text query. We performed a reverse image search. Based on the search results below, provide a comprehensive analysis of what the image shows, including context, identification, and related information.`)
        : `Query: "${query}"`;

      const userPrompt = `${queryContext}

Source Material:
${sourceContext}

TASK: Create a comprehensive, well-sourced ${isReverseImageSearch ? 'image analysis article' : 'article'} that ${isReverseImageSearch ? 'identifies and explains what the image shows' : 'directly addresses the query'} using ONLY the information provided in the sources above.

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

      logger.info('WriterAgent: Calling OpenAI', { model });

      // 🔍 DEBUG: Log what we're sending to OpenAI
      console.log('🔍 [WRITER] Sending to OpenAI:', {
        model,
        messagesCount: messages.length,
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
        userPromptPreview: userPrompt.slice(0, 500) + '...',
        isReverseImageSearch,
        queryContext: isReverseImageSearch
          ? (query 
              ? `Image + Text Search: "${query}"`
              : `Image-Only Search`)
          : `Text Search: "${query}"`
      });

      // Simple call without retries or Promise.race
      console.log('🎯 [WRITER] About to call OpenAI API...');
      const articleResult = await this.callOpenAI(messages, model);
      console.log('✅ [WRITER] OpenAI API call completed successfully!', {
        contentLength: articleResult.content.length,
        followUpQuestionsCount: articleResult.followUpQuestions.length,
        citationsCount: articleResult.citations.length
      });

      logger.info('WriterAgent: Successfully generated article', {
        contentLength: articleResult.content.length,
        followUpQuestionsCount: articleResult.followUpQuestions.length,
        citationsCount: articleResult.citations.length
      });

      onStatusUpdate?.('Article generation completed!');

      console.log('✅ [WRITER] WriterAgent.execute() completing, returning success response');
      
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
