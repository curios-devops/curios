import { BaseAgent } from './baseAgent';
import { AgentResponse, ResearchResult, ArticleResult } from './types';
import { logger } from '../../utils/logger';

export class WriterAgent extends BaseAgent {
  constructor() {
    super(
      'Article Writer',
      'Generate comprehensive articles with citations based on research results'
    );
  }

  /**
   * Executes the article generation process.
   * @param research - The research data gathered by the Retriever/UI agents.
   * @returns An AgentResponse containing the generated article.
   */
  async execute(research: ResearchResult): Promise<AgentResponse> {
    try {
      // If no OpenAI client is configured or there are no research results,
      // immediately return fallback data.
      if (!this.openai || !research?.results?.length) {
        return {
          success: true,
          data: this.getFallbackData(research)
        };
      }

      // Generate the article using safeOpenAICall with a fallback.
      const article = await this.safeOpenAICall(
        async () => this.generateArticle(research),
        this.getFallbackData(research)
      );

      return {
        success: true,
        data: article
      };
    } catch (error) {
      logger.warn('WriterAgent error:', error);
      return {
        success: true,
        data: this.getFallbackData(research)
      };
    }
  }

  /**
   * Provides fallback article data if article generation fails.
   * If research results are available, a simple summary is generated.
   * @param research - The research results.
   * @returns An ArticleResult with fallback content.
   *
   * Note: Video information is intentionally omitted from the output for now.
   */
  protected getFallbackData(research?: ResearchResult): ArticleResult {
    if (research?.results?.length > 0) {
      const summary = research.results
        .slice(0, 3)
        .map(result => result.content.slice(0, 200))
        .join('\n\n');

      return {
        content: summary,
        followUpQuestions: [],
        citations: research.results.map(r => r.url)
      };
    }

    return {
      content: 'We apologize, but we are experiencing high traffic at the moment. Please try your search again in a few minutes.',
      followUpQuestions: [],
      citations: []
    };
  }

  /**
   * Generates an article using the OpenAI API based on the research results.
   * Prepares a prompt with context from the research and expects a JSON output.
   * @param research - The research results to base the article on.
   * @returns A Promise resolving to an ArticleResult.
   */
  private async generateArticle(research: ResearchResult): Promise<ArticleResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    // Prepare context by concatenating key details from research results.
    const context = research.results
      .map(result => `Source: ${result.url}\nTitle: ${result.title}\nContent: ${result.content}`)
      .join('\n\n');

    // Define the system prompt for article generation.
    const systemPrompt = `You are a professional writer tasked with creating a comprehensive article based on search results.
Your response must be a valid JSON object with the following structure:
{
  "content": "The main article text with citations",
  "followUpQuestions": ["Question 1", "Question 2", "Question 3"],
  "citations": ["URL1", "URL2", "URL3"]
}
Focus on accuracy and readability.
Always include citations to sources.
Keep the content concise but informative.`;

    // Define the user prompt with the query and research context.
    const userPrompt = `Query: ${research.query}\n\nSearch Results:\n${context}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
        max_tokens: 1000
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated');
      }

      // Validate that the content appears to be JSON.
      const trimmedContent = content.trim();
      if (!trimmedContent.startsWith('{') || !trimmedContent.endsWith('}')) {
        throw new Error('Invalid JSON structure');
      }

      // Parse the JSON content.
      let parsed;
      try {
        parsed = JSON.parse(trimmedContent);
      } catch (error) {
        logger.error('JSON parse error:', error);
        // Attempt to clean the content and re-parse.
        const cleanedContent = trimmedContent
          .replace(/\n/g, ' ')
          .replace(/\r/g, '')
          .replace(/\t/g, ' ')
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .trim();
        parsed = JSON.parse(`{"content":"${cleanedContent}","followUpQuestions":[],"citations":[]}`);
      }

      // Ensure the parsed object has the expected structure.
      return {
        content: typeof parsed.content === 'string' ? parsed.content : '',
        followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions : [],
        citations: Array.isArray(parsed.citations) ? parsed.citations : []
      };
    } catch (error) {
      logger.warn('Article generation error:', error);
      return this.getFallbackData(research);
    }
  }
}
