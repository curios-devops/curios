import React from 'react';
import { BookOpen, ThumbsUp, ThumbsDown, Share2 } from 'lucide-react';

interface AnswerSectionProps {
  answer: string;
}

export default function AnswerSection({ answer }: AnswerSectionProps) {
  return (
    <>
      <div className="bg-[#111111] rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="text-[#0095FF]" size={22} />
          <h2 className="text-xl font-medium text-white">Answer</h2>
        </div>
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-base">
            {answer}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-1">
          <button className="text-gray-400 hover:text-[#0095FF] p-1.5 rounded-lg transition-colors">
            <ThumbsUp size={16} />
          </button>
          <button className="text-gray-400 hover:text-[#0095FF] p-1.5 rounded-lg transition-colors">
            <ThumbsDown size={16} />
          </button>
        </div>
        <button className="text-gray-400 hover:text-[#0095FF] p-1.5 rounded-lg transition-colors">
          <Share2 size={16} />
        </button>
      </div>
    </>
  );
}