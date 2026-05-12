/**
 * Refactored Cinematic Player Component
 * New layout: Full video as hero + scene preview cards below
 */

import React, { useState, useEffect } from 'react';
import { FullVideoPlayer } from './FullVideoPlayer';
import { ScenePreviewCard } from './ScenePreviewCard';
import { EngagementBar } from './EngagementBar';
import type { CinematicExperience } from '../../services/cinematic/cinematicService';
import { VideoPersistenceService } from '../../services/cinematic/video/VideoPersistenceService';
import { logger } from '../../utils/logger';

interface CinematicPlayerRefactoredProps {
  experience: CinematicExperience;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  userId?: string;
  onRegenerate?: () => void;
}

export const CinematicPlayerRefactored: React.FC<CinematicPlayerRefactoredProps> = ({
  experience,
  aspectRatio = '16:9',
  userId,
  onRegenerate,
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null);

  const persistenceService = new VideoPersistenceService();

  // Load engagement data on mount
  useEffect(() => {
    if (experience.id && userId) {
      loadEngagementData();
    }
  }, [experience.id, userId]);

  // Track view when component mounts
  useEffect(() => {
    if (experience.id) {
      persistenceService.incrementViewCount(experience.id);
    }
  }, [experience.id]);

  const loadEngagementData = async () => {
    if (!experience.id || !userId) return;

    try {
      const engagement = await persistenceService.getUserEngagement(experience.id, userId);
      setIsLiked(engagement.isLiked);
      setIsSaved(engagement.isSaved);
    } catch (error) {
      logger.warn('[CinematicPlayer] Failed to load engagement data', { error });
    }
  };

  const handleLike = async () => {
    if (!experience.id || !userId) return;

    try {
      const newLikedState = await persistenceService.toggleLike(experience.id, userId);
      setIsLiked(newLikedState);
      setLikeCount((prev) => (newLikedState ? prev + 1 : Math.max(0, prev - 1)));
    } catch (error) {
      logger.error('[CinematicPlayer] Failed to toggle like', { error });
    }
  };

  const handleSave = async () => {
    if (!experience.id || !userId) return;

    try {
      const newSavedState = await persistenceService.toggleSave(experience.id, userId);
      setIsSaved(newSavedState);
    } catch (error) {
      logger.error('[CinematicPlayer] Failed to toggle save', { error });
    }
  };

  const handleShare = async (platform: 'twitter' | 'facebook' | 'linkedin' | 'copy') => {
    if (!experience.id) return;

    // Track share
    await persistenceService.incrementShareCount(experience.id);

    logger.info('[CinematicPlayer] Video shared', { platform, videoId: experience.id });
  };

  const handleFeedback = async (feedback: string) => {
    if (!experience.id || !userId) return;

    try {
      await persistenceService.submitFeedback(experience.id, userId, feedback);
      logger.info('[CinematicPlayer] Feedback submitted');
    } catch (error) {
      logger.error('[CinematicPlayer] Failed to submit feedback', { error });
    }
  };

  const handleSceneClick = (index: number) => {
    setSelectedSceneIndex(selectedSceneIndex === index ? null : index);
  };

  const toPreviewStatus = (
    status: CinematicExperience['scenes'][number]['status']
  ): 'queued' | 'generating' | 'ready' | 'failed' => {
    if (status === 'ready') return 'ready';
    if (status === 'processing') return 'generating';
    if (status === 'error') return 'failed';
    return 'queued';
  };

  // Determine what to show as main content
  const hasFullVideo = !!experience.fullVideoUrl;
  const readyScenes = experience.scenes.filter((s) => s.status === 'ready');

  return (
    <div className="cinematic-player-refactored w-full max-w-7xl mx-auto px-4 py-8">
      {/* Hero: Full Video Player (if available) or First Scene */}
      {hasFullVideo && experience.fullVideoUrl ? (
        <div className="mb-8">
          <FullVideoPlayer
            videoUrl={experience.fullVideoUrl}
            title={experience.title}
            description={experience.description}
            duration={experience.totalDurationSeconds}
            aspectRatio={aspectRatio}
          />
        </div>
      ) : readyScenes.length > 0 ? (
        <div className="mb-8">
          <div className="text-center mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Full video is being composed. Meanwhile, preview individual scenes below.
            </p>
          </div>
          <FullVideoPlayer
            videoUrl={readyScenes[0].videoUrl!}
            title={readyScenes[0].title}
            description={readyScenes[0].narration}
            duration={8}
            aspectRatio={aspectRatio}
          />
        </div>
      ) : (
        <div className="mb-8 p-12 bg-gray-100 dark:bg-gray-800 rounded-xl text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Generating scenes... Please wait.
          </p>
        </div>
      )}

      {/* Engagement Bar */}
      {hasFullVideo && (
        <div className="mb-8">
          <EngagementBar
            videoId={experience.id || ''}
            videoUrl={experience.fullVideoUrl}
            title={experience.title}
            description={experience.description}
            isLiked={isLiked}
            isSaved={isSaved}
            likeCount={likeCount}
            onLike={handleLike}
            onSave={handleSave}
            onShare={handleShare}
            onFeedback={handleFeedback}
          />
        </div>
      )}

      {/* Narrative Section */}
      {experience.narrative && (
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            About This Video
          </h3>
          <div
            className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
            dangerouslySetInnerHTML={{ __html: experience.narrative.replace(/\n/g, '<br />') }}
          />
        </div>
      )}

      {/* Scene Preview Cards Section */}
      {experience.scenes.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {hasFullVideo ? 'Individual Scenes' : 'Generating Scenes'}
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {readyScenes.length} / {experience.scenes.length} ready
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {experience.scenes.map((scene, index) => (
              <ScenePreviewCard
                key={scene.id}
                sceneId={scene.id}
                title={scene.title}
                videoUrl={scene.videoUrl}
                duration={scene.durationSeconds || 8}
                narration={scene.narration}
                status={toPreviewStatus(scene.status)}
                error={scene.error}
                onClick={() => handleSceneClick(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Related Topics */}
      {experience.relatedTopics && experience.relatedTopics.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Continue Exploring
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {experience.relatedTopics.map((topic, index) => (
              <div
                key={index}
                className="group relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer"
              >
                {topic.imageUrl ? (
                  <div className="aspect-square bg-gray-200 dark:bg-gray-700">
                    <img
                      src={topic.imageUrl}
                      alt={topic.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-blue-500 to-purple-600" />
                )}
                <div className="p-3">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                    {topic.title}
                  </h4>
                </div>
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500 rounded-lg pointer-events-none transition-colors" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources Section */}
      {experience.sources && experience.sources.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Sources
          </h3>
          <div className="space-y-3">
            {experience.sources.map((source, index) => (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                  {source.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {source.snippet}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {new URL(source.url).hostname}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Regenerate Button (if provided) */}
      {onRegenerate && (
        <div className="text-center pt-4">
          <button
            onClick={onRegenerate}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
          >
            Generate New Video
          </button>
        </div>
      )}
    </div>
  );
};
