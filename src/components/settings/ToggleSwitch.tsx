import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <div className="relative inline-block w-11 h-6">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className={`
        w-11 h-6 
        bg-[#222222] 
        peer-checked:bg-[#007BFF] 
        rounded-full 
        peer 
        peer-checked:after:translate-x-full 
        after:content-[''] 
        after:absolute 
        after:top-0.5 
        after:left-[2px] 
        after:bg-white 
        after:rounded-full 
        after:h-5 
        after:w-5 
        after:transition-all
        cursor-pointer
      `} />
    </div>
  );
}