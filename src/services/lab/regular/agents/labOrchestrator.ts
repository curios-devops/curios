// Updated orchestrator using the new LabController
import { generateArtifact } from '../../labService.ts';
import { Artifact } from '../../../../commonApp/types/index.ts';

// Compatibility wrapper that adapts the new service to the old interface
export async function orchestrateArtifact(
  userPrompt: string,
  updateArtifact: (partial: Partial<Artifact>) => void,
  type: string
): Promise<void> {
  try {
    await generateArtifact(userPrompt, {
      type,
      onArtifactUpdate: updateArtifact
    });
  } catch (error) {
    // Provide fallback artifact on error
    const fallbackArtifact: Artifact = {
      id: Math.random().toString(36).substring(2, 10),
      title: userPrompt.slice(0, 50),
      type,
      content: 'We apologize, but we could not generate your artifact at this time. Please try again in a moment.',
      status: 'error',
      steps: [],
      thinkingLog: ['Generation failed. Please try again.'],
      planDetails: []
    };
    updateArtifact(fallbackArtifact);
  }
}
