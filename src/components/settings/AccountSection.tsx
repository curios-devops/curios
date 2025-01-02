import React from 'react';
import { User, Mail, Database, LogOut } from 'lucide-react';
import ToggleSwitch from './ToggleSwitch';

interface AccountSectionProps {
  username: string;
  email: string;
  onSignOut: () => void;
}

export default function AccountSection({ username, email, onSignOut }: AccountSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium text-white">Account</h2>
      <div className="bg-[#111111] rounded-xl border border-gray-800">
        <div className="divide-y divide-gray-800/50 mx-6">
          {/* Username */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Username</h3>
                <p className="text-gray-400 text-sm mt-1">{username}</p>
              </div>
              <button className="text-[#007BFF] hover:text-[#0056b3] transition-colors text-sm">
                Edit
              </button>
            </div>
          </div>

          {/* Email */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Email</h3>
                <p className="text-gray-400 text-sm mt-1">{email}</p>
              </div>
              <button className="text-[#007BFF] hover:text-[#0056b3] transition-colors text-sm">
                Edit
              </button>
            </div>
          </div>

          {/* AI Data Retention */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">AI Data Retention</h3>
                <p className="text-gray-400 text-sm mt-1">AI Data Retention allows CuriosAI to use your searches to improve AI models</p>
              </div>
              <ToggleSwitch checked={true} onChange={() => {}} />
            </div>
          </div>

          {/* Sign Out */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Sign out</h3>
                <p className="text-gray-400 text-sm mt-1">Sign out of your account</p>
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