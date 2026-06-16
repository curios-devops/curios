import React, { useRef, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation.ts';
import type { ModeType } from './ModeSelector.tsx';

interface SearchTextAreaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  className?: string;
  mode?: ModeType;
}

// Get placeholder based on mode
const getPlaceholderKey = (mode: ModeType): string => {
  switch (mode) {
    case 'search':
      return 'placeholderSearch';
    case 'stories':
      return 'placeholderStories';
    case 'cinematic':
      return 'placeholderCinematic';
    case 'movie':
      return 'placeholderMovie';
    case 'avatar':
      return 'placeholderAvatar';
    default:
      return 'placeholderSearch';
  }
};

export default function SearchTextArea({ value, onChange, onKeyDown, className, mode = 'search' }: SearchTextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();
  const placeholderKey = getPlaceholderKey(mode);

  // Auto-resize functionality
  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to calculate new scroll height
      textarea.style.height = 'auto';
      
      // Calculate new height with min and max constraints - more compact like Perplexity
      const minHeight = 48; // Minimum height for 2 lines (shorter like Perplexity)
      const maxHeight = 120; // Maximum height before scrolling (more compact)
      const scrollHeight = textarea.scrollHeight;
      
      // Set height to content height, but within min/max bounds
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
      
      // Enable scrolling if content exceeds max height
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, []);

  // Adjust height when value changes
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Adjust height on initial render
  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e);
    // Height will be adjusted by the useEffect above
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      placeholder={t(placeholderKey)}
      rows={2}
      className={`
        w-full 
        bg-transparent
        text-sm 
        ui-search-textarea
        px-3 
        py-3
        min-h-[48px]
        resize-none 
        outline-none
        border-none
        overflow-hidden
      ${className ? ` ${className}` : ''}`}
      style={{
        color: 'var(--ui-text-primary)',
      }}
      spellCheck={false}
      autoComplete="off"
    />
  );
}