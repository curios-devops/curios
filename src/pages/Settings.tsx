import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useSubscription } from '../hooks/useSubscription';
import { signOut } from '../lib/auth';
import GeneralSection from '../components/settings/GeneralSection';
import AccountSection from '../components/settings/AccountSection';

export default function Settings() {
  const navigate = useNavigate();
  const { session } = useSession();
  const { subscription } = useSubscription();
  const email = session?.user?.email || '';
  const username = email.split('@')[0];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-black">
      <header className="bg-[#111111] border-b border-gray-800 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-medium text-white">Settings</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-12">
          {/* General Section */}
          <GeneralSection />

          {/* Pro Features Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-medium text-white">CuriosAI</h2>
              <span className="bg-[#007BFF] text-xs text-white px-2 py-0.5 rounded">Pro</span>
            </div>
            <div className="bg-[#111111] rounded-xl border border-gray-800">
              <div className="divide-y divide-gray-800/50 mx-6">
                <div className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Subscription</h3>
                      <p className="text-green-500 text-sm mt-1">Active</p>
                    </div>
                    <button className="text-[#007BFF] hover:text-[#0056b3] transition-colors text-sm">
                      Manage
                    </button>
                  </div>
                </div>
                <div className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">AI Model</h3>
                      <p className="text-gray-400 text-sm mt-1">GPT-4o</p>
                    </div>
                    <button className="text-[#007BFF] hover:text-[#0056b3] transition-colors text-sm">
                      Change
                    </button>
                  </div>
                </div>
                <div className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Image Generation Model</h3>
                      <p className="text-gray-400 text-sm mt-1">Dall-e</p>
                    </div>
                    <button className="text-[#007BFF] hover:text-[#0056b3] transition-colors text-sm">
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