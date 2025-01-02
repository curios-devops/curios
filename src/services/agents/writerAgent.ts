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
      const article = await this.generateArticle(research);

      return {
        success: true,
        data: article
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  protected getFallbackData(): ArticleResult {
    return {
      content: 'We apologize, but we could not generate a detailed response at this time. Please try your search again.',
      followUpQuestions: [],
      citations: []
    };
  }

  private async generateArticle(research: ResearchResult): Promise<ArticleResult> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Generate a comprehensive article based on the provided research. 
            Return a valid JSON object with 'content', 'followUpQuestions', and 'citations' properties.
            Example format:
            {
              "content": "Detailed article text...",
              "followUpQuestions": ["Question 1?", "Question 2?"],
              "citations": ["Source 1", "Source 2"]
            }`
        },
        {
          role: 'user',
          content: JSON.stringify(research)
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    const parsed = await this.safeJsonParse(content);
    
    if (!parsed) {
      return this.getFallbackData();
    }

    return {
      content: parsed.content || '',
      followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions : [],
      citations: Array.isArray(parsed.citations) ? parsed.citations : []
    };
  }
}