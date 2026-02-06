import { ReactNode } from 'react';

interface LightMarkdownProps {
  children: string | ReactNode;
}

export default function LightMarkdown({ children }: LightMarkdownProps) {
  if (typeof children !== 'string') {
    return <>{children}</>;
  }

  // Parse markdown into React elements
  const lines = children.split('\n');
  const elements: ReactNode[] = [];
  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={elements.length} className="list-disc ml-6 my-2 space-y-1">
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const flushCodeBlock = () => {
    if (codeLines.length > 0) {
      elements.push(
        <pre key={elements.length} className="bg-gray-900 p-4 rounded-lg my-2 overflow-x-auto">
          <code className="text-sm text-gray-300">{codeLines.join('\n')}</code>
        </pre>
      );
      codeLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={elements.length} className="text-lg font-semibold mt-4 mb-2">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={elements.length} className="text-xl font-bold mt-6 mb-3">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={elements.length} className="text-2xl font-bold mt-8 mb-4">
          {line.slice(2)}
        </h1>
      );
    }
    // Lists
    else if (line.match(/^[-*]\s+/)) {
      listItems.push(line.replace(/^[-*]\s+/, ''));
    }
    // Horizontal rule
    else if (line.trim() === '---') {
      flushList();
      elements.push(<hr key={elements.length} className="my-4 border-gray-700" />);
    }
    // Regular paragraphs
    else if (line.trim()) {
      flushList();
      elements.push(
        <p
          key={elements.length}
          className="my-2 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatInline(line) }}
        />
      );
    }
    // Empty lines
    else {
      flushList();
    }
  }

  flushList();
  flushCodeBlock();

  return <div className="markdown-content">{elements}</div>;
}

/**
 * Format inline markdown (bold, italic, code, links)
 */
function formatInline(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-400 hover:underline" target="_blank" rel="noopener">$1</a>');
}
