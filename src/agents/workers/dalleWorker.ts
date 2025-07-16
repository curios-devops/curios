import { Artifact, ArtifactStep } from '../../types/artifact';

let openai: any = null;
try {
  openai = require('openai');
} catch (e) {}

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

async function dalle3GenerateImage(prompt: string): Promise<string> {
  if (!openai || !OPENAI_API_KEY) {
    // Fallback to a placeholder image
    return 'https://placehold.co/512x512?text=No+Image';
  }
  const client = new openai({ apiKey: OPENAI_API_KEY });
  const response = await client.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    response_format: 'url',
  });
  if (response && response.data && response.data[0] && response.data[0].url) {
    return response.data[0].url;
  }
  return 'https://placehold.co/512x512?text=No+Image';
}

export async function dalleWorker(artifact: Artifact, prompt: string, updateArtifact: (partial: Partial<Artifact>) => void): Promise<Artifact> {
  updateArtifact({
    ...artifact,
    steps: artifact.steps.concat({ name: 'draw', status: 'in_progress' as ArtifactStep['status'] })
  });

  const imageUrl = await dalle3GenerateImage(prompt);

  const updatedArtifact = {
    ...artifact,
    steps: artifact.steps.map(s =>
      s.name === 'draw'
        ? { ...s, status: 'complete' as ArtifactStep['status'], result: imageUrl }
        : s
    ),
    image: imageUrl,
  };
  updateArtifact(updatedArtifact);
  return updatedArtifact;
} 