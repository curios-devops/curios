import { Artifact, ArtifactStep } from '../../../../../commonApp/types/index';

export async function gameWorker(
  artifact: Artifact,
  _prompt: string,
  updateArtifact: (partial: Partial<Artifact>) => void
): Promise<Artifact> {
  const newStep: ArtifactStep = { name: 'game', status: 'in_progress' };
  updateArtifact({
    ...artifact,
    steps: [...artifact.steps, newStep]
  });

  // Replace with real LLM call for production
  const gameCode = `
function MiniGame() {
  const [score, setScore] = React.useState(0);
  return (
    <div style={{padding: 40, textAlign: 'center'}}>
      <h2>Mini Clicker Game</h2>
      <button onClick={() => setScore(score + 1)} style={{fontSize: 24, padding: 20}}>Click me!</button>
      <div style={{marginTop: 20}}>Score: {score}</div>
    </div>
  );
}
MiniGame;
  `.trim();

  const updated = {
    ...artifact,
    gameCode,
    steps: artifact.steps
      .map((s: ArtifactStep) => s.name === 'game' ? { ...s, status: 'complete' as const } : s)
  };
  updateArtifact(updated);
  return updated;
} 