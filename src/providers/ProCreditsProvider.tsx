// ProCreditsProvider — the global, single source of Pro Credit state.
//
// Resolves the user's tier once, holds the live credit state, and owns the
// modal routing for blocked access (reusing the existing register/upgrade
// modals + the new quota-exhausted modal). Every Pro Feature goes through
// `requestProAccess()`; no feature talks to the service or the modals directly.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSession } from '../hooks/useSession.ts';
import { useSubscription } from '../hooks/useSubscription.ts';
import {
  getUserTier,
  getCreditState,
  consumeCredit,
  maxCreditsFor,
  type ProTier,
  type CreditState,
  type BatteryLevel,
  type WarningState,
} from '../services/proCreditsService.ts';
import SignUpModal from '../components/auth/SignUpModal.tsx';
import ProModal from '../components/subscription/ProModal.tsx';
import QuotaExhaustedModal from '../components/subscription/QuotaExhaustedModal.tsx';

type BlockedModal = 'register' | 'upgrade' | 'quota' | null;

interface ProCreditsContextValue {
  tier: ProTier;
  remaining: number;
  max: number;
  battery: BatteryLevel;
  warning: WarningState;
  loading: boolean;
  canUseProFeature: boolean;
  /** Refresh the credit state from storage/DB (applies lazy reset). */
  refresh: () => void;
  /**
   * Single gate for Pro Features. If a credit is available it is consumed and
   * `true` is returned; otherwise the tier-appropriate modal opens and `false`
   * is returned. Never throws.
   */
  requestProAccess: () => Promise<boolean>;
}

const ProCreditsContext = createContext<ProCreditsContextValue | null>(null);

export function ProCreditsProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const { subscription, loading: subLoading } = useSubscription(session);
  const tier = getUserTier(session, subscription);

  const [state, setState] = useState<CreditState>(() => ({
    tier,
    remaining: maxCreditsFor(tier),
    max: maxCreditsFor(tier),
    battery: 'full',
    warning: 'none',
    canUse: true,
  }));
  const [loading, setLoading] = useState(true);
  const [blockedModal, setBlockedModal] = useState<BlockedModal>(null);

  // Guard against concurrent consume calls causing double-decrements.
  const consuming = useRef(false);

  const load = useCallback(async () => {
    // Wait until the subscription has resolved before reading/writing credits.
    // Otherwise a Pro user is briefly seen as 'free', and a daily reset firing
    // in that window would persist the free allowance under today's reset date,
    // pinning them to the free count until the next reset.
    if (subLoading) return;
    setLoading(true);
    const next = await getCreditState(tier, session);
    setState(next);
    setLoading(false);
  }, [tier, session, subLoading]);

  useEffect(() => {
    void load();
  }, [load]);

  const openBlockedModal = useCallback((t: ProTier) => {
    setBlockedModal(t === 'guest' ? 'register' : t === 'free' ? 'upgrade' : 'quota');
  }, []);

  const requestProAccess = useCallback(async (): Promise<boolean> => {
    if (consuming.current) return false;

    if (!state.canUse) {
      openBlockedModal(tier);
      return false;
    }

    consuming.current = true;
    try {
      const { ok, state: next } = await consumeCredit(tier, session, state.remaining);
      setState(next);
      if (!ok) {
        openBlockedModal(tier);
        return false;
      }
      return true;
    } finally {
      consuming.current = false;
    }
  }, [state.canUse, state.remaining, tier, session, openBlockedModal]);

  const value: ProCreditsContextValue = {
    tier,
    remaining: state.remaining,
    max: state.max,
    battery: state.battery,
    warning: state.warning,
    loading,
    canUseProFeature: state.canUse,
    refresh: () => void load(),
    requestProAccess,
  };

  const closeModal = () => setBlockedModal(null);

  return (
    <ProCreditsContext.Provider value={value}>
      {children}

      {/* Centralized modal routing — reuse existing modals, single open-state. */}
      {blockedModal === 'register' && (
        <SignUpModal isOpen onClose={closeModal} context="pro" />
      )}
      {blockedModal === 'upgrade' && (
        <ProModal isOpen onClose={closeModal} />
      )}
      {blockedModal === 'quota' && (
        <QuotaExhaustedModal isOpen onClose={closeModal} />
      )}
    </ProCreditsContext.Provider>
  );
}

export function useProCredits(): ProCreditsContextValue {
  const ctx = useContext(ProCreditsContext);
  if (!ctx) {
    throw new Error('useProCredits must be used within a ProCreditsProvider');
  }
  return ctx;
}
