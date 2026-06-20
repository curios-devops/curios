// Environment variables are loaded by the parent process
import { logger } from '../../../../utils/logger.ts';
import { apifySearchTool } from '../../../../commonService/searchTools/apifySearchTool.ts';

// Type for Tavily API response
interface TavilySearchResponse {
  results: Array<{
    title?: string;
    url?: string;
    content?: string;
    snippet?: string;
    score?: number;
    published_date?: string;
  }>;
}


interface SearchResult {
  title: string;
  url: string;
  content: string;
  source: string;
  score?: number;
  publishedDate?: string;
}

interface Perspective {
  id: string;
  title: string;
  content: string;
  source: string;
  relevance: number;
}

// OpenAI response format for perspectives
interface PerspectivesResponse {
  perspectives: Array<{
    title: string;
    content: string;
  }>;
}

/**
 * Unified PerspectiveAgent that combines Apify and Tavily search results
 * to provide comprehensive search perspectives.
 */
export class PerspectiveAgent {
  private tavilyApiKey: string;
  private apifyApiKey: string;

  constructor() {
    this.apifyApiKey = import.meta.env.VITE_APIFY_API_KEY || '';
    this.tavilyApiKey = import.meta.env.VITE_TAVILY_API_KEY || '';
    
    logger.info('PerspectiveAgent initialized', {
      hasApifyKey: !!this.apifyApiKey,
      hasTavilyKey: !!this.tavilyApiKey
    });
  }

  /**
   * Executes search with appropriate provider based on Pro status
   * APify is only used for Pro searches, regular searches use only Tavily
   */
  async search(query: string, options: { maxResults?: number; isPro?: boolean } = {}): Promise<SearchResult[]> {
    try {
      logger.info('PerspectiveAgent: Starting search', { query, isPro: options.isPro });
      
      if (options.isPro) {
        // Pro mode: Execute both searches in parallel
        const [apifyResults, tavilyResults] = await Promise.all([
          this.searchWithApify(query, options),
          this.searchWithTavily(query, options)
        ]);

        // Combine and deduplicate results
        const allResults = [...apifyResults, ...tavilyResults];
        const uniqueResults = Array.from(new Map(allResults.map(item => [item.url, item])).values());

        // Sort by score (if available) or relevance
        return uniqueResults.sort((a, b) => (b.score || 0.5) - (a.score || 0.5));
      } else {
        // Regular mode: Only use Tavily, skip APify completely
        logger.info('PerspectiveAgent: Regular search mode - using Tavily only');
        const tavilyResults = await this.searchWithTavily(query, options);
        return tavilyResults.sort((a, b) => (b.score || 0.5) - (a.score || 0.5));
      }
    } catch (error) {
      logger.error('PerspectiveAgent search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates perspectives based on search results
   * Now uses OpenAI via Supabase Edge Function (same pattern as WriterAgent)
   */
  async generatePerspectives(query: string, isPro: boolean = false): Promise<Perspective[]> {
    try {
      // First, get search results as context
      const searchResults = await this.search(query, { maxResults: 10, isPro });
      
      logger.info('PerspectiveAgent: Generating AI perspectives', { 
        query, 
        resultsCount: searchResults.length 
      });

      // Use OpenAI to generate intelligent perspectives from the search results
      const aiPerspectives = await this.generatePerspectivesWithOpenAI(query, searchResults);
      
      return aiPerspectives;
    } catch (error) {
      logger.error('Failed to generate perspectives with OpenAI:', error);
      // Fallback: Return basic perspectives from search results
      const fallbackResults = await this.search(query, { maxResults: 10, isPro });
      return fallbackResults.map((result, index) => ({
        id: `perspective-${index}`,
        title: result.title,
        content: result.content,
        source: result.source || 'web',
        relevance: result.score || 0.5
      }));
    }
  }

  /**
   * Calls OpenAI API via Supabase Edge Function (following WriterAgent pattern exactly)
   * Generates intelligent perspective questions from search results
   */
  private async generatePerspectivesWithOpenAI(
    query: string,
    searchResults: SearchResult[]
  ): Promise<Perspective[]> {
    try {
      logger.debug('Calling OpenAI API via Supabase Edge Function for perspectives', {
        model: 'gpt-4.1-mini-2025-04-14',
        query,
        resultsCount: searchResults.length
      });

      // Get environment variables (same as WriterAgent)
      const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      console.log('🔍 [PERSPECTIVE] Environment check:', {
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

      // Prepare context from search results (first 5 results)
      const contextSnippets = searchResults
        .slice(0, 5)
        .map((result, idx) => `${idx + 1}. ${result.title}\n${result.content.substring(0, 300)}...`)
        .join('\n\n');

      const systemPrompt = `You are an expert research analyst. Your task is to generate 5 diverse, thought-provoking perspective questions about a topic based on provided search results.

CRITICAL: Return ONLY a valid JSON object with this exact structure:
{
  "perspectives": [
    {
      "title": "Perspective title/question here",
      "content": "Brief explanation or context for this perspective (2-3 sentences)"
    }
  ]
}

GUIDELINES:
- Generate exactly 5 unique perspectives
- Each perspective should explore a different angle or dimension of the topic
- Perspectives should be: analytical, critical, comparative, future-oriented, or practical
- Base perspectives on the search results context provided
- Keep titles concise (question format preferred)
- Keep content explanations brief (2-3 sentences max)
- Use diverse question types: What, How, Why, Should, Could
- Ensure perspectives are relevant and thought-provoking`;

      const userPrompt = `Query: "${query}"

Search Results Context:
${contextSnippets}

Generate 5 diverse perspective questions that explore different angles of this topic. Base your perspectives on the search results context provided.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      // Simple fetch call with timeout (same pattern as WriterAgent)
      const controller = new AbortController();

      try {
        const payload = {
          prompt: JSON.stringify({
            messages,
            model: 'gpt-4.1-mini-2025-04-14', // GPT-4.1 mini model
            response_format: { type: 'json_object' },
            temperature: 0.8, // Higher temperature for creative perspectives
            max_output_tokens: 800
          })
        };

        console.log('🔍 [PERSPECTIVE] Initiating fetch to Supabase Edge Function...', {
          url: supabaseEdgeUrl,
          hasAuth: !!supabaseAnonKey,
          timeout: '30s',
          model: 'gpt-4.1-mini-2025-04-14',
          messagesCount: messages.length,
          payloadSize: JSON.stringify(payload).length
        });

        console.log('🔍 [PERSPECTIVE] Request payload structure:', {
          hasPrompt: !!payload.prompt,
          promptType: typeof payload.prompt,
          promptLength: payload.prompt.length,
          promptPreview: payload.prompt.substring(0, 200)
        });

        console.log('🔍 [PERSPECTIVE] About to call fetch with:', {
          url: supabaseEdgeUrl,
          method: 'POST',
          hasAuthHeader: !!supabaseAnonKey,
          bodyLength: JSON.stringify(payload).length
        });
        
        console.log('🔍 [PERSPECTIVE] Calling fetch NOW...');
        
        // Use Promise.race to enforce timeout
        let fetchTimeoutId: ReturnType<typeof setTimeout> | null = null;
        const timeoutPromise = new Promise((_, reject) => {
          fetchTimeoutId = setTimeout(() => {
            logger.error('OpenAI fetch timeout triggered after 30 seconds');
            console.error('❌ [PERSPECTIVE] Fetch timeout - aborting request');
            controller.abort();
            reject(new Error('Request timeout after 30 seconds'));
          }, 30000);
        });
        
        const fetchPromise = fetch(supabaseEdgeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        
        const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
        
        // Clear the timeout if fetch completed before timeout
        if (fetchTimeoutId) {
          clearTimeout(fetchTimeoutId);
          fetchTimeoutId = null;
        }
        
        console.log('🔍 [PERSPECTIVE] Fetch call RETURNED, response received!');
        
        console.log('🔍 [PERSPECTIVE] Fetch completed, response received:', {
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
          console.error('❌ [PERSPECTIVE] OpenAI API error:', {
            status: response.status,
            errorPreview: errorText.substring(0, 200)
          });
          throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        console.log('🔍 [PERSPECTIVE] Response parsed successfully:', {
          hasText: !!data.text,
          textLength: data.text?.length || 0,
          textType: typeof data.text
        });

        // The Supabase Edge Function returns { text, openai }
        if (!data.text) {
          throw new Error('No content in Supabase Edge Function response');
        }

        logger.debug('Successfully received perspectives from Supabase Edge Function', {
          contentLength: typeof data.text === 'string' ? data.text.length : 'N/A'
        });

        // 🔍 DEBUG: Log what OpenAI returned (first 500 chars)
        console.log('🔍 [PERSPECTIVE] OpenAI returned:', {
          textType: typeof data.text,
          textLength: typeof data.text === 'string' ? data.text.length : 'N/A',
          textPreview: typeof data.text === 'string' ? data.text.slice(0, 500) : JSON.stringify(data.text).slice(0, 500),
          hasOpenAIMetadata: !!data.openai
        });

        // Parse the response (same pattern as WriterAgent)
        let perspectivesResponse: PerspectivesResponse;

        try {
          // Accept either a direct object or a stringified JSON
          if (typeof data.text === 'object') {
            perspectivesResponse = data.text;
          } else if (typeof data.text === 'string') {
            // Remove Markdown code block markers if present
            let cleanText = data.text.trim();
            cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '');
            perspectivesResponse = JSON.parse(cleanText);
          } else {
            throw new Error('Unexpected data.text type');
          }

          logger.debug('Parsed PerspectivesResponse from data.text', { perspectivesResponse });
        } catch (parseError) {
          logger.warn('Failed to parse OpenAI response as JSON', {
            error: parseError
          });

          // 🔍 DEBUG: Show problematic JSON for debugging
          console.error('❌ [PERSPECTIVE] JSON parsing failed:', {
            error: parseError instanceof Error ? parseError.message : String(parseError),
            rawTextSample: String(data.text).slice(0, 1000),
            textLength: String(data.text).length,
            rawTextEnd: String(data.text).slice(-500)
          });

          throw new Error('Failed to parse OpenAI response');
        }

        // Validate and convert to Perspective[] format
        if (
          perspectivesResponse &&
          Array.isArray(perspectivesResponse.perspectives)
        ) {
          logger.debug('PerspectivesResponse is valid, returning', {
            perspectivesCount: perspectivesResponse.perspectives.length
          });
          return perspectivesResponse.perspectives.map((p, idx) => ({
            id: `ai-perspective-${idx}`,
            title: p.title,
            content: p.content,
            source: 'openai',
            relevance: 0.9 // High relevance for AI-generated perspectives
          }));
        }

        logger.warn('OpenAI response did not match PerspectivesResponse format');
        throw new Error('Invalid PerspectivesResponse format');

      } catch (error: unknown) {
        // Handle timeout specifically
        if (error instanceof Error && error.name === 'AbortError') {
          logger.error('OpenAI call timeout after 30 seconds');
          console.error('❌ [PERSPECTIVE] Request aborted due to timeout');
          throw new Error('OpenAI request timeout - please try again');
        }
        
        // Handle network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          logger.error('Network error calling OpenAI', { error: error.message });
          console.error('❌ [PERSPECTIVE] Network error:', error.message);
          throw new Error('Network error connecting to OpenAI - check your connection');
        }
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('OpenAI call failed', { error: errorMessage });
        console.error('❌ [PERSPECTIVE] OpenAI call failed:', errorMessage);
        throw error;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('OpenAI call failed for perspectives (outer catch)', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Search using Apify's Google Search Scraper
   * Uses the same apifySearchTool function as regular search for consistency
   */
  private async searchWithApify(query: string, options: { maxResults?: number } = {}): Promise<SearchResult[]> {
    if (!this.apifyApiKey) {
      logger.debug('Skipping Apify search - API key not configured');
      return [];
    }

    try {
      logger.info('PerspectiveAgent: Calling Apify search', { query });
      
      // Use the same apifySearchTool that regular search uses
      const results = await apifySearchTool(query);

      logger.info('PerspectiveAgent: Apify search completed', {
        webCount: results.web.length,
        imagesCount: results.images.length
      });

      // Return web results formatted for PerspectiveAgent
      return results.web.slice(0, options.maxResults || 5).map(result => ({
        title: result.title,
        url: result.url,
        content: result.content,
        source: 'apify',
        score: 0.7, // Default score for Apify results
        publishedDate: new Date().toISOString()
      }));
    } catch (error) {
      logger.error('Apify search failed:', error);
      return []; // Return empty array to continue with Tavily
    }
  }

  /**
   * Search using Tavily's Search API
   */
  private async searchWithTavily(
    query: string, 
    options: { maxResults?: number } = {}
  ): Promise<SearchResult[]> {
    if (!this.tavilyApiKey) {
      logger.warn('Tavily API key not configured, skipping Tavily search');
      return [];
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.tavilyApiKey}`
        },
        body: JSON.stringify({
          query,
          max_results: options.maxResults || 10,
          include_answer: true,
          include_raw_content: true,
        })
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
      }

      const data: TavilySearchResponse = await response.json();

return (data.results || []).map((result) => ({
        title: result.title || '',
        url: result.url || '',
        content: result.content || result.snippet || '',
        source: 'tavily',
        score: result.score || 0.5,
        publishedDate: result.published_date,
      }));
    } catch (error) {
      logger.error('Tavily search failed:', error);
      return []; // Return empty array to continue with other providers
    }
  }
}