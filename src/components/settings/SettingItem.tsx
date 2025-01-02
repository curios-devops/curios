import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SettingItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action: React.ReactNode;
}

export default function SettingItem({ icon: Icon, title, description, action }: SettingItemProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-gray-800/50">
      <div className="flex items-start gap-4">
        <Icon className="text-[#007BFF] mt-1" size={20} />
        <div>
          <h3 className="text-white font-medium mb-1">{title}</h3>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
      </div>
      <div>{action}</div>
    </div>
  );
}