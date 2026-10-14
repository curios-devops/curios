// "Follow-Ups": the next questions to ask (Search and Magazine share this block).
import { Plus } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

export default function FollowUps({ questions, onPick }: { questions: string[]; onPick: (question: string) => void }) {
  const { t } = useTranslation();
  if (questions.length === 0) return null;
  return (
    <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
          <div className="w-2.5 h-2.5 grid grid-cols-2 gap-0.5">
            {[0, 1, 2, 3].map((i) => <div key={i} className="rounded-sm" style={{ backgroundColor: 'var(--accent-primary)' }} />)}
          </div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('followUps')}</h3>
      </div>

      <div className="space-y-0">
        {questions.map((question, index) => (
          <div key={index}>
            <button
              type="button"
              className="w-full flex items-center justify-between py-2.5 px-0 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
              onClick={() => onPick(question)}
              onMouseEnter={(e) => {
                const span = e.currentTarget.querySelector('.question-text') as HTMLElement;
                const circle = e.currentTarget.querySelector('.plus-circle') as HTMLElement;
                if (span) span.style.color = 'var(--accent-primary)';
                if (circle) {
                  circle.style.borderColor = 'var(--accent-primary)';
                  circle.style.backgroundColor = 'var(--accent-primary)';
                }
              }}
              onMouseLeave={(e) => {
                const span = e.currentTarget.querySelector('.question-text') as HTMLElement;
                const circle = e.currentTarget.querySelector('.plus-circle') as HTMLElement;
                if (span) span.style.color = '';
                if (circle) {
                  circle.style.borderColor = '';
                  circle.style.backgroundColor = '';
                }
              }}
            >
              <span className="question-text text-sm text-gray-700 dark:text-gray-300 transition-colors leading-relaxed">
                {question}
              </span>
              <div className="plus-circle flex-shrink-0 w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center transition-colors ml-3">
                <Plus size={10} className="text-gray-400 group-hover:text-white transition-colors" />
              </div>
            </button>
            {index < questions.length - 1 && <div className="border-b border-gray-200 dark:border-gray-800" />}
          </div>
        ))}
      </div>
    </div>
  );
}
