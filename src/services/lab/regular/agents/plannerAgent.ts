import { AgentResponse } from '../../../../commonApp/types/index.ts';
import { logger } from '../../../../utils/logger.ts';

interface PlanDetail {
  step: string;
  detail: string;
}

interface PlanResponse {
  planDetails: PlanDetail[];
}

export class LabPlannerAgent {
  constructor() {}

  async execute(prompt: string, type: string): Promise<AgentResponse<PlanResponse>> {
    try {
      logger.info('PlannerAgent: Creating execution plan', { prompt, type });

      // Use environment variable for OpenAI API endpoint, fallback to hardcoded URL
      const supabaseEdgeUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENAI_API_URL)
        ? import.meta.env.VITE_OPENAI_API_URL
        : 'VITE_OPENAI_API_URL';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseAnonKey) {
        throw new Error('Supabase anon key not found in environment variables');
      }

      const systemPrompt = 'You are an expert workflow planner for a multi-agent AI system. Given a user request, break it down into a list of clear, actionable subtasks for agents (e.g., researcher, writer, formatter). For each subtask, provide a short, context-aware detail/explanation. Respond only with a JSON object: {"planDetails": [{"step": string, "detail": string}]}, where step is the main subtask and detail is a short explanation. The steps and details should be user-friendly, actionable, and in the same language as the user request.';
      const userPrompt = `User request: ${prompt}\nArtifact type: ${type}`;

      const response = await fetch(supabaseEdgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          prompt: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ]
          })
        })
      });

      if (!response.ok) {
        throw new Error(`Planning request failed: ${response.status}`);
      }

      const data = await response.json();
      let planResult: PlanResponse | null = null;
      try {
        planResult = typeof data.text === 'string' ? JSON.parse(data.text) : null;
      } catch (e) {
        logger.warn('PlannerAgent: Failed to parse plan response as JSON', { error: e, textPreview: String(data.text).slice(0, 100) });
      }
      if (planResult && Array.isArray(planResult.planDetails)) {
        logger.info('PlannerAgent: Plan created successfully', { stepsCount: planResult.planDetails.length });
        return { success: true, data: planResult };
      }

      // Fallback plan
      const fallbackPlan = this.createFallbackPlan(prompt, type);
      logger.info('PlannerAgent: Using fallback plan');
      return {
        success: true,
        data: { planDetails: fallbackPlan }
      };
    } catch (error) {
      logger.error('PlannerAgent: Planning failed', { error: error instanceof Error ? error.message : error });
      const fallbackPlan = this.createFallbackPlan(prompt, type);
      return {
        success: true,
        data: { planDetails: fallbackPlan }
      };
    }
  }

  private createFallbackPlan(prompt: string, type: string): PlanDetail[] {
    switch (type) {
      case 'doc':
      case 'biography':
        return [
          { 
            step: `Research information about: ${prompt}`, 
            detail: 'Gather relevant and up-to-date information from reliable sources.' 
          },
          { 
            step: `Write the ${type} about: ${prompt}`, 
            detail: 'Create well-structured content in Markdown format with clear sections.' 
          },
          { 
            step: 'Finalize and format', 
            detail: 'Review and polish the final document for delivery.' 
          }
        ];
      case 'diagram':
      case 'sketch':
      case 'photo':
        return [
          { 
            step: `Plan the ${type} for: ${prompt}`, 
            detail: 'Define the visual concept and composition.' 
          },
          { 
            step: `Generate the ${type}`, 
            detail: 'Create the visual content using AI image generation.' 
          }
        ];
      default:
        return [
          { 
            step: `Analyze the request: ${prompt}`, 
            detail: 'Understand the requirements and scope of work.' 
          },
          { 
            step: `Create content for: ${prompt}`, 
            detail: 'Generate the requested content with appropriate formatting.' 
          },
          { 
            step: 'Review and deliver', 
            detail: 'Finalize and present the completed work.' 
          }
        ];
    }
  }
}