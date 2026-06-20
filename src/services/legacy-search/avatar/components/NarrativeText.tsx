import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { logger } from '../../../../utils/logger';

interface NarrativeTextProps {
  text: string;
  title?: string;
}

export default function NarrativeText({ text, title }: NarrativeTextProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      logger.info('Text copied to clipboard');
    } catch (error) {
      logger.error('Failed to copy text', { error });
    }
  };

  // Split text into paragraphs
  const paragraphs = text.split('\n\n').filter(p => p.trim());

  return (
    <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title || 'Full Response'}</h3>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check size={16} className="text-green-600" />
              <span className="text-sm text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={16} />
              <span className="text-sm">Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="prose prose-gray dark:prose-invert max-w-none">
        {paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className="text-base leading-relaxed text-gray-700 dark:text-gray-300 mb-4 last:mb-0"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
