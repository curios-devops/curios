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
      // Check if OpenAI is available
      if (!this.openai) {
        return {
          success: true,
          data: this.getFallbackData(research.query)
        };
      }

      // Prepare context by limiting and truncating research results for optimal performance
      const maxResults = 5; // Limit to 5 most relevant results
      const maxContentPerResult = 300; // Limit content length to reduce token usage
      
      const context = research.results
        .slice(0, maxResults) // Take only first 5 results
        .map((result: SearchResult, index: number) => {
          const truncatedContent = result.content.length > maxContentPerResult 
            ? result.content.slice(0, maxContentPerResult) + '...'
            : result.content;
          return `Source ${index + 1}: ${result.url}\nTitle: ${result.title}\nContent: ${truncatedContent}`;
        })
        .join('\n\n');

      const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an expert research assistant creating comprehensive, Perplexity-style answers with intelligent follow-up questions.

RESPONSE FORMAT - Return a JSON object with this exact structure:
{
  "content": "Your comprehensive answer here...",
  "followUpQuestions": [
    "Related question 1?",
    "Related question 2?",
    "Related question 3?",
    "Related question 4?",
    "Related question 5?"
  ]
}

CONTENT GUIDELINES:
- Write comprehensive, well-researched articles based on the provided sources
- Use inline citations with [Source X] format throughout the text
- Structure content with clear headers using markdown (### Header)
- Use **bold** and *italic* formatting for emphasis
- Include relevant details, statistics, and expert insights
- Maintain professional, informative tone
- Do NOT include a 'Citations' section at the end
- Do NOT include a 'Sources' section at the end
- Keep citations inline only using [Source X] format
- End the content with the main content, NOT with citations

FOLLOW-UP QUESTIONS GUIDELINES:
- Generate 5 intelligent, contextual follow-up questions based on the content and research topic
- Questions should explore different angles, deeper insights, or related aspects
- Make questions specific and actionable
- Focus on what users would naturally want to know next
- Ensure questions are relevant to the original topic but expand the conversation

Example follow-up questions format:
- "What are the latest developments in [specific aspect]?"
- "How does [topic] compare to [related topic]?"
- "What are the potential risks/benefits of [specific element]?"
- "How might [topic] evolve in the next 5 years?"
- "What do experts predict about [related trend]?"
1. Create a comprehensive overview synthesizing information from multiple sources
2. Structure with clear sections and headings 
3. Include specific details, numbers, and statistics
4. Always cite sources using [Source X] format throughout the content
5. Provide context and background information
6. Use professional, engaging writing style
7. Include relevant follow-up questions
8. Focus on unique insights beyond basic search results

IMPORTANT: 
- Do NOT include a "Citations" section at the end
- Do NOT include a "Sources" section at the end  
- Do NOT list the source URLs at the end
- Keep citations inline only using [Source X] format
- End the content with the main content, NOT with citations

Response format (valid JSON):
{
  "content": "Comprehensive article with [Source X] citations and clear sections - NO citations section at end",
  "followUpQuestions": ["Question 1", "Question 2", "Question 3"],
  "citations": ["URL1", "URL2", "URL3"]
}`
              },
              {
                role: 'user',
                content: `Query: "${research.query}"

Search Results:
${context}

Create a comprehensive answer that:
- Provides thorough overview with clear sections  
- Incorporates information with proper [Source X] citations
- Includes specific details and statistics
- Offers valuable insights beyond basic facts
- Addresses different perspectives and implications
- Generates 5 intelligent follow-up questions based on the topic`
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 1500
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
        // If JSON parsing fails, create a fallback response
        const fallbackResult: ArticleResult = {
          content: content.trim(),
          followUpQuestions: [
            `What are the latest developments in ${research.query}?`,
            `How does ${research.query} impact current trends?`,
            `What are the key challenges regarding ${research.query}?`,
            `What do experts predict about ${research.query}?`,
            `How might ${research.query} evolve in the future?`
          ],
          citations: research.results.slice(0, 5).map((r: SearchResult) => r.url)
        };
        return {
          success: true,
          data: fallbackResult
        };
      }

      // Ensure the parsed object has the expected structure
      const result: ArticleResult = {
        content: typeof parsed.content === 'string' ? parsed.content : content.trim(),
        followUpQuestions: Array.isArray(parsed.followUpQuestions) && parsed.followUpQuestions.length > 0 
          ? parsed.followUpQuestions 
          : [
              `What are the latest developments in ${research.query}?`,
              `How does ${research.query} impact current trends?`,
              `What are the key challenges regarding ${research.query}?`,
              `What do experts predict about ${research.query}?`,
              `How might ${research.query} evolve in the future?`
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
        `How can I get more detailed information about ${query}?`,
        `What are the latest trends in ${query}?`,
        `Where can I find expert analysis on ${query}?`,
        `What related topics should I explore regarding ${query}?`,
        `How does ${query} impact current events?`
      ],
      citations: []
    };
  }
}
