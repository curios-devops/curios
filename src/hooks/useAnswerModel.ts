import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProCredits } from '../providers/ProCreditsProvider.tsx';
import { decideTier, pickAnswerModel, type AnswerModel } from '../services/auto/modelTier.ts';

/**
 * Picks the answer model for this page's question (Luna / Sol / Astra).
 * Lazy: nothing is rated or charged until the page calls `getModel()` — so loading a saved
 * result never spends an Astra credit. Memoized per question, and waits for credits to load.
 * `?tier=astra` (set by the notice's "Continue with Astra") forces Astra, spending a credit.
 */
export function useAnswerModel(query: string) {
  const [searchParams] = useSearchParams();
  const { loading, tryConsumeCredit } = useProCredits();
  const forced = searchParams.get('tier') === 'astra';
  const [answerModel, setAnswerModel] = useState<AnswerModel | null>(null);

  // Credits must be loaded before deciding whether Astra is affordable.
  const creditsReady = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);
  if (!creditsReady.current) {
    let resolve!: () => void;
    creditsReady.current = { promise: new Promise<void>((r) => { resolve = r; }), resolve };
  }
  useEffect(() => {
    if (!loading) creditsReady.current!.resolve();
  }, [loading]);

  // Always call the latest tryConsumeCredit (its closure holds the loaded credit count).
  const tryRef = useRef(tryConsumeCredit);
  tryRef.current = tryConsumeCredit;

  const cache = useRef<{ key: string; promise: Promise<AnswerModel> } | null>(null);

  const getModel = (): Promise<AnswerModel> => {
    const key = `${query.trim()}|${forced}`;
    if (cache.current?.key === key) return cache.current.promise;
    const promise = (async () => {
      await creditsReady.current!.promise;
      const tier = forced ? 'complex' : await decideTier(query);
      const picked = await pickAnswerModel(tier, () => tryRef.current());
      setAnswerModel(picked);
      return picked;
    })();
    cache.current = { key, promise };
    return promise;
  };

  // "Continue with Astra" — full reload with Astra forced, so every mode reruns its question.
  const continueWithAstra = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('tier', 'astra');
    window.location.assign(url.toString());
  };

  return { getModel, answerModel, continueWithAstra };
}
