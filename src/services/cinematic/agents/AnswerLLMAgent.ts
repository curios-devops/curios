/**
 * Answer LLM Agent
 * Generates structured explanations for cinematic videos using GPT-4
 */

import OpenAI from 'openai';
import { StructuredExplanation, VideoCategory, CinematicEmotion } from '../types';

const CINEMATIC_MODEL = import.meta.env.VITE_CINEMATIC_MODEL || 'gpt-5-mini';

export class AnswerLLMAgent {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    });
  }

  /**
   * Generate structured explanation from user query
   */
  async generateExplanation(query: string): Promise<StructuredExplanation> {
    console.log('[AnswerLLM] Generating explanation for:', query);

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(query);

    try {
      const response = await this.client.chat.completions.create({
        model: CINEMATIC_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content returned from LLM');
      }

      const result = JSON.parse(content);
      const validated = this.validateExplanation(result);

      console.log('[AnswerLLM] Explanation generated:', validated.topic);
      return validated;
    } catch (error) {
      console.error('[AnswerLLM] Generation failed:', error);
      throw new Error(`Failed to generate explanation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build system prompt for LLM
   */
  private buildSystemPrompt(): string {
    return `You are a world-class educator who creates cinematic video explanations.

Your goal: Transform questions into compelling visual narratives with:
1. A strong hook (attention-grabbing opening)
2. Clear key points (2-3 main concepts)
3. A mind-blow moment (surprising insight)
4. A satisfying conclusion

Guidelines:
- Use conversational, accessible language (not academic)
- Each point should be 1-2 sentences max
- Include detailed visual hints for AI video generation (Sora)
- Assign emotional tone to each point
- Total duration: 20-30 seconds spoken
- Focus on ONE clear narrative arc

IMPORTANT: Visual hints should be specific, cinematic, and rich in detail.
Think: "What would look amazing as a video scene?"
Include camera angles, lighting, subjects, and mood.

Examples of good visual hints:
- "A majestic octopus swimming gracefully through a coral reef, sunlight filtering from above, slow motion"
- "Close-up of a human heart beating, with glowing blood vessels, dramatic lighting, medical visualization style"
- "An ancient pyramid at sunset, camera slowly zooming out to reveal the desert landscape, golden hour lighting"

Return JSON only, no additional text.`;
  }

  /**
   * Build user prompt for LLM
   */
  private buildUserPrompt(query: string): string {
    return `Create a cinematic explanation for: "${query}"

Return JSON in this exact format:
{
  "topic": "Clear, concise topic name",
  "category": "science|nature|history|culture|technology|space",
  "hook": "Attention-grabbing opening statement (1 sentence)",
  "keyPoints": [
    {
      "concept": "Main idea name",
      "explanation": "1-2 sentence explanation",
      "visualHint": "Detailed cinematic description for video generation (include camera, lighting, subject, motion, mood)",
      "emotion": "mystery|wonder|calm|excitement|clarity|curiosity"
    },
    {
      "concept": "Second main idea",
      "explanation": "1-2 sentence explanation",
      "visualHint": "Another detailed cinematic description",
      "emotion": "mystery|wonder|calm|excitement|clarity|curiosity"
    }
  ],
  "mindBlowMoment": "Surprising insight or fact (1 sentence that makes people say 'wow!')",
  "conclusion": "Satisfying closing statement (1 sentence)",
  "estimatedDuration": 25
}

IMPORTANT:
- keyPoints should have 2-3 items (not more)
- Each visualHint must be detailed and cinematic
- Ensure emotions vary across scenes for visual variety`;
  }

  /**
   * Validate and normalize explanation structure
   */
  private validateExplanation(data: any): StructuredExplanation {
    if (!data.topic || !data.hook || !data.keyPoints || !Array.isArray(data.keyPoints)) {
      throw new Error('Invalid explanation structure from LLM');
    }

    // Ensure we have 2-3 key points
    if (data.keyPoints.length < 2) {
      throw new Error('Not enough key points (need at least 2)');
    }

    if (data.keyPoints.length > 3) {
      // Trim to 3
      data.keyPoints = data.keyPoints.slice(0, 3);
    }

    // Validate each key point
    for (const point of data.keyPoints) {
      if (!point.concept || !point.explanation || !point.visualHint || !point.emotion) {
        throw new Error('Invalid key point structure');
      }

      // Ensure emotion is valid
      const validEmotions: CinematicEmotion[] = ['mystery', 'wonder', 'calm', 'excitement', 'clarity', 'curiosity'];
      if (!validEmotions.includes(point.emotion)) {
        point.emotion = 'curiosity'; // Default fallback
      }
    }

    // Ensure category is valid
    const validCategories: VideoCategory[] = ['science', 'nature', 'history', 'culture', 'technology', 'space'];
    if (!validCategories.includes(data.category)) {
      data.category = 'science'; // Default fallback
    }

    // Ensure duration is reasonable (20-30 seconds)
    if (data.estimatedDuration < 20 || data.estimatedDuration > 30) {
      data.estimatedDuration = 25;
    }

    // Ensure mind-blow moment exists
    if (!data.mindBlowMoment) {
      data.mindBlowMoment = data.keyPoints[data.keyPoints.length - 1].explanation;
    }

    // Ensure conclusion exists
    if (!data.conclusion) {
      data.conclusion = `And that's the fascinating story of ${data.topic}!`;
    }

    return data as StructuredExplanation;
  }
}
