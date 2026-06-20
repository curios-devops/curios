import { useRef, useEffect, useState } from 'react';
import { AnamStreamingClient } from '../services/anamStreamingService';
import { logger } from '../../../../utils/logger';

interface AnamAvatarPlayerProps {
  audioBlob: Blob;
  personaId?: string;
  onError?: (error: Error) => void;
}

/**
 * Anam Avatar Player
 * Handles real-time WebSocket streaming from Anam
 * Direct frontend → Anam connection (no backend needed!)
 */
export default function AnamAvatarPlayer({
  audioBlob,
  personaId,
  onError
}: AnamAvatarPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<AnamStreamingClient | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);

  useEffect(() => {
    let mounted = true;

    const startStreaming = async () => {
      try {
        setIsConnecting(true);
        logger.info('🎭 [AnamPlayer] Starting avatar streaming...');

        // Create MediaSource for streaming video
        const mediaSource = new MediaSource();
        mediaSourceRef.current = mediaSource;

        if (videoRef.current) {
          videoRef.current.src = URL.createObjectURL(mediaSource);
        }

        // Wait for MediaSource to be ready
        await new Promise<void>((resolve) => {
          mediaSource.addEventListener('sourceopen', () => resolve(), { once: true });
        });

        // Create SourceBuffer for WebM video
        const sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8,opus"');
        sourceBufferRef.current = sourceBuffer;

        // Create Anam client
        const client = new AnamStreamingClient({
          personaId,
          onVideoFrame: (frame: Blob) => {
            // Append video frame to SourceBuffer
            if (sourceBuffer && !sourceBuffer.updating && mounted) {
              logger.debug('[AnamPlayer] Received video frame', { size: frame.size });

              frame.arrayBuffer().then((buffer) => {
                if (sourceBuffer && !sourceBuffer.updating && mounted) {
                  try {
                    sourceBuffer.appendBuffer(buffer);
                    setIsStreaming(true);
                  } catch (err) {
                    logger.error('[AnamPlayer] Failed to append buffer', { error: err });
                  }
                }
              });
            }
          },
          onError: (err) => {
            logger.error('[AnamPlayer] Anam error', { error: err });
            setError(err.message);
            onError?.(err);
          },
          onConnected: () => {
            logger.info('✅ [AnamPlayer] Connected to Anam');
            setIsConnecting(false);
          },
          onDisconnected: () => {
            logger.info('🔌 [AnamPlayer] Disconnected from Anam');
          },
        });

        clientRef.current = client;

        // Connect to Anam
        await client.connect(personaId);

        // Send audio
        if (mounted) {
          await client.sendAudio(audioBlob);
          logger.info('✅ [AnamPlayer] Audio sent to Anam');
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error('❌ [AnamPlayer] Streaming failed', { error: errorMessage });

        if (mounted) {
          setError(errorMessage);
          onError?.(err instanceof Error ? err : new Error(errorMessage));
        }
      } finally {
        if (mounted) {
          setIsConnecting(false);
        }
      }
    };

    startStreaming();

    // Cleanup
    return () => {
      mounted = false;
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
      if (mediaSourceRef.current?.readyState === 'open') {
        mediaSourceRef.current.endOfStream();
      }
    };
  }, [audioBlob, personaId, onError]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-900/20">
        <div className="text-center p-6">
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to connect to Anam</p>
          <p className="text-sm text-red-500 dark:text-red-300 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-blue-500/10 dark:from-purple-500/20 dark:to-blue-500/20">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Connecting to Anam...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Initializing avatar stream</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className="w-full h-full object-cover rounded-xl"
        autoPlay
        playsInline
      />

      {!isStreaming && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full border-3 border-white border-t-transparent animate-spin"></div>
            <p className="text-sm">Waiting for video stream...</p>
          </div>
        </div>
      )}
    </div>
  );
}
