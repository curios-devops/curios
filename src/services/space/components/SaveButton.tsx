// Compact save/bookmark toggle for a curiosity node. Designed to sit inline in
// the DynamicShareRow `trailing` slot so it costs no extra vertical space.

import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { useSession } from '../../../hooks/useSession';
import { supabase } from '../../../lib/supabase';
import { toggleNodeSave } from '../nodePersistenceService';

export default function SaveButton({ nodeId }: { nodeId: string }) {
  const { session } = useSession();
  const userId = session?.user?.id;
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Reflect existing saved state on mount.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    supabase
      .from('node_saves')
      .select('node_id')
      .eq('user_id', userId)
      .eq('node_id', nodeId)
      .maybeSingle()
      .then(({ data }) => { if (active) setSaved(!!data); });
    return () => { active = false; };
  }, [userId, nodeId]);

  const handleClick = async () => {
    if (!userId || busy) return;
    setBusy(true);
    setSaved((s) => !s); // optimistic
    try {
      const next = await toggleNodeSave(nodeId, userId);
      setSaved(next);
    } catch {
      setSaved((s) => !s); // revert on error
    } finally {
      setBusy(false);
    }
  };

  if (!userId) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={saved ? 'Saved' : 'Save'}
      title={saved ? 'Saved to Library' : 'Save to Library'}
      className="h-9 w-9 inline-flex items-center justify-center rounded-lg bg-gray-100 dark:bg-[#222222] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-900 dark:text-white transition-colors"
    >
      <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}
