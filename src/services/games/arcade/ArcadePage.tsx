// Shared Curios Arcade game (/arcade/:id): plays the stored game — no generation, no credit.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ArcadeScreen from './ArcadeScreen.tsx';
import { fetchArcadeGame, type ArcadeGame } from './arcadeService.ts';

export default function ArcadePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<ArcadeGame | null>(null);
  const [status, setStatus] = useState<'creating' | 'ready' | 'error'>('creating');

  useEffect(() => {
    let cancelled = false;
    void fetchArcadeGame(id).then((g) => {
      if (cancelled) return;
      setGame(g);
      setStatus(g ? 'ready' : 'error');
    });
    return () => { cancelled = true; };
  }, [id]);

  // Closing goes to the inspiration's fact sheet (where you can make your own game).
  const close = () => navigate(game?.inspiredBy ? `/games-results?q=${encodeURIComponent(game.inspiredBy)}` : '/');

  return <ArcadeScreen game={game} status={status} onClose={close} onError={() => setStatus('error')} />;
}
