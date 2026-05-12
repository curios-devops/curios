/**
 * Cinematic Loading State Component
 * Shows real-time progress of cinematic video generation
 */

import type { FC } from 'react';
import { Loader, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { CinematicProgress } from '../../services/cinematic/types';

interface CinematicLoadingStateProps {
  progress: CinematicProgress;
}

export const CinematicLoadingState: FC<CinematicLoadingStateProps> = ({
  progress,
}) => {
  // Get stage label
  const getStageLabel = (stage: string): string => {
    const labels: Record<string, string> = {
      planning: 'Planning Your Video',
      generating: 'Generating Scenes with Sora AI',
      composing: 'Composing Final Video',
      complete: 'Complete',
    };
    return labels[stage] || stage;
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'processing':
      case 'created':
        return <Loader className="animate-spin text-blue-500" size={16} />;
      case 'failed':
        return <AlertCircle className="text-red-500" size={16} />;
      case 'pending':
      default:
        return <Clock className="text-gray-400" size={16} />;
    }
  };

  // Get status label
  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'Waiting...',
      created: 'Created...',
      processing: 'Generating...',
      completed: 'Complete',
      failed: 'Failed',
    };
    return labels[status] || status;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8 bg-white dark:bg-black">
      {/* Progress Circle */}
      <div className="relative w-40 h-40 mb-8">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r="70"
            stroke="currentColor"
            strokeWidth="10"
            fill="none"
            className="text-gray-200 dark:text-gray-800"
          />
          {/* Progress circle */}
          <circle
            cx="80"
            cy="80"
            r="70"
            stroke="currentColor"
            strokeWidth="10"
            fill="none"
            strokeDasharray={2 * Math.PI * 70}
            strokeDashoffset={2 * Math.PI * 70 * (1 - progress.progress / 100)}
            className="text-blue-500 transition-all duration-500"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {Math.round(progress.progress)}%
          </span>
        </div>
      </div>

      {/* Status Message */}
      <div className="text-center space-y-3 max-w-md mb-8">
        <div className="flex items-center justify-center gap-2">
          <Loader className="animate-spin text-blue-500" size={24} />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {getStageLabel(progress.stage)}
          </h3>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {progress.message}
        </p>

        <p className="text-xs text-gray-500 dark:text-gray-500">
          This may take 2-3 minutes. High-quality AI video generation takes time!
        </p>
      </div>

      {/* Scene Progress (if generating) */}
      {progress.sceneProgress && progress.sceneProgress.length > 0 && (
        <div className="w-full max-w-2xl bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Scene Generation Progress
          </h4>

          <div className="space-y-3">
            {progress.sceneProgress.map((scene) => (
              <div key={scene.sceneId} className="flex items-center gap-4">
                {/* Scene number */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {scene.sceneIndex + 1}
                </div>

                {/* Progress bar */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">
                      Scene {scene.sceneIndex + 1}
                    </span>
                    <span className="text-gray-500 dark:text-gray-500">
                      {getStatusLabel(scene.status)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        scene.status === 'completed'
                          ? 'bg-green-500'
                          : scene.status === 'processing' || scene.status === 'created'
                          ? 'bg-blue-500 animate-pulse'
                          : scene.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-gray-400'
                      }`}
                      style={{ width: `${scene.progress}%` }}
                    />
                  </div>
                </div>

                {/* Status icon */}
                <div className="flex-shrink-0">
                  {getStatusIcon(scene.status)}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Completed Scenes
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {progress.sceneProgress.filter((s) => s.status === 'completed').length} /{' '}
                {progress.sceneProgress.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="mt-8 max-w-md text-center">
        <p className="text-xs text-gray-500 dark:text-gray-500 italic">
          💡 Tip: Each scene is generated independently using OpenAI Sora for maximum quality
        </p>
      </div>
    </div>
  );
};
