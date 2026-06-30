import ToggleSwitch from './ToggleSwitch';

interface AccountSectionProps {
  username: string;
  email: string;
  onSignOut: () => void;
}

export default function AccountSection({ username, email, onSignOut }: AccountSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium" style={{ color: 'var(--ui-text-primary)' }}>Account</h2>
      <div className="rounded-xl border" style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)' }}>
        <div className="divide-y mx-6" style={{ borderColor: 'var(--ui-border-subtle)' }}>
          {/* Username */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>Username</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--ui-text-secondary)' }}>{username}</p>
              </div>
              <button
                className="transition-colors text-sm"
                style={{ color: 'var(--accent-primary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--accent-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--accent-primary)';
                }}
              >
                Edit
              </button>
            </div>
          </div>

          {/* Email */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>Email</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--ui-text-secondary)' }}>{email}</p>
              </div>
              <button
                className="transition-colors text-sm"
                style={{ color: 'var(--accent-primary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--accent-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--accent-primary)';
                }}
              >
                Edit
              </button>
            </div>
          </div>

          {/* AI Data Retention */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>AI Data Retention</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--ui-text-secondary)' }}>AI Data Retention allows CuriosAI to use your searches to improve AI models</p>
              </div>
              <ToggleSwitch checked={true} onChange={() => {}} />
            </div>
          </div>

          {/* Sign Out */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium" style={{ color: 'var(--ui-text-primary)' }}>Sign out</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--ui-text-secondary)' }}>Sign out of your account</p>
              </div>
              <button 
                onClick={onSignOut}
                className="text-red-500 hover:text-red-400 transition-colors text-sm"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}