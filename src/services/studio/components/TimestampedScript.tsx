import { useState, useEffect } from 'react';
import { useAccentColor } from '../../../hooks/useAccentColor';

interface TimestampedScriptProps {
  content: string;
  currentTime?: number; // Current playback time in seconds
  onTimestampClick?: (seconds: number) => void; // Callback when timestamp is clicked
}

export default function TimestampedScript({ 
  content, 
  currentTime = 0,
  onTimestampClick 
}: TimestampedScriptProps) {
  const accent = useAccentColor();
  const [activeChapter, setActiveChapter] = useState<string>('');

  // Parse timestamps to find chapters
  const parseContent = () => {
    const lines = content.split('\n');
    const chapters: Array<{
      title: string;
      startTime: number;
      endTime: number;
    }> = [];
    
    let currentChapterTitle = '';
    let firstTimestampInChapter = -1;
    let lastTimestamp = 0;

    lines.forEach((line) => {
      // Check if line is a chapter title (bold text with **)
      if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
        // Save previous chapter if exists
        if (currentChapterTitle && firstTimestampInChapter >= 0) {
          chapters.push({
            title: currentChapterTitle,
            startTime: firstTimestampInChapter,
            endTime: lastTimestamp
          });
        }
        
        // Start new chapter
        currentChapterTitle = line.replace(/\*\*/g, '').trim();
        firstTimestampInChapter = -1;
      } else {
        // Check if line has timestamp
        const timestampMatch = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*-?\s*/);
        if (timestampMatch) {
          const seconds = parseTimestamp(timestampMatch[1]);
          if (firstTimestampInChapter === -1) {
            firstTimestampInChapter = seconds;
          }
          lastTimestamp = seconds;
        }
      }
    });

    // Save last chapter
    if (currentChapterTitle && firstTimestampInChapter >= 0) {
      chapters.push({
        title: currentChapterTitle,
        startTime: firstTimestampInChapter,
        endTime: 999 // End of video
      });
    }

    return chapters;
  };

  // Convert timestamp string to seconds
  const parseTimestamp = (timestamp: string): number => {
    const parts = timestamp.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  };

  // Update active chapter based on current time
  useEffect(() => {
    const chapters = parseContent();
    const current = chapters.find(
      (ch) => currentTime >= ch.startTime && currentTime < ch.endTime
    );
    if (current) {
      setActiveChapter(current.title);
    }
  }, [currentTime, content]);

  // Handle timestamp click
  const handleTimestampClick = (timestamp: string) => {
    if (onTimestampClick) {
      const seconds = parseTimestamp(timestamp);
      onTimestampClick(seconds);
    }
  };

  // Parse the content to identify chapter titles and timestamps
  const renderWithChaptersAndTimestamps = (text: string) => {
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      // Check if line is a chapter title (bold text with **)
      if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
        const chapterTitle = line.replace(/\*\*/g, '').trim();
        const isActive = chapterTitle === activeChapter;
        
        return (
          <div key={index} className="mt-6 mb-3 first:mt-0">
            <h3 
              className={`text-base font-bold transition-colors ${
                isActive 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}
              style={isActive ? { color: accent.primary } : undefined}
            >
              {chapterTitle}
              {isActive && (
                <span className="ml-2 text-xs font-normal opacity-70">
                  (Current Chapter)
                </span>
              )}
            </h3>
          </div>
        );
      }
      
      // Match timestamps like 00:00, 00:03, 02:00:01, etc.
      const timestampRegex = /^(\d{1,2}:\d{2}(?::\d{2})?)\s*-?\s*/;
      const match = line.match(timestampRegex);
      
      if (match) {
        const timestamp = match[1];
        const description = line.substring(match[0].length);
        const seconds = parseTimestamp(timestamp);
        const isCurrentTime = Math.abs(currentTime - seconds) < 1;
        
        return (
          <div 
            key={index} 
            className={`mb-3 flex gap-3 items-start group transition-all ${
              onTimestampClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 py-1 rounded' : ''
            }`}
            onClick={() => handleTimestampClick(timestamp)}
          >
            <span 
              className={`font-mono font-semibold text-sm flex-shrink-0 mt-0.5 transition-all ${
                onTimestampClick ? 'group-hover:scale-105' : ''
              } ${
                isCurrentTime ? 'font-bold' : ''
              }`}
              style={{ 
                color: isCurrentTime ? accent.primary : accent.primary,
                opacity: isCurrentTime ? 1 : 0.8
              }}
            >
              {timestamp}
            </span>
            <span className={`leading-relaxed transition-colors ${
              isCurrentTime 
                ? 'text-gray-900 dark:text-white font-medium' 
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {description}
            </span>
          </div>
        );
      }
      
      // For lines without timestamps, render as regular text
      if (line.trim()) {
        return (
          <p key={index} className="mb-2 text-gray-700 dark:text-gray-300">
            {line}
          </p>
        );
      }
      
      return null;
    });
  };

  return (
    <div className="space-y-1">
      {renderWithChaptersAndTimestamps(content)}
    </div>
  );
}
