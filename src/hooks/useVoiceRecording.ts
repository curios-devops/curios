import { useState, useRef, useCallback } from 'react';

export interface UseVoiceRecordingReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  audioBlob: Blob | null;
  error: string | null;
}

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Collect audio chunks
      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);

      console.log('🎤 Voice recording started');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(errorMessage);
      console.error('❌ Recording error:', errorMessage);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      // Set up the stop event handler
      mediaRecorder.addEventListener('stop', () => {
        // Create blob from chunks
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        setIsRecording(false);

        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());

        console.log('🎤 Voice recording stopped, blob size:', blob.size);
        resolve(blob);
      });

      // Stop the recording
      mediaRecorder.stop();
    });
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    audioBlob,
    error
  };
}
