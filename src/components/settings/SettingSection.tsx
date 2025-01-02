import React from 'react';

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

export default function SettingSection({ title, children }: SettingSectionProps) {
  return (
    <section className="bg-[#111111] rounded-xl border border-gray-800 overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-medium text-white mb-6">{title}</h2>
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </section>
  );
}