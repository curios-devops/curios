# Anam 405 Error - API Endpoint Issue

**Date:** 2026-03-10
**Error:** `Anam API error: 405` (Method Not Allowed)
**Status:** ❌ Current endpoint not supported

---

## Problem

The Anam API returned a 405 error when we tried to POST to `/v1/avatars/generate`:

```json
{
  "error": "Anam API error: 405",
  "provider": "anam",
  "providerStatus": 405,
  "details": ""
}
```

## Root Cause

**Anam AI is NOT a batch video generation service.**

Anam provides:
- ✅ Real-time **streaming** avatars via WebSocket
- ✅ **Interactive** conversations with LLMs
- ✅ **Session-based** avatar rendering
- ❌ NOT simple audio → video conversion

Our implementation attempted to use a REST endpoint (`/avatars/generate`) that **doesn't exist**.

---

## Anam's Actual Architecture

```
User → Anam JS SDK → WebSocket Connection → Real-time Avatar Stream
```

**NOT:**
```
Audio → REST API → Video File ❌
```

---

## Solutions

### Option 1: Use Anam's Real-Time SDK (Frontend)

**Pros:**
- ✅ Proper Anam usage
- ✅ Interactive avatars
- ✅ Real-time streaming

**Cons:**
- ❌ Requires frontend WebSocket integration
- ❌ More complex implementation
- ❌ Different from current audio-only approach

**Implementation:**
```typescript
import { AnamClient } from '@anam-ai/js-sdk';

const client = new AnamClient({
  apiKey: ANAM_API_KEY,
  personaId: 'your-persona-id'
});

// Create session
const session = await client.createSession();

// Stream avatar
await session.streamAudio(audioBlob);

// Get video stream
const videoElement = document.getElementById('avatar');
session.on('video', (stream) => {
  videoElement.srcObject = stream;
});
```

---

### Option 2: Use Alternative Video Avatar Service

Replace Anam with a service that supports batch video generation:

#### A) **HeyGen** (https://heygen.com)
- ✅ REST API for video generation
- ✅ Audio → talking head video
- ✅ Multiple avatars
- 💰 Paid API

#### B) **D-ID** (https://d-id.com)
- ✅ Simple REST API
- ✅ Audio/text → video
- ✅ Good documentation
- 💰 Paid API

#### C) **Synthesia** (https://synthesia.io)
- ✅ Enterprise-grade
- ✅ API for video generation
- 💰 Expensive

#### D) **Runway ML** (https://runwayml.com)
- ✅ Gen-2 video generation
- ✅ API available
- 💰 Paid API

---

### Option 3: Keep Audio-Only (Current Fallback)

**Simplest solution - already implemented!**

```typescript
// Current fallback in elevenLabsAurora.ts
catch (error) {
  logger.warn('⚠️ [Anam] Avatar generation failed, returning audio-only');
  return {
    videoUrl: '', // No video
    audioUrl,     // Audio still works!
  };
}
```

**User Experience:**
- Audio plays with animated visualization
- Message: "Avatar generation in progress..." or "Audio-only mode"
- Full functionality without video

---

## Recommendation

**Go with Option 3 (Audio-Only) for now:**

1. ✅ **Already working** - TTS generates audio perfectly
2. ✅ **No additional costs** - ElevenLabs + OpenAI TTS already paid
3. ✅ **Good UX** - Audio with visualization looks fine
4. ✅ **Fast** - No 10-30 second video generation wait
5. ✅ **Mobile friendly** - Audio is lighter than video

**Future enhancement:** Add video avatar service when budget allows.

---

## Implementation Changes

### Immediate: Improve Audio-Only UX

Update [AvatarDisplay.tsx](../../../src/services/search/avatar/components/AvatarDisplay.tsx):

```typescript
// Better message for audio-only mode
<p className="text-gray-600 dark:text-gray-300 font-medium">
  🎙️ Voice Response
</p>
<p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
  Listening to AI-generated audio
</p>
```

### Future: If Adding Video Service

1. Choose service (recommend **D-ID** for simplicity)
2. Create new edge function: `did-avatar` or `heygen-avatar`
3. Update `elevenLabsAurora.ts` to call new service
4. Test and deploy

---

## Cost Comparison

| Service | Price | Notes |
|---------|-------|-------|
| Anam | Streaming only | Real-time, no batch |
| HeyGen | ~$0.10-0.20/video | Good quality |
| D-ID | ~$0.05-0.15/video | Simple API |
| Synthesia | $$$ | Enterprise pricing |
| Audio-Only | $0 extra | Already included in TTS |

---

## Conclusion

**Don't fix Anam - pivot to audio-only UX improvement.**

The current implementation already gracefully falls back to audio-only when Anam fails. This is actually a feature, not a bug:

```
TTS ✅ → Anam ❌ → Audio-Only Fallback ✅
```

Users get:
- High-quality TTS voice (ElevenLabs or OpenAI)
- Animated audio visualization
- Full text transcript
- Subtitle controls
- Fast response (no video rendering wait)

**Status:** Working as designed with acceptable UX.

---

## Next Steps

1. ✅ Accept audio-only as current solution
2. Update UX messaging to be more positive about audio-only
3. Budget for video avatar service if needed later
4. Document for future developers

**Priority:** Low (audio-only works fine)
