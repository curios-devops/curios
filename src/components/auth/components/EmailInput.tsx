import React from 'react';

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function EmailInput({ 
  value, 
  onChange, 
  error, 
  disabled 
}: EmailInputProps) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="email"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your email"
          disabled={disabled}
          className={`
            w-full 
            bg-[#222222] 
            border 
            ${error ? 'border-red-500' : 'border-gray-700'} 
            rounded-lg 
            px-4 
            py-3.5 
            text-white 
            placeholder-gray-500 
            focus:outline-none 
            focus:border-[#007BFF] 
            transition-colors
            disabled:opacity-50
            disabled:cursor-not-allowed
          `}
        />
      </div>
      {error && (
        <p className="text-sm text-red-500 pl-1">{error}</p>
      )}
    </div>
  );
}