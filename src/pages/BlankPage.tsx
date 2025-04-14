
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BlankPage() {
  return (
    <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center p-8">
      <div className="max-w-3xl w-full bg-[#222222] rounded-lg p-8 shadow-lg">
        <h1 className="text-3xl font-medium text-white mb-6">Blank Page</h1>
        <p className="text-gray-300 mb-8">
          This is a blank page template that you can use as a starting point for creating new content.
          Feel free to customize it according to your needs.
        </p>
        
        <div className="bg-[#333333] p-6 rounded-md mb-8">
          <h2 className="text-xl font-medium text-white mb-4">Getting Started</h2>
          <ul className="text-gray-300 space-y-2 list-disc pl-6">
            <li>Edit this component in <code className="bg-[#444444] px-2 py-0.5 rounded">src/pages/BlankPage.tsx</code></li>
            <li>Add your own content and components</li>
            <li>Customize the styling using Tailwind CSS</li>
            <li>Connect to your data sources as needed</li>
          </ul>
        </div>
        
        <div className="flex justify-start">
          <Link to="/" className="flex items-center gap-2 text-[#007BFF] hover:text-[#0056b3] transition-colors">
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
