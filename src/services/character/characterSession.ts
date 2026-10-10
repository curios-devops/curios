// Live Vivix session on the client: the edge function `character-session`
// creates the billable session (API key stays server-side); here we join its
// TRTC room for the video and open its control WebSocket to send scripts.

import { supabase } from '../../lib/supabase';
import type { CharacterPreset } from './characterCatalog';
import type { StageProduct } from './characterDirector';
import { mark } from './timing';

interface SessionCredentials {
  sessionId: string;
  expiresAt: string | null;
  control: { url: string; client_secret: string };
  trtc: { sdk_app_id: number | string; user_id: string; user_sig: string; room_id: string; publisher_user_id: string } | null;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('character-session', { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const detail = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => null) : null;
    throw new Error(detail?.error || error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/** Vision pass for an uploaded / generated character: scene description + voice traits. */
export function describeCharacterImage(imageUrl: string) {
  return invoke<{ description: string; gender: string; age: string; vibe: string }>({ action: 'describe', imageUrl });
}

export interface LiveCharacter {
  sessionId: string;
  send: (event: unknown) => void;
  onServerEvent: (handler: (event: { type: string; [k: string]: unknown }) => void) => void;
  addProduct: (product: StageProduct) => Promise<void>;
  close: () => Promise<void>;
  /** Fire-and-forget close that survives the tab closing (fetch keepalive). */
  closeOnUnload: () => void;
}

/**
 * Create a session for `character`, play its video into `videoElementId`, and
 * return a handle. `onStatus` reports human-readable progress.
 */
export async function startCharacterSession(
  character: CharacterPreset,
  videoElementId: string,
  onStatus: (status: 'connecting' | 'live' | 'needs-sound' | 'closed' | 'error', detail?: string) => void,
  onSoundResume: (resume: () => Promise<void>) => void,
): Promise<LiveCharacter> {
  onStatus('connecting');
  mark('session.create → request');
  const creds = await invoke<SessionCredentials & { timing?: { vivixCreateMs: number } }>({
    action: 'create',
    imageUrl: character.imageUrl,
    description: character.description,
    voiceId: character.voiceId,
  });

  mark('session.create ← response', { vivixCreateMs: creds.timing?.vivixCreateMs });
  const closeServer = () => invoke({ action: 'close', sessionId: creds.sessionId }).catch(() => undefined);

  if (!creds.trtc) {
    await closeServer();
    throw new Error('Session has no video room');
  }

  // Control WebSocket (scripts in, server events out).
  const url = new URL(creds.control.url);
  url.searchParams.set('token', creds.control.client_secret);
  const ws = new WebSocket(url);
  const handlers: Array<(e: { type: string; [k: string]: unknown }) => void> = [];
  let closing = false;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { ws.close(); reject(new Error('Control connection timed out')); }, 15000);
    ws.onopen = () => { clearTimeout(timer); mark('control websocket open'); resolve(); };
    ws.onerror = () => { clearTimeout(timer); reject(new Error('Control connection failed')); };
  }).catch(async (e) => { await closeServer(); throw e; });
  ws.onmessage = (msg) => {
    try {
      const event = JSON.parse(String(msg.data));
      handlers.forEach((h) => h(event));
    } catch { /* ignore non-JSON frames */ }
  };
  ws.onclose = () => { if (!closing) onStatus('closed'); };

  // TRTC video (lazy-loaded: the SDK is large and only this page needs it).
  const { default: TRTC } = await import('trtc-sdk-v5');
  mark('trtc sdk loaded');
  const rtc = TRTC.create();
  const m = creds.trtc;
  rtc.on(TRTC.EVENT.AUTOPLAY_FAILED, (event: { resume: () => Promise<void> }) => {
    onStatus('needs-sound');
    onSoundResume(event.resume);
  });
  rtc.on(TRTC.EVENT.ERROR, (e: { message?: string }) => onStatus('error', e?.message));
  rtc.on(TRTC.EVENT.REMOTE_VIDEO_AVAILABLE, ({ userId, streamType }) => {
    if (userId === m.publisher_user_id) {
      rtc.startRemoteVideo({ userId, streamType, view: videoElementId }).catch((e: Error) => onStatus('error', e.message));
    }
  });
  rtc.on(TRTC.EVENT.FIRST_VIDEO_FRAME, ({ userId }: { userId: string }) => {
    if (userId === m.publisher_user_id) { mark('first video frame (LIVE)'); onStatus('live'); }
  });
  try {
    await rtc.enterRoom({
      sdkAppId: Number(m.sdk_app_id),
      userId: m.user_id,
      userSig: m.user_sig,
      strRoomId: m.room_id,
      scene: TRTC.TYPE.SCENE_RTC,
      autoReceiveVideo: false,
    });
    mark('trtc room entered');
  } catch (e) {
    closing = true;
    ws.close();
    rtc.destroy();
    await closeServer();
    throw e;
  }

  const send = (event: unknown) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
  };

  return {
    sessionId: creds.sessionId,
    send,
    onServerEvent: (h) => { handlers.push(h); },
    // Register a product image as <OBJ_0> and wait for Vivix to accept it.
    addProduct: (product) =>
      new Promise<void>((resolve) => {
        const eventId = `product_${Date.now()}`;
        const timer = setTimeout(resolve, 8000); // don't block the answer forever
        handlers.push((e) => { if (e.type === 'asset.added') { clearTimeout(timer); resolve(); } });
        send({
          event_id: eventId,
          type: 'asset.add',
          assets: { images: [{ asset_id: 'OBJ_0', url: product.imageUrl, description: `${product.title}<OBJ_0>` }] },
        });
      }),
    closeOnUnload: () => {
      if (closing) return;
      closing = true;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      void fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/character-session`, {
        method: 'POST',
        keepalive: true,
        headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', sessionId: creds.sessionId }),
      }).catch(() => undefined);
      try { ws.close(); } catch { /* already closed */ }
    },
    close: async () => {
      if (closing) return;
      closing = true;
      try { ws.close(); } catch { /* already closed */ }
      try { await rtc.exitRoom(); } catch { /* not in room */ }
      rtc.destroy();
      await closeServer();
      onStatus('closed');
    },
  };
}
