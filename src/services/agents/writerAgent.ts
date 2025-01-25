import { BaseAgent } from './baseAgent';
import { AgentResponse, ResearchResult, ArticleResult } from './types';

export class WriterAgent extends BaseAgent {
  constructor() {
    super(
      'Article Writer',
      'Generate comprehensive articles with citations based on research results'
    );
  }

  async execute(research: ResearchResult): Promise<AgentResponse> {
    try {
      // If no OpenAI client or no research results, use fallback
      if (!this.openai || !research?.results?.length) {
        return {
          success: true,
          data: this.getFallbackData(research)
        };
      }

      // Try to generate article with OpenAI
      const article = await this.safeOpenAICall(
        async () => this.generateArticle(research),
        this.getFallbackData(research)
      );

      return {
        success: true,
        data: article
      };
    } catch (error) {
      console.warn('WriterAgent error:', error);
      return {
        success: true,
        data: this.getFallbackData(research)
      };
    }
  }

  protected getFallbackData(research?: ResearchResult): ArticleResult {
    // Generate a simple summary from research results if available
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

  private async generateArticle(research: ResearchResult): Promise<ArticleResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    // Prepare the research data for the prompt
    const context = research.results
      .map(result => `Source: ${result.url}\nTitle: ${result.title}\nContent: ${result.content}`)
      .join('\n\n');

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

      // Validate JSON structure before parsing
      if (!content.trim().startsWith('{') || !content.trim().endsWith('}')) {
        throw new Error('Invalid JSON structure');
      }

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (error) {
        console.error('JSON parse error:', error);
        // Try to clean the content before parsing again
        const cleanedContent = content
          .replace(/\n/g, ' ')
          .replace(/\r/g, '')
          .replace(/\t/g, ' ')
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .trim();
        parsed = JSON.parse(`{"content":"${cleanedContent}","followUpQuestions":[],"citations":[]}`);
      }

      // Validate parsed data structure
      return {
        content: typeof parsed.content === 'string' ? parsed.content : '',
        followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions : [],
        citations: Array.isArray(parsed.citations) ? parsed.citations : []
      };
    } catch (error) {
      console.warn('Article generation error:', error);
      return this.getFallbackData(research);
    }
  }
}