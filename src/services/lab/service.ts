import { Artifact } from '../../commonApp/types/index.ts';
import { LabController } from './regular/agents/controller.ts';
import { handleSupabaseOperation } from '../../lib/supabase.ts';
import { logger } from '../../utils/logger.ts';

export class LabError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'LabError';
  }
}

interface LabOptions {
  type?: string;
  isPro?: boolean;
  onStatusUpdate?: (status: string) => void;
  onArtifactUpdate?: (partial: Partial<Artifact>) => void;
}

const labController = new LabController();

export async function generateArtifact(
  prompt: string,
  options: LabOptions = {}
): Promise<Artifact> {
  try {
    // Validate the prompt immediately
    if (!prompt.trim()) {
      throw new LabError('Artifact prompt cannot be empty');
    }

    const { type = 'doc', isPro = false, onStatusUpdate, onArtifactUpdate } = options;

    // Wrap the artifact generation with Supabase error handling
    return await handleSupabaseOperation(
      async () => {
        // Process the prompt using the lab controller
        const artifact = await labController.processPrompt(
          prompt,
          type,
          onStatusUpdate,
          onArtifactUpdate,
          isPro
        );
        
        logger.debug('Lab service received artifact from lab controller', {
          hasContent: !!artifact.content,
          stepsCount: artifact.steps?.length || 0,
          status: artifact.status,
          type: artifact.type,
          isPro
        });

        return artifact;
      },
      // Fallback artifact if the operation fails
      {
        id: Math.random().toString(36).substring(2, 10),
        title: prompt.slice(0, 50),
        type,
        content: 'We apologize, but we could not generate your artifact at this time. Please try again in a moment.',
        status: 'error' as const,
        steps: [],
        thinkingLog: ['Generation failed. Please try again.'],
        planDetails: []
      }
    );
  } catch (error) {
    logger.error('Lab generation error:', {
      error: error instanceof Error ? error.message : error,
      prompt,
      timestamp: new Date().toISOString(),
    });

    throw new LabError(
      "We're experiencing technical difficulties. Please try again in a moment.",
      error
    );
  }
}