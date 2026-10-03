// Half-body live session (Anam). Anam renders a talking upper body and speaks
// exactly the text we stream (its own LLM is off: llmId CUSTOMER_CLIENT_V1;
// input audio disabled — our mic flow transcribes and asks the question).
//
// Speech can be queued before the session is ready: the answer starts
// generating in parallel with the connection, and chunks are flushed as soon
// as the avatar is streaming.

import { createClient, AnamEvent } from '@anam-ai/js-sdk';
import { supabase } from '../../lib/supabase';
import type { HalfBodyPreset } from './halfBodyCatalog';
import { mark } from './timing';

type Client = ReturnType<typeof createClient>;
type TalkStream = ReturnType<Client['createTalkMessageStream']>;

/** Text sink that buffers until a live Anam client is attached. */
export class SpeechQueue {
  private pending: Array<{ text: string; end: boolean }> = [];
  private stream: TalkStream | null = null;
  private client: Client | null = null;

  attach(client: Client) {
    this.client = client;
    const queued = this.pending;
    this.pending = [];
    for (const p of queued) this.write(p.text, p.end);
  }

  push(text: string) { this.write(text, false); }
  end() { this.write('', true); }

  private write(text: string, end: boolean) {
    if (!this.client) { this.pending.push({ text, end }); return; }
    if (!this.stream) this.stream = this.client.createTalkMessageStream();
    void this.stream.streamMessageChunk(text, end).catch(() => undefined);
    if (end) this.stream = null; // next answer opens a fresh stream
  }
}

export interface LiveAnam {
  close: () => Promise<void>;
  attachSpeech: (q: SpeechQueue) => void;
  onSpeaking: (handler: (speaking: boolean) => void) => void;
}

export async function startAnamSession(
  preset: HalfBodyPreset,
  videoElementId: string,
  onStatus: (status: 'connecting' | 'live' | 'closed' | 'error', detail?: string) => void,
): Promise<LiveAnam> {
  onStatus('connecting');
  mark('anam token → request');
  const { data, error } = await supabase.functions.invoke('character-session', {
    body: { action: 'anam-token', avatarId: preset.anamAvatarId, voiceId: preset.anamVoiceId },
  });
  if (error || !data?.sessionToken) throw new Error(data?.error || error?.message || 'Could not start Anam');
  mark('anam token ← response', data.timing);

  const client = createClient(data.sessionToken, { disableInputAudio: true });
  const speakingHandlers: Array<(s: boolean) => void> = [];
  let closing = false;

  client.addListener(AnamEvent.VIDEO_PLAY_STARTED, () => { mark('anam first video frame (LIVE)'); onStatus('live'); });
  client.addListener(AnamEvent.CONNECTION_CLOSED, () => { if (!closing) onStatus('closed'); });
  // Persona speech events: content chunks while talking, endOfSpeech when done.
  client.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, ((e: { role?: string; endOfSpeech?: boolean }) => {
    if (e.role && e.role !== 'persona') return;
    speakingHandlers.forEach((h) => h(!e.endOfSpeech));
  }) as never);

  const ready = new Promise<void>((resolve) => client.addListener(AnamEvent.SESSION_READY, () => { mark('anam session ready'); resolve(); }));
  await client.streamToVideoElement(videoElementId);
  await ready;

  return {
    attachSpeech: (q) => q.attach(client),
    onSpeaking: (h) => { speakingHandlers.push(h); },
    close: async () => {
      if (closing) return;
      closing = true;
      try { await client.stopStreaming(); } catch { /* already stopped */ }
      onStatus('closed');
    },
  };
}
