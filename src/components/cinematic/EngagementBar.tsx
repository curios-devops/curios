/**
 * Engagement Action Bar Component
 * Actions: Share, Save, Like, Feedback
 */

import type { FC } from 'react';
import { useState } from 'react';
import { Share2, Bookmark, Heart, MessageSquare, Check, ExternalLink, Download } from 'lucide-react';

interface EngagementBarProps {
  videoId: string;
  videoUrl?: string;
  title: string;
  description: string;
  isLiked?: boolean;
  isSaved?: boolean;
  likeCount?: number;
  onLike?: () => void;
  onSave?: () => void;
  onShare?: (platform: 'twitter' | 'facebook' | 'linkedin' | 'copy') => void;
  onFeedback?: (feedback: string) => void;
  onDownload?: () => void;
}

export const EngagementBar: FC<EngagementBarProps> = ({
  videoUrl,
  title,
  isLiked = false,
  isSaved = false,
  likeCount = 0,
  onLike,
  onSave,
  onShare,
  onFeedback,
  onDownload,
}) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleShare = (platform: 'twitter' | 'facebook' | 'linkedin' | 'copy') => {
    if (platform === 'copy') {
      const shareUrl = videoUrl || window.location.href;
      navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } else {
      onShare?.(platform);
    }
    setShowShareMenu(false);
  };

  const handleFeedbackSubmit = () => {
    if (feedbackText.trim()) {
      onFeedback?.(feedbackText);
      setFeedbackSent(true);
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackText('');
        setFeedbackSent(false);
      }, 2000);
    }
  };

  const shareToTwitter = () => {
    const text = `Check out this video: ${title}`;
    const url = videoUrl || window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareToFacebook = () => {
    const url = videoUrl || window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const shareToLinkedIn = () => {
    const url = videoUrl || window.location.href;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  };

  const handleDownload = () => {
    if (videoUrl) {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (onDownload) {
      onDownload();
    }
  };

  return (
    <div className="engagement-bar w-full">
      {/* Main Action Buttons */}
      <div className="flex items-center justify-center gap-3 py-4">
        {/* Like Button */}
        <button
          onClick={onLike}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all ${
            isLiked
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          aria-label={isLiked ? 'Unlike' : 'Like'}
        >
          <Heart size={20} className={isLiked ? 'fill-current' : ''} />
          <span className="text-sm">
            {isLiked ? 'Liked' : 'Like'}
            {likeCount > 0 && ` (${likeCount})`}
          </span>
        </button>

        {/* Save Button */}
        <button
          onClick={onSave}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all ${
            isSaved
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          aria-label={isSaved ? 'Saved' : 'Save'}
        >
          <Bookmark size={20} className={isSaved ? 'fill-current' : ''} />
          <span className="text-sm">{isSaved ? 'Saved' : 'Save'}</span>
        </button>

        {/* Share Button with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-all"
            aria-label="Share"
          >
            <Share2 size={20} />
            <span className="text-sm">Share</span>
          </button>

          {/* Share Dropdown Menu */}
          {showShareMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-10">
              <button
                onClick={shareToTwitter}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm transition-colors"
              >
                <ExternalLink size={16} />
                <span>Share on X</span>
              </button>
              <button
                onClick={shareToFacebook}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm transition-colors"
              >
                <ExternalLink size={16} />
                <span>Share on Facebook</span>
              </button>
              <button
                onClick={shareToLinkedIn}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm transition-colors"
              >
                <ExternalLink size={16} />
                <span>Share on LinkedIn</span>
              </button>
              <button
                onClick={() => handleShare('copy')}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm transition-colors border-t border-gray-200 dark:border-gray-700"
              >
                {copySuccess ? (
                  <>
                    <Check size={16} className="text-green-600" />
                    <span className="text-green-600">Link copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 size={16} />
                    <span>Copy link</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Download Button */}
        {videoUrl && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-all"
            aria-label="Download"
          >
            <Download size={20} />
            <span className="text-sm">Download</span>
          </button>
        )}

        {/* Feedback Button */}
        <button
          onClick={() => setShowFeedbackModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-all"
          aria-label="Feedback"
        >
          <MessageSquare size={20} />
          <span className="text-sm">Feedback</span>
        </button>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            {feedbackSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Thank you!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Your feedback helps us improve.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Share Your Feedback
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Help us improve this cinematic experience. What did you think?
                </p>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Your thoughts, suggestions, or issues..."
                  className="w-full h-32 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  autoFocus
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFeedbackSubmit}
                    disabled={!feedbackText.trim()}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    Send Feedback
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Close share menu when clicking outside */}
      {showShareMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowShareMenu(false)}
        />
      )}
    </div>
  );
};
