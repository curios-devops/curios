import { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { RefreshCw, Download, Share2 } from 'lucide-react';
import { orchestrateArtifact } from '../agents/orchestrator';
import { StudioVideo, StudioOutputType, StepItem } from '../types';
import { formatTimeAgo } from '../../../utils/time';
import StudioTopBar from '../components/StudioTopBar';
import VideoPlayer from '../components/VideoPlayer';
import { ChapterPlayer } from '../components/ChapterPlayer';
import TimestampedScript from '../components/TimestampedScript';
import SceneVisualizer from '../components/SceneVisualizer';
import LightMarkdown from '../../../components/LightMarkdown';

export default function StudioResults() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';

  const [searchStartTime] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState('just now');
  const [activeTab, setActiveTab] = useState('video');
  
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<StudioVideo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outputType] = useState<StudioOutputType>('video');
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('Initializing...');
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0); // Track current video playback time

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Update time ago
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(searchStartTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [searchStartTime]);

  useEffect(() => {
    if (!query || workflowStarted) return;

    setWorkflowStarted(true);
    setLoading(true);
    setError(null);
    setVideo(null);
    setProgress(0);
    setCurrentStage('Initializing video generation...');

    orchestrateArtifact(
      query,
      (partial: Partial<StudioVideo>) => {
        if (partial.steps) {
          const completed = partial.steps.filter((s: StepItem) => s.status === 'complete').length;
          const total = partial.steps.length;
          setProgress(total > 0 ? (completed / total) * 100 : 0);
          
          const inProgress = partial.steps.find((s: StepItem) => s.status === 'in_progress');
          if (inProgress) {
            setCurrentStage(inProgress.name);
          }
        }
        setVideo((prev) => {
          if (!prev) return partial as StudioVideo;

          return {
            ...prev,
            ...partial,
            chapterPlan: partial.chapterPlan ?? prev.chapterPlan,
            chapterUrls: partial.chapterUrls ?? prev.chapterUrls,
            steps: partial.steps ?? prev.steps,
            planDetails: partial.planDetails ?? prev.planDetails,
          } as StudioVideo;
        });
      },
      outputType
    )
      .then((finalVideo) => {
        setVideo(finalVideo);
        setLoading(false);
        setProgress(100);
        setCurrentStage('Complete');
      })
      .catch((err: Error) => {
        console.error('Studio generation failed:', err);
        setError(err.message || 'Failed to generate video. Please try again.');
        setLoading(false);
      });
  }, [query, workflowStarted, outputType]);

  const handleRegenerate = () => {
    setWorkflowStarted(false);
    setLoading(true);
    setVideo(null);
    setError(null);
    setProgress(0);
  };

  const handleDownload = () => {
    // TODO: Implement video download
  };

  const handleShareSocial = () => {
    // TODO: Implement social media sharing
  };

  const handleVideoTimeUpdate = (time: number) => {
    setCurrentVideoTime(time);
  };

  const handleTimestampClick = (seconds: number) => {
    // TODO: Seek video to this timestamp
    setCurrentVideoTime(seconds);
    // Switch to video tab if not already there
    if (activeTab !== 'video') {
      setActiveTab('video');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-200">
      <StudioTopBar
        query={query}
        timeAgo={timeAgo}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        shareUrl={globalThis.location.href}
        shareTitle={`CuriosAI Studio: ${query}`}
        shareText={video?.keyIdeas?.slice(0, 100) + '...' || ''}
        progress={progress}
        currentStage={currentStage}
        isLoading={loading}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={handleRegenerate}
              className="mt-3 px-4 py-2 rounded-lg font-medium transition-colors bg-red-600 hover:bg-red-700 text-white"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Video Tab */}
        {activeTab === 'video' && (
          <>
            {/* Video Player with Controls Inside */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden mb-6">
              {video?.chapterPlan && video?.chapterUrls && Object.keys(video.chapterUrls).length > 0 ? (
                <div
                  className="relative w-full bg-black"
                  style={{ aspectRatio: video.format === 'horizontal' ? '16/9' : '9/16' }}
                >
                  <ChapterPlayer
                    videoId={video.id || 'unknown'}
                    chapters={video.chapterPlan.chapters.map((ch) => ({
                      id: ch.id,
                      duration: ch.duration,
                      text: ch.narration,
                      free: true,
                    }))}
                    chapterUrls={new Map(Object.entries(video.chapterUrls))}
                    onComplete={() => {
                      // Keep behavior consistent with the single-video player
                    }}
                  />
                </div>
              ) : (
                <VideoPlayer 
                  videoUrl={video?.videoUrl}
                  isLoading={loading}
                  renderProgress={video?.renderProgress}
                  duration={video?.duration || 30}
                  onTimeUpdate={handleVideoTimeUpdate}
                  seekToTime={currentVideoTime}
                />
              )}
              
              {/* Video Title and Info - Show immediately even while loading */}
              <div className="p-4 space-y-4">
                {/* Video Title */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 break-words">
                      {video?.title || video?.chapterPlan?.title || query}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>{video?.duration || 30}s</span>
                      <span className="mx-1">•</span>
                      <span>{timeAgo}</span>
                    </div>
                  </div>

                  {/* Action Buttons - Only show when not loading */}
                  {!loading && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={handleRegenerate}
                        className="h-10 w-10 inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Regenerate"
                        title="Regenerate"
                      >
                        <RefreshCw size={18} />
                      </button>
                      <button
                        onClick={handleShareSocial}
                        className="h-10 w-10 inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Share"
                        title="Share"
                      >
                        <Share2 size={18} />
                      </button>
                      <button
                        onClick={handleDownload}
                        className="h-10 w-10 inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Download"
                        title="Download"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Video Description (YouTube-style) - Show as it streams in */}
                {video?.description && (
                  <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {video.description}
                    </p>
                  </div>
                )}

                
              </div>
            </div>
          </>
        )}

        {/* Key Ideas Tab */}
        {activeTab === 'ideas' && video?.keyIdeas && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="prose prose-base dark:prose-invert max-w-none">
              <LightMarkdown>{video.keyIdeas}</LightMarkdown>
            </div>
          </div>
        )}

        {/* Script Tab */}
        {activeTab === 'script' && video?.script && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <TimestampedScript 
              content={video.script}
              currentTime={currentVideoTime}
              onTimestampClick={handleTimestampClick}
            />
          </div>
        )}

        {/* Scenes Tab (Debug/Dev) */}
        {activeTab === 'scenes' && video?.scenes && (
          <SceneVisualizer sceneStructure={video.scenes} />
        )}
      </main>
    </div>
  );
}
