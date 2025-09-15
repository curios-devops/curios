//here is the old but working writer agent :

// WriterAgent for Search Flow - Simplified implementation
import { AgentResponse, ResearchResult, ArticleResult, SearchResult } from './types';
import { logger } from '../../utils/logger';
import { secureOpenAI } from '../secureOpenAI';
import { env } from '../../config/env';

export class WriterAgent {
  private openai: typeof secureOpenAI | null = null;

  constructor() {
    // Initialize secure OpenAI client if API key is configured
    const { apiKey } = env.openai;
    if (apiKey?.trim()) {
      this.openai = secureOpenAI;
      logger.info('WriterAgent: Using secure OpenAI service');
    } else {
      logger.warn('WriterAgent: OpenAI API key not configured, using fallback responses');
    }
  }

  /**
   * Executes the article generation process following the proven BaseAgent pattern.
   * @param research - The research data gathered by the Retriever/UI agents.
   * @returns An AgentResponse containing the generated article and follow-up questions.
   */
  async execute(research: ResearchResult): Promise<AgentResponse<ArticleResult>> {
    try {
      logger.info('WriterAgent: Starting execution', { 
        query: research.query, 
        resultsCount: research.results.length 
      });

      // Check if OpenAI is available
      if (!this.openai) {
        logger.warn('WriterAgent: OpenAI not available, using fallback');
        return {
          success: true,
          data: this.getFallbackData(research.query)
        };
      }

      logger.info('WriterAgent: Preparing source context');
      // Prepare detailed context with full source information for better grounding
      const maxResults = 8; // Increase to 8 most relevant results for better coverage
      const maxContentPerResult = 600; // Increase content length for more comprehensive analysis
      
      const sourceContext = research.results
        .slice(0, maxResults)
        .map((result: SearchResult, index: number) => {
          const truncatedContent = result.content.length > maxContentPerResult 
            ? result.content.slice(0, maxContentPerResult) + '...'
            : result.content;
          return `Source ${index + 1}:
URL: ${result.url}
Title: ${result.title}
Content: ${truncatedContent}
---`;
        })
        .join('\n\n');

      logger.info('WriterAgent: Making OpenAI API call', { 
        sourceContextLength: sourceContext.length,
        maxResults,
        model: 'gpt-4o-mini'
      });

      // Add explicit timeout for WriterAgent OpenAI call
      const completionPromise = this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an expert research analyst creating comprehensive, well-sourced articles with intelligent follow-up questions.

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
  "citations": ["url1", "url2", "url3", "url4", "url5"]
}

CONTENT GUIDELINES:
- Base ALL information directly on the provided sources
- Use [Source X] citations throughout to reference specific sources
- Include specific facts, dates, numbers, and quotes from the sources
- Structure with clear sections using ### headers
- Use **bold** for key terms and *italic* for emphasis
- Synthesize information from multiple sources when they discuss the same topic
- Present different viewpoints when sources conflict
- Maintain professional, informative tone
- Focus on the most current and relevant information from sources
- Do NOT add external knowledge not found in the provided sources

FOLLOW-UP QUESTIONS GUIDELINES:
- Generate 5 intelligent follow-up questions that naturally extend the topic
- Questions should explore deeper aspects, related implications, or practical applications
- Make questions specific and actionable based on the content discussed
- Focus on what readers would logically want to explore next
- Ensure questions build upon the information presented in the article

Example follow-up question styles:
- "What specific steps are being taken to address [challenge mentioned]?"
- "How are different industries adapting to [trend discussed]?"
- "What are the long-term implications of [development covered]?"
- "How can individuals/organizations benefit from [opportunity identified]?"
- "What challenges remain to be solved regarding [topic area]?"

CITATION REQUIREMENTS:
- Use [Source X] format consistently throughout
- Cite specific claims, statistics, quotes, and facts
- Include multiple citations when information comes from different sources
- Ensure every major point is properly attributed
- List the URLs of cited sources in the citations array`
              },
              {
                role: 'user',
                content: `Query: "${research.query}"

Source Material:
${sourceContext}

TASK: Create a comprehensive, well-sourced article that directly addresses the query using ONLY the information provided in the sources above.

Requirements:
- Ground ALL information in the provided sources
- Use [Source X] citations for every major claim or fact
- Include specific details, statistics, dates, and quotes from sources
- Structure with clear sections that organize the information logically
- Generate 5 thoughtful follow-up questions that extend the topic naturally
- Focus on the most current and relevant information available in the sources
- When sources conflict, present different perspectives clearly
- Synthesize related information from multiple sources when appropriate

Remember: Base your response entirely on the source material provided. Do not add external information.`
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 2000 // Increased for more comprehensive responses
          });

      // Add explicit timeout handling for WriterAgent
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('WriterAgent OpenAI call timeout after 30 seconds')), 30000)
      );

      const completion = await Promise.race([completionPromise, timeoutPromise]);

      logger.info('WriterAgent: OpenAI call completed', { 
        hasContent: !!completion.choices[0]?.message?.content 
      });

      const content = completion.choices[0]?.message?.content;
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
            `What specific developments are shaping ${research.query} today?`,
            `How are experts addressing challenges in ${research.query}?`,
            `What practical applications exist for ${research.query}?`,
            `What future trends are emerging in ${research.query}?`,
            `How can organizations leverage ${research.query} effectively?`
          ],
          citations: research.results.slice(0, 5).map((r: SearchResult) => r.url)
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
              `What specific developments are shaping ${research.query} today?`,
              `How are experts addressing challenges in ${research.query}?`,
              `What practical applications exist for ${research.query}?`,
              `What future trends are emerging in ${research.query}?`,
              `How can organizations leverage ${research.query} effectively?`
            ],
        citations: Array.isArray(parsed.citations) 
          ? parsed.citations 
          : research.results.slice(0, 5).map((r: SearchResult) => r.url)
      };

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('WriterAgent execution failed:', error);
      return {
        success: true,
        data: this.getFallbackData(research.query)
      };
    }
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
}
