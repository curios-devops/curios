import { Artifact, ArtifactStep } from '../../../../../commonApp/types/index';

async function dalle3GenerateImage(prompt: string): Promise<string> {
  try {
    const res = await fetch('/api/openai/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'url',
      }),
    });
    if (!res.ok) {
      // Fallback to a placeholder image
      return 'https://placehold.co/512x512?text=No+Image';
    }
    const data = await res.json();
    const url = data?.data?.[0]?.url;
    return url || 'https://placehold.co/512x512?text=No+Image';
  } catch {
    return 'https://placehold.co/512x512?text=No+Image';
  }
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