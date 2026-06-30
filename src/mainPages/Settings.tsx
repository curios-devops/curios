import { useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { signOut } from '../lib/auth';
import GeneralSection from '../components/settings/GeneralSection';
import AccountSection from '../components/settings/AccountSection';
import { getUserDisplayName } from '../utils/userName';
import { X, Crown } from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();
  const { session } = useSession();
  const email = session?.user?.email || '';
  const username = getUserDisplayName(session?.user) ?? email.split('@')[0];

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
                      <p className="text-green-500 text-sm mt-1">Active</p>
                    </div>
                    <button
                      type="button"
                      className="transition-colors text-sm"
                      style={{ color: 'var(--accent-primary)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--accent-primary)'; }}
                    >
                      Manage
                    </button>
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
    </div>
  );
}
