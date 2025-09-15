import React, { useState } from 'react';
import { UIArtifact } from '../commonApp/types/index';
import { Code, Eye, Download, Copy, Play } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { FC, ReactElement } from 'react';

const MarkdownRenderer: FC<{ children: string }> = ({ children }) => {
  return ReactMarkdown({ children }) as ReactElement;
};

interface ArtifactViewerProps {
  artifact: UIArtifact;
}

export const ArtifactViewer: React.FC<ArtifactViewerProps> = ({ artifact }) => {
  const [activeTab, setActiveTab] = useState('preview');

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
  };

  const handleDownload = () => {
    const extension = getFileExtension(artifact.type);
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderPreview = () => {
    switch (artifact.type) {
      case 'html':
      case 'game':
      case 'chart':
      case 'spa':
      case 'landing':
      case 'personal':
        return (
          <iframe
            srcDoc={artifact.content}
            className="w-full h-full border-0 bg-white"
            title="Artifact Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        );

      case 'svg':
      case 'diagram':
      case 'sketch':
      case 'photo':
        return (
          <div className="w-full h-full bg-white flex items-center justify-center p-4">
            <div dangerouslySetInnerHTML={{ __html: artifact.content }} />
          </div>
        );

      case 'doc':
      case 'slides':
      case 'pdf':
        return (
          <div className="w-full h-full bg-white p-6 overflow-auto">
            <div className="prose prose-sm max-w-none">
              <MarkdownRenderer>
                {artifact.content}
              </MarkdownRenderer>
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full h-full bg-white p-4">
            <pre className="text-sm overflow-auto h-full">{artifact.content}</pre>
          </div>
        );
    }
  };

  const getPreviewIcon = () => {
    if (artifact.type === 'game' || artifact.type === 'arcade' || artifact.type === 'retro' || artifact.type === 'puzzles' || artifact.type === 'rpg') {
      return <Play className="w-4 h-4" />;
    }
    return <Eye className="w-4 h-4" />;
  };

  const getPreviewLabel = () => {
    if (artifact.type === 'game' || artifact.type === 'arcade' || artifact.type === 'retro' || artifact.type === 'puzzles' || artifact.type === 'rpg') {
      return 'Play';
    }
    return 'Preview';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{artifact.title}</h2>
            <p className="text-sm text-gray-600">{artifact.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border rounded-md">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 text-sm flex items-center gap-1 ${
                  activeTab === 'preview' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getPreviewIcon()}
                {getPreviewLabel()}
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1 text-sm flex items-center gap-1 ${
                  activeTab === 'code' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Code className="w-4 h-4" />
                Code
              </button>
            </div>
            <button 
              onClick={handleCopy}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button 
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' ? (
          renderPreview()
        ) : (
          <div className="h-full overflow-auto bg-gray-900 text-green-400 font-mono text-sm">
            <pre className="p-4 h-full">
              <code>{artifact.content}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

function getFileExtension(type: string): string {
  switch (type) {
    case 'html':
    case 'game':
    case 'chart':
    case 'spa':
    case 'landing':
    case 'personal':
    case 'arcade':
    case 'retro':
    case 'puzzles':
    case 'rpg':
    case 'flashcards':
      return 'html';
    case 'svg':
    case 'diagram':
    case 'sketch':
    case 'photo':
      return 'svg';
    case 'doc':
    case 'slides':
    case 'pdf':
      return 'md';
    case 'table':
    case 'graph':
      return 'html';
    default:
      return 'txt';
  }
}
