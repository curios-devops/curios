/**
 * Scene Progress Bar Component
 * Visual timeline showing all scenes with progress indication
 */

import React from 'react';
import { CinematicScene } from '../../services/cinematic/types';

interface SceneProgressBarProps {
  scenes: CinematicScene[];
  currentSceneIndex: number;
  currentTime: number;
  totalDuration: number;
  onSceneClick: (sceneIndex: number) => void;
}

export const SceneProgressBar: React.FC<SceneProgressBarProps> = ({
  scenes,
  currentSceneIndex,
  currentTime,
  totalDuration,
  onSceneClick,
}) => {
  // Get scene type label
  const getSceneTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      hook: '🎬 Hook',
      explanation: '💡 Explain',
      insight: '✨ Insight',
      conclusion: '🎯 End',
    };
    return labels[type] || type;
  };

  // Get scene type color
  const getSceneTypeColor = (type: string, isActive: boolean): string => {
    if (isActive) {
      return 'border-blue-500 bg-blue-500/10';
    }

    const colors: Record<string, string> = {
      hook: 'border-purple-500/50 bg-purple-500/5 hover:border-purple-400',
      explanation: 'border-blue-500/50 bg-blue-500/5 hover:border-blue-400',
      insight: 'border-yellow-500/50 bg-yellow-500/5 hover:border-yellow-400',
      conclusion: 'border-green-500/50 bg-green-500/5 hover:border-green-400',
    };

    return colors[type] || 'border-gray-500/50 bg-gray-500/5 hover:border-gray-400';
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Timeline Bar */}
      <div className="relative h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${(currentTime / totalDuration) * 100}%` }}
        />
      </div>

      {/* Scene Thumbnails */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
        {scenes.map((scene, index) => {
          const isActive = index === currentSceneIndex;

          return (
            <button
              key={scene.id}
              onClick={() => onSceneClick(index)}
              className={`
                flex-shrink-0 w-28 h-28 rounded-lg border-2 overflow-hidden
                transition-all duration-200 cursor-pointer
                ${getSceneTypeColor(scene.type, isActive)}
                ${isActive ? 'shadow-lg scale-105 ring-2 ring-blue-500/50' : 'hover:scale-102'}
              `}
              title={`${scene.type}: ${scene.text.substring(0, 50)}...`}
            >
              <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                <span className="text-sm font-semibold mb-1 text-gray-900 dark:text-white">
                  {getSceneTypeLabel(scene.type)}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Scene {index + 1}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {scene.duration}s
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Current Scene Info */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {getSceneTypeLabel(scenes[currentSceneIndex].type)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {scenes[currentSceneIndex].duration}s
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {scenes[currentSceneIndex].text}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentSceneIndex + 1}/{scenes.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">scenes</div>
          </div>
        </div>
      </div>
    </div>
  );
};
