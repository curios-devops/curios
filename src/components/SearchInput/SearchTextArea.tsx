import React from 'react';

interface SearchTextAreaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isPro: boolean;
}

export default function SearchTextArea({ value, onChange, onKeyDown, isPro }: SearchTextAreaProps) {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <textarea
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      placeholder="Ask anything..."
      rows={2}
      className={`
        w-full 
        bg-[#1a1a1a] 
        text-base 
        text-white 
        rounded-xl 
        p-4 
        pb-14
        h-[108px]
        resize-none 
        placeholder-gray-500
        outline-none
        transition-all
        duration-200
        ${isPro 
          ? `border-[#007BFF] ${isFocused ? 'border-2' : 'border'}` 
          : `border-gray-700 ${isFocused ? 'border-2' : 'border'}`
        }
        ${!isPro && !isFocused && 'hover:border-gray-600'}
      `}
    />
  );
}