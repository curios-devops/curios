/**
 * Anam Avatar Test Component
 * Simple test component to verify Anam AI SDK integration
 */

import { useState, useEffect, useRef } from 'react';
import { AnamEvent, MessageRole } from '@anam-ai/js-sdk/dist/module/types';
import { anamAvatarService } from '../services/anamAvatarService';
import { logger } from '../../../../utils/logger';

type TranscriptMessage = {
  id: string;
  role: string;
  content: string;
  interrupted?: boolean;
};

type EventLogEntry = {
  timestamp: string;
  label: string;
  details?: string;
};

export default function AnamAvatarTest() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState('Idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [messageHistory, setMessageHistory] = useState<TranscriptMessage[]>([]);
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [testMessage, setTestMessage] = useState('Hello! This is a test message from CuriosAI.');
  const videoRef = useRef<HTMLVideoElement>(null);
  const listenerCleanupRef = useRef<(() => void) | null>(null);

  const pushEventLog = (label: string, details?: string) => {
    const entry: EventLogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      label,
      details,
    };

    setEventLog((previous) => [entry, ...previous].slice(0, 12));
  };

  const clearAnamListeners = () => {
    listenerCleanupRef.current?.();
    listenerCleanupRef.current = null;
  };

  const registerAnamListeners = () => {
    clearAnamListeners();

    const handleSessionReady = (sessionId: string) => {
      setSessionState(`Session ready: ${sessionId}`);
      pushEventLog('SESSION_READY', sessionId);
    };

    const handleVideoStarted = () => {
      setSessionState('Video stream started');
      pushEventLog('VIDEO_PLAY_STARTED');
    };

    const handleHistoryUpdated = (messages: TranscriptMessage[]) => {
      setMessageHistory(messages);
      pushEventLog('MESSAGE_HISTORY_UPDATED', `${messages.length} messages`);
    };

    const handleStreamEvent = (event: TranscriptMessage & { endOfSpeech?: boolean }) => {
      if (event.role === MessageRole.PERSONA) {
        setLiveTranscript((previous) => `${previous}${event.content}`);
      }

      if (event.role === MessageRole.USER) {
        setLiveTranscript('');
      }

      if (event.endOfSpeech) {
        pushEventLog('MESSAGE_STREAM_EVENT_RECEIVED', `${event.role}: ${event.content}`);
      }
    };

    const handleWarning = (warning: string) => {
      pushEventLog('SERVER_WARNING', warning);
    };

    const handleConnectionClosed = (reason: string, details?: string) => {
      setSessionState(`Connection closed: ${reason}`);
      pushEventLog('CONNECTION_CLOSED', details ? `${reason} - ${details}` : reason);
    };

    anamAvatarService.addListener(AnamEvent.SESSION_READY, handleSessionReady);
    anamAvatarService.addListener(AnamEvent.VIDEO_PLAY_STARTED, handleVideoStarted);
    anamAvatarService.addListener(AnamEvent.MESSAGE_HISTORY_UPDATED, handleHistoryUpdated);
    anamAvatarService.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, handleStreamEvent);
    anamAvatarService.addListener(AnamEvent.SERVER_WARNING, handleWarning);
    anamAvatarService.addListener(AnamEvent.CONNECTION_CLOSED, handleConnectionClosed);

    listenerCleanupRef.current = () => {
      anamAvatarService.removeListener(AnamEvent.SESSION_READY, handleSessionReady);
      anamAvatarService.removeListener(AnamEvent.VIDEO_PLAY_STARTED, handleVideoStarted);
      anamAvatarService.removeListener(AnamEvent.MESSAGE_HISTORY_UPDATED, handleHistoryUpdated);
      anamAvatarService.removeListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, handleStreamEvent);
      anamAvatarService.removeListener(AnamEvent.SERVER_WARNING, handleWarning);
      anamAvatarService.removeListener(AnamEvent.CONNECTION_CLOSED, handleConnectionClosed);
    };
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAnamListeners();
      if (isConnected) {
        anamAvatarService.stop().catch(console.error);
      }
    };
  }, [isConnected]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      logger.info('🎭 Test: Connecting to Anam...');
      setSessionState('Initializing client...');
      setLiveTranscript('');
      setMessageHistory([]);
      setEventLog([]);

      // Initialize and start streaming
      await anamAvatarService.initialize();
      registerAnamListeners();
      setSessionState('Starting video stream...');
      await anamAvatarService.startStreaming('anam-avatar-video');

      setIsConnected(true);
      setSessionState('Connected');
      pushEventLog('CONNECTED');
      logger.info('✅ Test: Connected successfully');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('❌ Test: Connection failed', { error: err });
      setError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!isConnected) {
      setError('Please connect first');
      return;
    }

    setIsSendingMessage(true);
    setError(null);

    try {
      logger.info('💬 Test: Sending message...', { message: testMessage });
      pushEventLog('SEND_MESSAGE', testMessage);
      await anamAvatarService.sendMessage(testMessage);
      logger.info('✅ Test: Message sent');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('❌ Test: Send message failed', { error: err });
      setError(errorMessage);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setError(null);

    try {
      logger.info('🛑 Test: Disconnecting...');
      clearAnamListeners();
      await anamAvatarService.stop();
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsConnected(false);
      setSessionState('Disconnected');
      setLiveTranscript('');
      logger.info('✅ Test: Disconnected');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('❌ Test: Disconnect failed', { error: err });
      setError(errorMessage);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-6 rounded-lg text-white">
        <h1 className="text-2xl font-bold mb-2">🎭 Anam Avatar Test</h1>
        <p className="text-purple-100">Testing Anam AI SDK integration with session token authentication</p>
      </div>

      {/* Video Display */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
        <div className="relative w-full aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            id="anam-avatar-video"
            autoPlay
            playsInline
            className="w-full h-full object-cover rounded-lg"
          />
          {!isConnected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700">
              <div className="w-24 h-24 mb-4 rounded-full bg-gray-300 dark:bg-gray-600 animate-pulse"></div>
              <p>Click "Connect" to start avatar stream</p>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
        <div className="flex gap-3">
          <button
            onClick={handleConnect}
            disabled={isConnected || isConnecting || isDisconnecting}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {isConnecting ? 'Connecting...' : '🔌 Connect'}
          </button>

          <button
            onClick={handleDisconnect}
            disabled={!isConnected || isConnecting || isDisconnecting}
            className="px-6 py-3 bg-red-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {isDisconnecting ? 'Disconnecting...' : '🛑 Disconnect'}
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Test Message
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              disabled={!isConnected || isConnecting || isDisconnecting || isSendingMessage}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
              placeholder="Enter message to send to avatar..."
            />
            <button
              onClick={handleSendMessage}
              disabled={!isConnected || isConnecting || isDisconnecting || isSendingMessage || !testMessage.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {isSendingMessage ? 'Sending...' : '📤 Send'}
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status: {isConnected ? '✅ Connected' : '⚪ Disconnected'}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Session: {sessionState}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Live Transcript</h3>
          <div className="min-h-24 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 text-sm text-gray-700 dark:text-gray-200">
            {liveTranscript || 'No live transcript yet.'}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Events</h3>
          <div className="max-h-64 space-y-2 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 text-sm text-gray-700 dark:text-gray-200">
            {eventLog.length === 0 ? (
              <p>No events yet.</p>
            ) : (
              eventLog.map((entry, index) => (
                <div key={`${entry.timestamp}-${entry.label}-${index}`} className="border-b border-gray-200 pb-2 last:border-b-0 dark:border-gray-700">
                  <p className="font-medium">[{entry.timestamp}] {entry.label}</p>
                  {entry.details && <p className="text-xs text-gray-500 dark:text-gray-400">{entry.details}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Message History</h3>
        <div className="max-h-80 space-y-3 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
          {messageHistory.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">No message history yet.</p>
          ) : (
            messageHistory.map((message) => (
              <div
                key={message.id}
                className={`rounded-lg p-3 text-sm ${message.role === MessageRole.USER ? 'bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100' : 'bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-100'}`}
              >
                <p className="font-semibold">
                  {message.role === MessageRole.USER ? 'You' : 'Persona'}
                  {message.interrupted ? ' (interrupted)' : ''}
                </p>
                <p>{message.content}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">📋 Test Steps:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-purple-800 dark:text-purple-200">
          <li>Click "Connect" to initialize Anam SDK and start avatar stream</li>
          <li>Wait for avatar video to appear</li>
          <li>Type a message and click "Send" to make the avatar speak</li>
          <li>Click "Disconnect" when done</li>
        </ol>
      </div>
    </div>
  );
}
