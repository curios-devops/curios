import React from 'react';
import { CitationInfo } from '../commonApp/types';
import { parseCitation } from './citations/citationParser';
import CitationTooltip from './citations/CitationTooltip';
import MultipleCitations from './citations/MultipleCitations';

interface CustomMarkdownProps {
  children: string;
  className?: string;
  citations?: CitationInfo[];
}

export default function CustomMarkdown({ children, className = "", citations = [] }: CustomMarkdownProps) {
  console.log('🎨 CustomMarkdown: Starting render', {
    contentLength: children?.length,
    hasCitations: citations.length > 0,
    citationsCount: citations.length
  });
  
  // CRITICAL FIX: Memoize the parsing to prevent re-parsing on every render
  const parsedContent = React.useMemo(() => {
    console.log('🎨 CustomMarkdown: useMemo - Running parseMarkdown');
    return parseMarkdown(children);
  }, [children, citations]); // Re-parse only when content or citations change
  
  console.log('🎨 CustomMarkdown: Parsed content ready, elements:', parsedContent.length);
  
  // Simple markdown parser for basic formatting
  function parseMarkdown(text: string): React.ReactElement[] {
    console.log('🎨 CustomMarkdown: parseMarkdown called', { textLength: text.length });
    const lines = text.split('\n');
    const elements: React.ReactElement[] = [];
    let key = 0;

    lines.forEach((line, lineIndex) => {
      if (line.trim() === '') {
        // Only add <br> if the previous element was a paragraph, not a header
        const prevLine = lineIndex > 0 ? lines[lineIndex - 1] : '';
        const nextLine = lineIndex < lines.length - 1 ? lines[lineIndex + 1] : '';
        
        // Don't add <br> if previous line was a header or next line is a header
        const prevIsHeader = prevLine.match(/^#{1,6}\s/);
        const nextIsHeader = nextLine.match(/^#{1,6}\s/);
        
        if (!prevIsHeader && !nextIsHeader && prevLine.trim() !== '' && nextLine.trim() !== '') {
          elements.push(<br key={`br-${key++}`} />);
        }
        return;
      }

      // Headers
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${key++}`} className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2">
            {parseInlineFormatting(line.substring(4))}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${key++}`} className="text-xl font-semibold text-gray-900 dark:text-white mt-5 mb-3">
            {parseInlineFormatting(line.substring(3))}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${key++}`} className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-4">
            {parseInlineFormatting(line.substring(2))}
          </h1>
        );
      }
      // Lists
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <ul key={`ul-${key++}`} className="list-disc list-inside mb-4 text-gray-600 dark:text-gray-300">
            <li className="mb-1">{parseInlineFormatting(line.substring(2))}</li>
          </ul>
        );
      } else if (/^\d+\.\s/.test(line)) {
        const text = line.replace(/^\d+\.\s/, '');
        elements.push(
          <ol key={`ol-${key++}`} className="list-decimal list-inside mb-4 text-gray-600 dark:text-gray-300">
            <li className="mb-1">{parseInlineFormatting(text)}</li>
          </ol>
        );
      }
      // Regular paragraphs
      else {
        elements.push(
          <p key={`p-${key++}`} className="mb-4 text-gray-600 dark:text-gray-300 leading-relaxed">
            {parseInlineFormatting(line)}
          </p>
        );
      }
    });

    return elements;
  }

  // Parse inline formatting like **bold** and *italic*
  function parseInlineFormatting(text: string): React.ReactNode {
    // Citations [Website Name] or [Website Name +X] - Convert to new citation components
    const citationRegex = /(\[[^\]]+\])/g;
    const parts = text.split(citationRegex);
    
    const result = parts.map((part, index) => {
      // Check if this part is a citation
      if (part.match(/^\[[^\]]+\]$/)) {
        const citationText = part.slice(1, -1); // Remove brackets
        const parsedCitation = parseCitation(citationText, citations);
        
        if (parsedCitation) {
          if (parsedCitation.type === 'single') {
            return (
              <CitationTooltip
                key={`citation-${index}`}
                citation={parsedCitation.citations[0]}
              >
                {parsedCitation.siteName}
              </CitationTooltip>
            );
          } else if (parsedCitation.type === 'multiple') {
            return (
              <MultipleCitations
                key={`citation-${index}`}
                citations={parsedCitation.citations}
                primarySiteName={parsedCitation.siteName}
              />
            );
          }
        }
        
        // Fallback: display as blue button even if no citation match found
        return (
          <span
            key={`citation-fallback-${index}`} 
            className="inline-flex items-center px-2 py-0.5 mx-0.5 bg-blue-600 text-white text-xs font-medium rounded-md"
          >
            {citationText}
          </span>
        );
      }
      
      // Handle other inline formatting for non-citation parts
      return parseOtherFormatting(part, index);
    });

    return result;
  }

  // Helper function to parse bold, italic, and code formatting
  function parseOtherFormatting(text: string, baseIndex: number): React.ReactNode {
    // Bold text **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return (
          <strong key={`bold-${baseIndex}-${index}`} className="font-bold text-gray-900 dark:text-white">
            {parseItalicAndCode(boldText, `${baseIndex}-${index}`)}
          </strong>
        );
      }
      
      return parseItalicAndCode(part, `${baseIndex}-${index}`);
    });
  }

  // Helper function to parse italic and code formatting
  function parseItalicAndCode(text: string, baseKey: string): React.ReactNode {
    // Italic text *text*
    const parts = text.split(/(\*[^*]+\*)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        const italicText = part.slice(1, -1);
        return (
          <em key={`italic-${baseKey}-${index}`} className="italic text-gray-700 dark:text-gray-300">
            {parseCode(italicText, `${baseKey}-${index}`)}
          </em>
        );
      }
      
      return parseCode(part, `${baseKey}-${index}`);
    });
  }

  // Helper function to parse code formatting
  function parseCode(text: string, baseKey: string): React.ReactNode {
    // Inline code `code`
    const parts = text.split(/(`[^`]+`)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        const codeText = part.slice(1, -1);
        return (
          <code key={`code-${baseKey}-${index}`} className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">
            {codeText}
          </code>
        );
      }
      return part;
    });
  }

  return (
    <div className={className}>
      {parsedContent}
    </div>
  );
}
