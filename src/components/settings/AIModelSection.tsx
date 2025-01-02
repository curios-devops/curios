import React from 'react';
import { Sparkles } from 'lucide-react';
import SettingItem from './SettingItem';

interface AIModelProps {
  currentModel: string;
  onModelChange: (model: string) => void;
}

export default function AIModelSection({ currentModel, onModelChange }: AIModelProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium text-white">AI Model</h2>
      <div className="bg-[#111111] rounded-xl border border-gray-800">
        <div className="px-6 py-6 space-y-6">
          <div className="flex items-center gap-2">
            <h3 className="text-white text-lg">Default Model</h3>
            <span className="bg-[#00B4D8] text-xs text-white px-2 py-0.5 rounded">NEW</span>
          </div>
          <p className="text-gray-400 text-sm">Now includes Claude 3.5, GPT-4o, and Sonar</p>
          
          <div className="space-y-3">
            <ModelOption
              label="Default"
              isSelected={currentModel === 'default'}
              onClick={() => onModelChange('default')}
            />
            <ModelOption
              label="Claude 3.5"
              isSelected={currentModel === 'claude'}
              onClick={() => onModelChange('claude')}
            />
            <ModelOption
              label="GPT-4"
              isSelected={currentModel === 'gpt4'}
              onClick={() => onModelChange('gpt4')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ModelOptionProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

function ModelOption({ label, isSelected, onClick }: ModelOptionProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full px-4 py-2.5 rounded-lg flex items-center justify-between
        ${isSelected 
          ? 'bg-[#007BFF] text-white' 
          : 'bg-[#222222] text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
        }
        transition-colors
      `}
    >
      <span>{label}</span>
      {isSelected && <Sparkles size={16} />}
    </button>
  );
}