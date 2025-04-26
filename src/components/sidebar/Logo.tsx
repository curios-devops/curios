import { Compass } from 'lucide-react';

export default function Logo({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
      <Compass className="h-10 w-10 text-[#007BFF]" />
      {!isCollapsed && (
        <div className="flex items-center tracking-tight">
          <span className="text-gray-900 dark:text-white font-semibold text-2xl tracking-[-0.02em]">Curios</span>
          <span className="text-[#007BFF] font-semibold text-2xl tracking-[-0.02em]">AI</span>
        </div>
      )}
    </div>
  );
}