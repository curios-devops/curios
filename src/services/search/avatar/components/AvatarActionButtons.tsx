import { Download, User, Mic } from 'lucide-react';
import { useSession } from '../../../../hooks/useSession';
import { useSubscription } from '../../../../hooks/useSubscription';
import { logger } from '../../../../utils/logger';

interface AvatarActionButtonsProps {
  videoUrl: string | null;
  audioUrl: string | null;
  onVoiceInput: () => void;
}

export default function AvatarActionButtons({
  videoUrl,
  audioUrl,
  onVoiceInput
}: AvatarActionButtonsProps) {
  const { session } = useSession();
  const { subscription } = useSubscription(session);
  const isPro = subscription?.isActive || false;

  const handleDownload = async () => {
    if (!videoUrl && !audioUrl) {
      logger.warn('No video or audio available to download');
      return;
    }

    try {
      // Download video if available, otherwise download audio
      const urlToDownload = videoUrl || audioUrl;
      const filename = videoUrl ? 'avatar-response.mp4' : 'avatar-response.mp3';

      const response = await fetch(urlToDownload!);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      logger.info('Download initiated', { filename });
    } catch (error) {
      logger.error('Download failed', { error });
    }
  };

  const handleChangeAvatar = () => {
    if (!isPro) {
      logger.info('Avatar change requires Pro subscription');
      // TODO: Show upgrade modal
      return;
    }

    // TODO: Implement avatar selection modal
    logger.info('Change avatar clicked');
  };

  return (
    <div className="flex items-center justify-end gap-4">
      {/* Download Button */}
      <button
        onClick={handleDownload}
        disabled={!videoUrl && !audioUrl}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Download audio/video"
      >
        <Download size={20} />
      </button>

      {/* Change Avatar Button (Pro only) */}
      <button
        onClick={handleChangeAvatar}
        disabled={!isPro}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
        title={isPro ? 'Change avatar' : 'Pro feature: Change avatar'}
      >
        <User size={20} />
        {!isPro && (
          <span
            className="absolute -top-1 -right-1 text-white text-xs px-1 rounded"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            PRO
          </span>
        )}
      </button>

      {/* Voice Input Button */}
      <button
        onClick={onVoiceInput}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Voice input"
      >
        <Mic size={20} />
      </button>
    </div>
  );
}
