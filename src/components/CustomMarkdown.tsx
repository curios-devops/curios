import React from 'react';

interface CustomMarkdownProps {
  children: string;
  className?: string;
}

export default function CustomMarkdown({ children, className = "" }: CustomMarkdownProps) {
  // Simple markdown parser for basic formatting
  const parseMarkdown = (text: string): JSX.Element[] => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let key = 0;

    lines.forEach((line, _lineIndex) => {
      if (line.trim() === '') {
        elements.push(<br key={`br-${key++}`} />);
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
  };

  // Parse inline formatting like **bold** and *italic*
  const parseInlineFormatting = (text: string): React.ReactNode => {
    // Handle **bold** text
    let result: React.ReactNode = text;
    
    // Bold text **text**
    result = text.split(/(\*\*[^*]+\*\*)/).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return (
          <strong key={`bold-${index}`} className="font-bold text-gray-900 dark:text-white">
            {boldText}
          </strong>
        );
      }
      
      // Italic text *text*
      return part.split(/(\*[^*]+\*)/).map((subPart, subIndex) => {
        if (subPart.startsWith('*') && subPart.endsWith('*') && !subPart.startsWith('**')) {
          const italicText = subPart.slice(1, -1);
          return (
            <em key={`italic-${index}-${subIndex}`} className="italic text-gray-700 dark:text-gray-300">
              {italicText}
            </em>
          );
        }
        
        // Inline code `code`
        return subPart.split(/(`[^`]+`)/).map((codePart, codeIndex) => {
          if (codePart.startsWith('`') && codePart.endsWith('`')) {
            const codeText = codePart.slice(1, -1);
            return (
              <code key={`code-${index}-${subIndex}-${codeIndex}`} className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">
                {codeText}
              </code>
            );
          }
          return codePart;
        });
      });
    });

    return result;
  };

  return (
    <div className={className}>
      {parseMarkdown(children)}
    </div>
  );
}
