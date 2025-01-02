import React from 'react';
import { Globe2, Cookie } from 'lucide-react';
import ToggleSwitch from './ToggleSwitch';

export default function GeneralSection() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium text-white">General</h2>
      <div className="bg-[#111111] rounded-xl border border-gray-800">
        <div className="divide-y divide-gray-800/50 mx-6">
          {/* Appearance */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Appearance</h3>
                <p className="text-gray-400 text-sm mt-1">How CuriosAI looks on your device</p>
              </div>
              <button className="bg-[#222222] text-white px-4 py-2 rounded-lg hover:bg-[#2a2a2a] transition-colors">
                Dark
              </button>
            </div>
          </div>

          {/* Language */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Language</h3>
                <p className="text-gray-400 text-sm mt-1">The language used in the user interface</p>
              </div>
              <button className="bg-[#222222] text-white px-4 py-2 rounded-lg hover:bg-[#2a2a2a] transition-colors">
                English
              </button>
            </div>
          </div>

          {/* Cookies */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Cookies</h3>
                <p className="text-gray-400 text-sm mt-1">Manage cookie preferences</p>
              </div>
              <button className="bg-[#222222] text-white px-4 py-2 rounded-lg hover:bg-[#2a2a2a] transition-colors">
                All
              </button>
            </div>
          </div>

          {/* Auto-suggest */}
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">Auto-suggest</h3>
                <p className="text-gray-400 text-sm mt-1">Enable dropdown and tab-complete suggestions while typing a query</p>
              </div>
              <ToggleSwitch checked={true} onChange={() => {}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}