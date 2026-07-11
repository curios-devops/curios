import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useSubscription } from '../hooks/useSubscription';
import { cancelSubscription } from '../commonApp/stripe/api';
import { signOut } from '../lib/auth';
import GeneralSection from '../components/settings/GeneralSection';
import AccountSection from '../components/settings/AccountSection';
import { getUserDisplayName } from '../utils/userName';
import { X, Crown } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { session } = useSession();
  const { subscription, loading: subscriptionLoading } = useSubscription(session);
  const email = session?.user?.email || '';
  const username = getUserDisplayName(session?.user) ?? email.split('@')[0];

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [justCanceled, setJustCanceled] = useState(false);

  const isPastDue = !justCanceled && subscription?.status === 'past_due';
  const isSubscribed = !justCanceled && (subscription?.isActive || isPastDue);

  const subscriptionLabel = subscriptionLoading
    ? 'Checking…'
    : justCanceled
      ? 'Canceled — you are now on the free plan'
      : subscription?.isActive
        ? 'Active'
        : isPastDue
          ? 'Payment issue — your card didn’t go through'
          : 'Free plan';

  const subscriptionLabelColor = subscription?.isActive && !justCanceled
    ? 'text-green-500'
    : isPastDue
      ? 'text-amber-500'
      : '';

  const handleConfirmCancel = async () => {
    setCanceling(true);
    setCancelError(null);
    try {
      await cancelSubscription();
      setJustCanceled(true);
      setShowCancelConfirm(false);
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : 'Failed to cancel subscription');
    } finally {
      setCanceling(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--ui-bg-primary)' }}>
      <header
        className="border-b px-6 py-4"
        style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)' }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-medium" style={{ color: 'var(--ui-text-primary)' }}>Settings</h1>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="transition-colors p-2 rounded-lg"
            style={{ color: 'var(--ui-text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--ui-text-primary)';
              e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--ui-text-muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-12">
          {/* General Section */}
          <GeneralSection />

          {/* Pro Features Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-medium" style={{ color: 'var(--ui-text-primary)' }}>CuriosAI</h2>
              <Crown size={20} style={{ color: 'var(--accent-primary)' }} aria-label="Pro" />
            </div>
            <div
              className="rounded-xl border"
              style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)' }}
            >
              <div className="divide-y mx-6" style={{ borderColor: 'var(--ui-border-subtle)' }}>
                <div className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>Subscription</h3>
                      <p
                        className={`text-sm mt-1 ${subscriptionLabelColor}`}
                        style={subscriptionLabelColor ? undefined : { color: 'var(--ui-text-secondary)' }}
                      >
                        {subscriptionLabel}
                      </p>
                      {cancelError && !showCancelConfirm && (
                        <p className="text-red-500 text-sm mt-1">{cancelError}</p>
                      )}
                    </div>
                    {isSubscribed && (
                      <button
                        type="button"
                        onClick={() => { setCancelError(null); setShowCancelConfirm(true); }}
                        className="transition-colors text-sm"
                        style={{ color: 'var(--accent-primary)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--accent-primary)'; }}
                      >
                        Cancel subscription
                      </button>
                    )}
                  </div>
                </div>
                <div className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>AI Model</h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--ui-text-secondary)' }}>gpt-5o-mini</p>
                    </div>
                    <button
                      type="button"
                      className="transition-colors text-sm"
                      style={{ color: 'var(--accent-primary)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--accent-primary)'; }}
                    >
                      Change
                    </button>
                  </div>
                </div>
                <div className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>Image Generation Model</h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--ui-text-secondary)' }}>GPT Image 2 (gpt-image-2)</p>
                    </div>
                    <button
                      type="button"
                      className="transition-colors text-sm"
                      style={{ color: 'var(--accent-primary)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--accent-primary)'; }}
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Section */}
          <AccountSection
            username={username}
            email={email}
            onSignOut={handleSignOut}
          />
        </div>
      </main>

      {/* Cancel subscription confirmation dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            className="w-full max-w-md p-6 rounded-2xl border"
            style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)' }}
          >
            <h3 className="text-lg font-medium" style={{ color: 'var(--ui-text-primary)' }}>
              Cancel subscription?
            </h3>
            <p className="text-sm mt-2" style={{ color: 'var(--ui-text-secondary)' }}>
              Your Premium subscription will be canceled immediately and your account will
              switch to the free plan (3 Pro credits per day). You won’t be charged again.
            </p>
            {cancelError && <p className="text-red-500 text-sm mt-2">{cancelError}</p>}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                disabled={canceling}
                className="text-sm px-4 py-2 rounded-lg transition-colors"
                style={{ color: 'var(--ui-text-secondary)' }}
              >
                Keep subscription
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={canceling}
                className="text-sm px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60"
              >
                {canceling ? 'Canceling…' : 'Yes, cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
