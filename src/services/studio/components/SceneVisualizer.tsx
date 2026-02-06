/**
 * Scene Visualizer Component
 * Debug component to visualize generated scenes
 */

import { SceneStructure } from '../types';

interface SceneVisualizerProps {
  sceneStructure?: SceneStructure;
}

export default function SceneVisualizer({ sceneStructure }: SceneVisualizerProps) {
  if (!sceneStructure || !sceneStructure.scenes || sceneStructure.scenes.length === 0) {
    return null;
  }

  const { scenes, duration, fps } = sceneStructure;

  const formatTime = (frames: number): string => {
    const totalSeconds = frames / fps;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((totalSeconds % 1) * 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  const getStyleColor = (style: string): string => {
    switch (style) {
      case 'hook':
        return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700';
      case 'explain':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
      case 'takeaway':
        return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
      case 'outro':
        return 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700';
    }
  };

  const getStyleIcon = (style: string): string => {
    switch (style) {
      case 'hook':
        return '🎣';
      case 'explain':
        return '💡';
      case 'takeaway':
        return '🎯';
      case 'outro':
        return '👋';
      default:
        return '📝';
    }
  };

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Scene Structure
        </h3>
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>{scenes.length} scenes</span>
          <span>•</span>
          <span>{duration}s duration</span>
          <span>•</span>
          <span>{fps} fps</span>
          <span>•</span>
          <span>{duration * fps} frames</span>
        </div>
      </div>

      {/* Scene Timeline Visualization */}
      <div className="mb-6">
        <div className="relative h-8 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden">
          {scenes.map((scene, index) => {
            const startPercent = (scene.from / (duration * fps)) * 100;
            const widthPercent = ((scene.to - scene.from) / (duration * fps)) * 100;
            
            return (
              <div
                key={index}
                className={`absolute h-full transition-opacity hover:opacity-80 ${getStyleColor(scene.style)}`}
                style={{
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`,
                  borderLeft: '1px solid',
                  borderRight: '1px solid'
                }}
                title={`${scene.text} (${formatTime(scene.from)} - ${formatTime(scene.to)})`}
              >
                <div className="h-full flex items-center justify-center text-xs font-medium">
                  {getStyleIcon(scene.style)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-500">
          <span>0:00</span>
          <span>{duration}s</span>
        </div>
      </div>

      {/* Scene List */}
      <div className="space-y-3">
        {scenes.map((scene, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 ${getStyleColor(scene.style)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getStyleIcon(scene.style)}</span>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white capitalize">
                    {scene.style}
                    {scene.chapter && (
                      <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
                        ({scene.chapter})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {formatTime(scene.from)} → {formatTime(scene.to)} (
                    {((scene.to - scene.from) / fps).toFixed(1)}s)
                  </div>
                </div>
              </div>
              <div className="text-xs font-mono text-gray-500 dark:text-gray-500">
                #{index + 1}
              </div>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              "{scene.text}"
            </div>
          </div>
        ))}
      </div>

      {/* Style Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Scene Styles:</div>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span>🎣</span>
            <span className="text-gray-700 dark:text-gray-300">Hook (Attention)</span>
          </div>
          <div className="flex items-center gap-1">
            <span>💡</span>
            <span className="text-gray-700 dark:text-gray-300">Explain (Main Content)</span>
          </div>
          <div className="flex items-center gap-1">
            <span>🎯</span>
            <span className="text-gray-700 dark:text-gray-300">Takeaway (Conclusion)</span>
          </div>
          <div className="flex items-center gap-1">
            <span>👋</span>
            <span className="text-gray-700 dark:text-gray-300">Outro (Closing)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
