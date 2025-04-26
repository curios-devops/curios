import React from 'react';
import { useTranslation } from '../../hooks/useTranslation.ts';

interface SearchTextAreaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isPro: boolean;
}

export default function SearchTextArea({ value, onChange, onKeyDown, isPro }: SearchTextAreaProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const { t } = useTranslation();

  return (
    <textarea
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={React.useCallback(() => setIsFocused(true), [])}
      onBlur={React.useCallback(() => setIsFocused(false), [])}
      placeholder={t('searchPlaceholder')}
      rows={2}
      className={`
        w-full 
        bg-gray-50 dark:bg-[#1a1a1a] 
        text-base 
        text-gray-900 dark:text-white 
        rounded-xl 
        px-4 
        py-3 
        pb-14
        h-[108px]
        resize-none 
        placeholder-gray-500
        outline-none
        transition-all
        duration-200
        ${isPro 
          ? `border-[#007BFF] ${isFocused ? 'border-2' : 'border'}` 
          : `border-gray-200 dark:border-gray-700 ${isFocused ? 'border-2' : 'border'} ${!isFocused && 'hover:border-gray-400 dark:hover:border-gray-600'}`
        }
      `}
      spellCheck={false}
      autoComplete="off"
    />
  );
}