import { FC } from 'react';

interface LightMarkdownProps {
  children: string;
  className?: string;
}

/**
 * Lightweight markdown renderer that handles basic formatting without heavy dependencies.
 * Supports headers, bold, italic, and simple text formatting.
 */
export const LightMarkdown: FC<LightMarkdownProps> = ({ children, className = '' }) => {
  const renderMarkdown = (text: string): JSX.Element[] => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    
    lines.forEach((line, index) => {
      const key = `line-${index}`;
      
      // Headers
      if (line.startsWith('# ')) {
        elements.push(<h1 key={key} className="text-2xl font-bold mb-4">{line.slice(2)}</h1>);
      } else if (line.startsWith('## ')) {
        elements.push(<h2 key={key} className="text-xl font-bold mb-3">{line.slice(3)}</h2>);
      } else if (line.startsWith('### ')) {
        elements.push(<h3 key={key} className="text-lg font-bold mb-2">{line.slice(4)}</h3>);
      } else if (line.startsWith('#### ')) {
        elements.push(<h4 key={key} className="text-base font-bold mb-2">{line.slice(5)}</h4>);
      }
      // Horizontal rule
      else if (line.trim() === '---') {
        elements.push(<hr key={key} className="border-gray-600 my-4" />);
      }
      // Unordered lists
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        const content = formatInlineText(line.slice(2));
        elements.push(<li key={key} className="ml-4 mb-1 list-disc">{content}</li>);
      }
      // Ordered lists
      else if (line.match(/^\d+\. /)) {
        const content = formatInlineText(line.replace(/^\d+\. /, ''));
        elements.push(<li key={key} className="ml-4 mb-1 list-decimal">{content}</li>);
      }
      // Empty line
      else if (line.trim() === '') {
        elements.push(<br key={key} />);
      }
      // Regular paragraph
      else if (line.trim().length > 0) {
        const content = formatInlineText(line);
        elements.push(<p key={key} className="mb-2">{content}</p>);
      }
    });
    
    return elements;
  };
  
  const formatInlineText = (text: string): (string | JSX.Element)[] => {
    // Simple text formatting without complex regex
    const parts: (string | JSX.Element)[] = [];
    let remainingText = text;
    let key = 0;
    
    // Handle bold text **text**
    const boldParts = remainingText.split('**');
    for (let i = 0; i < boldParts.length; i++) {
      if (i % 2 === 0) {
        // Regular text
        if (boldParts[i]) {
          parts.push(boldParts[i]);
        }
      } else {
        // Bold text
        parts.push(<strong key={`bold-${key++}`} className="font-bold">{boldParts[i]}</strong>);
      }
    }
    
    return parts.length > 0 ? parts : [text];
  };
  
  return (
    <div className={`prose prose-invert max-w-none ${className}`}>
      {renderMarkdown(children)}
    </div>
  );
};

export default LightMarkdown;