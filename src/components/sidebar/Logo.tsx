import React from 'react';
import { Compass } from 'lucide-react';

export default function Logo({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
      <Compass className="h-10 w-10 text-[#007BFF]" />
      {!isCollapsed && (
        <div className="flex items-center tracking-tight">
          <span className="text-white font-semibold text-2xl">Curios</span>
          <span className="text-[#007BFF] font-semibold text-2xl">AI</span>
        </div>
      )}
    </div>
  );
}