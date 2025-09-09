import { Artifact, ArtifactStep } from '../../types/artifact';

// --- Real PDF formatting tool integration ---
// Replace with your real PDF formatting logic or API
import { PDFDocument } from 'pdf-lib';

async function realFormatToDocOrPdf(content: string, type: 'doc' | 'pdf'): Promise<string> {
  if (type === 'pdf') {
    // Use pdf-lib to create a simple PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    page.drawText(content, { x: 50, y: 700, size: 12 });
    const pdfBytes = await pdfDoc.save();
    // Return as base64 for now (could be a file download in real app)
    return `data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`;
  }
  // For 'doc', just return the content (could use docx library)
  return content;
}

export async function formatterWorker(artifact: Artifact, _prompt: string, updateArtifact: (partial: Artifact) => void): Promise<Artifact> {
  updateArtifact({
    ...artifact,
    steps: artifact.steps.map(s => s.name === 'format' ? { ...s, status: 'in_progress' as ArtifactStep['status'] } : s)
  });

  // Only allow 'doc' or 'pdf' as type
  const formatType: 'doc' | 'pdf' = artifact.type === 'pdf' ? 'pdf' : 'doc';
  const formatted = await realFormatToDocOrPdf(artifact.content, formatType);

  const updatedArtifact = {
    ...artifact,
    content: formatted,
    steps: artifact.steps.map(s => s.name === 'format' ? { ...s, status: 'complete' as ArtifactStep['status'], result: formatted } : s)
  };
  updateArtifact(updatedArtifact);
  return updatedArtifact;
} 