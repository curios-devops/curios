import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation.ts';
import type { ModeType } from './ModeSelector.tsx';

interface SearchTextAreaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
  mode?: ModeType;
  /** Rotate the empty Auto placeholder with the "tap Auto" hint (Home, after the title types). */
  rotateHint?: boolean;
}

// Placeholder rotation: main prompt for 6s, hint for 4s, each line slides up and out.
const ROTATION_MS = [6000, 4000];

// Get placeholder based on mode
const getPlaceholderKey = (mode: ModeType): string => {
  switch (mode) {
    case 'auto':
      return 'placeholderAuto';
    case 'search':
      return 'placeholderSearch';
    case 'stories':
      return 'placeholderStories';
    case 'movie':
      return 'placeholderMovie';
    case 'avatar':
      return 'placeholderAvatar';
    default:
      return 'placeholderSearch';
  }
};

export default function SearchTextArea({ value, onChange, onKeyDown, className, mode = 'search', rotateHint = false }: SearchTextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();
  const placeholderKey = getPlaceholderKey(mode);
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rotating = rotateHint && mode === 'auto' && !value && !prefersReduced;
  const lines = [t(placeholderKey), t('homeAutoHint')];
  const [lineIndex, setLineIndex] = useState(0);
  // -1 until the first switch, so the very first line appears without animating in.
  const [prevIndex, setPrevIndex] = useState(-1);

  useEffect(() => {
    if (!rotating) return;
    const timer = setTimeout(() => {
      setPrevIndex(lineIndex);
      setLineIndex((lineIndex + 1) % lines.length);
    }, ROTATION_MS[lineIndex]);
    return () => clearTimeout(timer);
  }, [rotating, lineIndex, lines.length]);

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

  const textareaClasses = `
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
      ${className ? ` ${className}` : ''}`;

  return (
    <div className="relative">
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      placeholder={rotating ? '' : t(placeholderKey)}
      rows={2}
      className={textareaClasses}
      style={{
        color: 'var(--ui-text-primary)',
      }}
      spellCheck={false}
      autoComplete="off"
    />
    {rotating && (
      // Same box/padding as the textarea so the fake placeholder sits exactly where the real one would.
      <div
        aria-hidden
        className={`${textareaClasses} absolute inset-0 pointer-events-none`}
        style={{ color: 'var(--ui-text-muted)', opacity: 0.6 }}
      >
        <style>{`
          @keyframes ph-in { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          @keyframes ph-out { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-100%); opacity: 0; } }
        `}</style>
        <div className="relative overflow-hidden">
          {prevIndex >= 0 && (
            <span key={`out-${prevIndex}-${lineIndex}`} className="absolute left-0 right-0 top-0" style={{ animation: 'ph-out 350ms ease-in forwards' }}>
              {lines[prevIndex]}
            </span>
          )}
          <span key={`in-${lineIndex}`} className="block" style={prevIndex >= 0 ? { animation: 'ph-in 350ms ease-out' } : undefined}>
            {lines[lineIndex]}
          </span>
        </div>
      </div>
    )}
    </div>
  );
}