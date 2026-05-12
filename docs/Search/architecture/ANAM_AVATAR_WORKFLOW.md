# Anam Avatar Workflow Implementation

## Overview

The Avatar Search feature now uses **Anam AI** to generate realistic talking avatar videos, replacing the previously planned ElevenLabs Aurora integration (which is not yet available).

## Complete Workflow

```
USER
 │
 ▼
INPUT (text / audio)
 │
 ▼
[If audio] → STT (Whisper)
 │
 ▼
SEARCH LAYER
 ├─ Brave Search
 └─ Tavily (fallback)
 │
 ▼
LLM (Narrative Response)
 │
 ▼
TTS LAYER
 ├─ ElevenLabs TTS
 └─ OpenAI TTS (fallback)
 │
 ▼
AUDIO (base64)
 │
 ▼
ANAM AVATAR
 │
 ▼
VIDEO + AUDIO
 │
 ▼
FRONTEND (avatar + captions + controls)
```

## Implementation Status ✅

### ✅ Completed Features

1. **User Input**
   - Text input from search box
   - Voice recording via Whisper API
   - Button UI (mic/avatar/arrow icons)

2. **Search Layer**
   - Brave search integration
   - Tavily fallback on Brave failure
   - Search results processing

3. **LLM Response**
   - Narrative-friendly text generation
   - Optimized for spoken delivery

4. **TTS Layer**
   - ElevenLabs TTS primary
   - OpenAI TTS fallback
   - Base64 audio output

5. **Anam Avatar Integration** (NEW)
   - Supabase edge function created
   - Audio-to-video conversion
   - Graceful fallback to audio-only

6. **Frontend**
   - AvatarDisplay component
   - Subtitle controls
   - Audio/video playback
   - Action buttons

### 🔄 Pending Tasks

7. **Deploy and Test**
   - Deploy anam-avatar function
   - Configure Anam API key in Supabase
   - End-to-end testing

8. **Refinements**
   - Word-level subtitle synchronization
   - Download avatar video feature
   - Pro features (avatar selection)

## Architecture

### 1. Service Layer

#### `elevenLabsAurora.ts` (Refactored)

**Main Function:**
```typescript
export async function generateAvatarVideo(text: string): Promise<AvatarVideoResult>
```

**Pipeline:**
1. Generate audio via ElevenLabs TTS
   - If fails → OpenAI TTS fallback
2. Send audio to Anam avatar generation
   - If fails → Return audio-only (graceful degradation)
3. Return video URL + audio URL

**Key Functions:**
- `invokeTtsFunction()` - Calls TTS edge functions
- `generateAudioUrlWithOpenAI()` - OpenAI fallback
- `generateAnamAvatar()` - Anam video generation
- `base64ToBlob()` - Utility for blob conversion

### 2. Supabase Edge Function

#### `anam-avatar/index.ts`

**Endpoint:** `https://gpfccicfqynahflehpqo.supabase.co/functions/v1/anam-avatar`

**Request:**
```json
{
  "audioBase64": "base64_encoded_audio",
  "audioUrl": "https://...",  // Alternative to base64
  "personaId": "optional_persona_id"
}
```

**Response:**
```json
{
  "videoUrl": "https://anam-cdn.../video.mp4",
  "video": "base64_video_data",  // If not using CDN
  "duration": 12.5
}
```

**Error Handling:**
- 400: Missing audio data
- 500: Anam API key not configured
- 502: Anam API error

### 3. Frontend Components

#### `AvatarDisplay.tsx`

**Features:**
- Video playback with audio sync
- Fallback to audio-only visualization
- Subtitle overlay
- Responsive design

**States:**
- Loading: Animated placeholder
- Audio-only: Gradient background with icon
- Video: Full Anam avatar video

#### `AvatarSearchResults.tsx`

**Orchestrates:**
1. Narrative generation
2. Audio + video generation
3. Status updates
4. Error handling

## API Configuration

### Environment Variables

**Required in `.env`:**
```bash
# Anam API Key
ANAM_API_KEY=OGY2N2UxN2MtMmUxMS00MGM5LTg4N2UtZDNjM2NhZDNjMDIwOi9lMUEzTmdhZ1hoSEJIZlM4cUw1RjdtSUtHWW9tNVdpNFplZklpMzVPYXM9

# ElevenLabs (for TTS)
ELEVENLAB_API_KEY=sk_78f067ad602e2a587ece716fd007cbece9179dfea30235bc

# OpenAI (fallback TTS + Whisper)
OPENAI_API_KEY=sk-proj-...

# Supabase
VITE_SUPABASE_URL=https://gpfccicfqynahflehpqo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Supabase Secrets:**
```bash
npx supabase secrets set ANAM_API_KEY="YOUR_KEY"
npx supabase secrets set ELEVENLAB_API_KEY="YOUR_KEY"
```

## Deployment

### Deploy Anam Avatar Function

```bash
# Using deployment script
./scripts/deploy-anam-avatar.sh

# Or manually
npx supabase secrets set ANAM_API_KEY="YOUR_KEY"
npx supabase functions deploy anam-avatar --no-verify-jwt
```

### Verify Deployment

```bash
# Test the function
curl -X POST https://gpfccicfqynahflehpqo.supabase.co/functions/v1/anam-avatar \
  -H 'Content-Type: application/json' \
  -d '{"audioBase64": "..."}'
```

## Error Handling & Fallbacks

### Level 1: TTS Fallback
```
ElevenLabs TTS fails
  ↓
OpenAI TTS fallback
  ↓
Audio generated ✅
```

### Level 2: Avatar Fallback
```
Anam avatar generation fails
  ↓
Return audio-only
  ↓
Display audio visualization ✅
```

### Level 3: Complete Failure
```
All services fail
  ↓
Show error message
  ↓
Allow retry ✅
```

## Performance Considerations

### Parallel Processing
- Search and LLM run sequentially
- Audio generation starts immediately after LLM
- Avatar generation runs after audio (depends on audio input)

### Caching
- No caching currently implemented
- Future: Cache narrative responses for identical queries
- Future: Cache avatar videos for common responses

### Timing Estimates
1. Search: 1-3 seconds
2. LLM narrative: 2-5 seconds
3. TTS audio: 1-3 seconds
4. Anam video: 5-15 seconds (depends on audio length)
5. **Total: 9-26 seconds**

## Testing Checklist

- [ ] Deploy anam-avatar function
- [ ] Configure Anam API key
- [ ] Test TTS → Anam pipeline
- [ ] Test ElevenLabs → Anam flow
- [ ] Test OpenAI → Anam fallback
- [ ] Test audio-only fallback (when Anam fails)
- [ ] Test video playback in browser
- [ ] Test on mobile devices
- [ ] Test subtitle synchronization
- [ ] Test download feature

## Future Enhancements

### Short-term
1. Word-level subtitle synchronization using audio timestamps
2. Download avatar video + audio as MP4
3. Replay/pause controls

### Medium-term
4. Multiple Anam personas (Pro feature)
5. Custom avatar selection (Pro feature)
6. Voice selection (different TTS voices)

### Long-term
7. Real-time streaming avatar generation
8. Interactive follow-up questions
9. Multi-language support with localized avatars
10. Avatar emotional expressions based on content

## Monitoring & Logging

### Key Metrics
- TTS success rate (ElevenLabs vs OpenAI)
- Anam avatar generation success rate
- Average generation time per step
- User engagement (playthrough rate)

### Log Points
```
🎬 [TTS Pipeline] Starting audio generation
📡 [ElevenLabs] TTS response received
✅ [ElevenLabs] Audio generated successfully
🎭 [Anam] Generating avatar video from audio
✅ [Anam] Avatar video generated successfully
⚠️ [Anam] Avatar generation failed, returning audio-only
```

## References

- [Anam API Documentation](https://docs.anam.ai)
- [ElevenLabs TTS API](https://elevenlabs.io/docs)
- [OpenAI TTS API](https://platform.openai.com/docs/guides/text-to-speech)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**Last Updated:** 2026-03-10
**Status:** Implementation Complete, Pending Deployment
**Owner:** Avatar Search Team
