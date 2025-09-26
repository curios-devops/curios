import { Artifact, ArtifactStep } from '../../../../../commonApp/types/index';

// --- Simplified formatting without external dependencies ---

async function formatContent(content: string, type: 'doc' | 'pdf'): Promise<string> {
  if (type === 'pdf') {
    // Return HTML that can be converted to PDF by the browser or a service
    return `<html><head><title>Formatted Document</title></head><body><pre>${content}</pre></body></html>`;
  }
  // For 'doc', just return the content wrapped in basic HTML
  return `<html><head><title>Formatted Document</title></head><body><pre>${content}</pre></body></html>`;
}

export async function formatterWorker(artifact: Artifact, _prompt: string, updateArtifact: (partial: Artifact) => void): Promise<Artifact> {
  updateArtifact({
    ...artifact,
    steps: artifact.steps.map(s => s.name === 'format' ? { ...s, status: 'in_progress' as ArtifactStep['status'] } : s)
  });

  // Only allow 'doc' or 'pdf' as type
  const formatType: 'doc' | 'pdf' = artifact.type === 'pdf' ? 'pdf' : 'doc';
  const formatted = await formatContent(artifact.content, formatType);

  const updatedArtifact = {
    ...artifact,
    content: formatted,
    steps: artifact.steps.map(s => s.name === 'format' ? { ...s, status: 'complete' as ArtifactStep['status'], result: formatted } : s)
  };
  updateArtifact(updatedArtifact);
  return updatedArtifact;
}