import React, { InputHTMLAttributes } from 'react';

interface CleanInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export default function CleanInput({ className = '', ...props }: CleanInputProps) {
  return (
    <input
      {...props}
      className={`
        w-full
        h-12
        bg-[#1a1a1a]
        text-white
        text-base
        rounded-lg
        px-4
        border
        border-gray-700
        placeholder-gray-500
        focus:outline-none
        focus:border-[#00B4D8]
        focus:ring-1
        focus:ring-[#00B4D8]
        transition-colors
        duration-200
        ${className}
      `}
    />
  );
}