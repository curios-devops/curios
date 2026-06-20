# Anam Avatar System Architecture Diagram

## Complete System Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE                                  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Home Page (/)                                                      │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │ Search Box                                                    │  │  │
│  │  │ [🎙️ Mic] [________________text input________________] [⚡👤] │  │  │
│  │  │   ▲                                                    │  │    │  │  │
│  │  │   │                                                    │  │    │  │  │
│  │  │   │ Voice                                        Arrow│  │Avatar│  │
│  │  │   │ Record                                       (→)  │  │(👤) │  │  │
│  │  └───┼────────────────────────────────────────────────┼──┼────┘  │  │
│  │      │                                                │  │        │  │
│  └──────┼────────────────────────────────────────────────┼──┼────────┘  │
│         │                                                │  │           │
│         │ (audio)                                   /search│ /avatar-   │
│         │                                                  │  search    │
└─────────┼──────────────────────────────────────────────────┼────────────┘
          │                                                  │
          ▼                                                  ▼
┌─────────────────────┐                    ┌─────────────────────────────┐
│ Whisper STT         │                    │ Query Processing            │
│ (Supabase Function) │                    │                             │
│ - Audio → Text      │                    │ 1. Parse query              │
│ - OpenAI API        │                    │ 2. Route to search          │
└──────────┬──────────┘                    └─────────────┬───────────────┘
           │                                             │
           │                                             ▼
           │                         ┌────────────────────────────────────┐
           │                         │ SEARCH LAYER                       │
           │                         │ ┌────────────┐  ┌──────────────┐  │
           │                         │ │ Brave      │  │ Tavily       │  │
           └─────────────────────────┼▶│ Search     │─▶│ (Fallback)   │  │
                                     │ │ (Primary)  │  │              │  │
                                     │ └────────────┘  └──────────────┘  │
                                     └────────────┬───────────────────────┘
                                                  │
                                                  ▼ (search results)
                         ┌────────────────────────────────────────────────┐
                         │ LLM PROCESSING                                 │
                         │ ┌────────────────────────────────────────────┐ │
                         │ │ Narrative Generator                        │ │
                         │ │ - OpenAI GPT-4                             │ │
                         │ │ - Convert results to narrative text        │ │
                         │ │ - Optimize for speech delivery             │ │
                         │ └────────────────────────────────────────────┘ │
                         └────────────┬───────────────────────────────────┘
                                      │
                                      ▼ (narrative text)
          ┌───────────────────────────────────────────────────────────────┐
          │                    TTS LAYER                                  │
          │  ┌─────────────────┐              ┌──────────────────────┐   │
          │  │ ElevenLabs TTS  │   Error      │ OpenAI TTS           │   │
          │  │ (Primary)       │─────────────▶│ (Fallback)           │   │
          │  │ - Voice: Sarah  │   or 429     │ - Voice: Alloy       │   │
          │  │ - MP3 output    │              │ - MP3 output         │   │
          │  │ - Base64 encode │              │ - Base64 encode      │   │
          │  └────────┬────────┘              └──────────┬───────────┘   │
          │           │                                  │               │
          │           └──────────────┬───────────────────┘               │
          └────────────────────────────┼──────────────────────────────────┘
                                      │
                                      ▼ (audio base64)
          ┌───────────────────────────────────────────────────────────────┐
          │                    ANAM AVATAR LAYER                          │
          │  ┌─────────────────────────────────────────────────────────┐  │
          │  │ Anam API (Supabase Function)                            │  │
          │  │ ┌─────────────────────────────────────────────────────┐ │  │
          │  │ │ Input:  audioBase64                                 │ │  │
          │  │ │ Process: Audio → Talking Avatar Video               │ │  │
          │  │ │ Output: videoUrl or video base64                    │ │  │
          │  │ │ Format: MP4, 512x512                                │ │  │
          │  │ └─────────────────────────────────────────────────────┘ │  │
          │  └─────────────┬──────────────────┬────────────────────────┘  │
          │                │ Success          │ Error                     │
          │                ▼                  ▼                           │
          │         ┌──────────────┐   ┌──────────────────────┐          │
          │         │ Video + Audio│   │ Audio Only (Fallback)│          │
          │         └──────┬───────┘   └──────┬───────────────┘          │
          └────────────────┼──────────────────┼──────────────────────────┘
                           │                  │
                           └──────────┬───────┘
                                      │
                                      ▼ (video/audio URLs)
┌──────────────────────────────────────────────────────────────────────────┐
│                    AVATAR DISPLAY PAGE                                    │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ AvatarSearchResults Component                                      │  │
│  │ ┌────────────────────────────────────────────────────────────────┐ │  │
│  │ │ ┌──────────────────────────────────────────────────────────┐   │ │  │
│  │ │ │  Avatar Display (512x512)                                │   │ │  │
│  │ │ │  ┌────────────────────────────────────────────────────┐  │   │ │  │
│  │ │ │  │                                                    │  │   │ │  │
│  │ │ │  │     [Anam Video Playing with Audio]                │  │   │ │  │
│  │ │ │  │           OR                                       │  │   │ │  │
│  │ │ │  │     [Animated Audio Visualization]                 │  │   │ │  │
│  │ │ │  │                                                    │  │   │ │  │
│  │ │ │  └────────────────────────────────────────────────────┘  │   │ │  │
│  │ │ │  ┌────────────────────────────────────────────────────┐  │   │ │  │
│  │ │ │  │  [Subtitles: "Hello, this is the answer..."]      │  │   │ │  │
│  │ │ │  └────────────────────────────────────────────────────┘  │   │ │  │
│  │ │ └──────────────────────────────────────────────────────────┘   │ │  │
│  │ │                                                                 │ │  │
│  │ │ Subtitle Controls: [CC] [B/W/A] [S/M/L] [↕]                    │ │  │
│  │ │                                                                 │ │  │
│  │ │ Action Buttons: [⬇ Download] [👤 Change] [🎙️ Mic]             │ │  │
│  │ │                                                                 │ │  │
│  │ │ ┌─────────────────────────────────────────────────────────────┐ │  │
│  │ │ │ Narrative Text (Scrollable)                                 │ │  │
│  │ │ │ ------------------------------------------------            │ │  │
│  │ │ │ The answer to your question is...                           │ │  │
│  │ │ │ Lorem ipsum dolor sit amet, consectetur adipiscing elit.    │ │  │
│  │ │ │ Sed do eiusmod tempor incididunt ut labore et dolore...     │ │  │
│  │ │ └─────────────────────────────────────────────────────────────┘ │  │
│  │ └─────────────────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Frontend Components

```
src/services/legacy-search/avatar/
│
├── pages/
│   └── AvatarSearchResults.tsx      ← Main orchestration component
│
├── components/
│   ├── AvatarDisplay.tsx            ← Video/audio playback
│   ├── SubtitleControls.tsx         ← Subtitle customization
│   ├── NarrativeText.tsx            ← Full text display
│   └── AvatarActionButtons.tsx      ← Download, change, mic
│
└── services/
    ├── narrativeGenerator.ts        ← LLM narrative generation
    └── elevenLabsAurora.ts          ← TTS + Anam integration
```

### 2. Backend Edge Functions

```
supabase/functions/
│
├── whisper-transcription/           ← Voice → Text (STT)
│   └── index.ts
│
├── elevenlabs-tts/                  ← Primary TTS
│   └── index.ts
│
├── openai-tts/                      ← Fallback TTS
│   └── index.ts
│
└── anam-avatar/                     ← NEW: Audio → Video
    └── index.ts
```

---

## Data Flow Diagram

```
┌──────┐
│ TEXT │─────────────────────────────────┐
└──────┘                                 │
                                         ▼
┌───────┐    ┌─────────┐    ┌───────────────────┐
│ AUDIO │───▶│ Whisper │───▶│ TEXT (transcribed)│
└───────┘    └─────────┘    └─────────┬─────────┘
                                       │
                    ┌──────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Search (Brave/Tavily)│
        └───────────┬───────────┘
                    │
                    ▼ (search results)
        ┌───────────────────────┐
        │  LLM (OpenAI GPT-4)   │
        │  Narrative Generation │
        └───────────┬───────────┘
                    │
                    ▼ (narrative text)
        ┌───────────────────────┐
        │  TTS Layer            │
        │  ElevenLabs → OpenAI  │
        └───────────┬───────────┘
                    │
                    ▼ (audio base64)
        ┌───────────────────────┐
        │  Anam Avatar API      │
        │  Audio → Video        │
        └───────────┬───────────┘
                    │
                    ▼ (video URL/base64)
        ┌───────────────────────┐
        │  Frontend Display     │
        │  Video + Audio + Text │
        └───────────────────────┘
```

---

## Error Handling Flow

```
┌─────────────────┐
│ ElevenLabs TTS  │
└────────┬────────┘
         │
    [Success]──────────┐
         │             │
     [Error]           │
         │             │
         ▼             │
┌─────────────────┐    │
│  OpenAI TTS     │    │
│  (Fallback)     │    │
└────────┬────────┘    │
         │             │
    [Success]──────────┤
         │             │
     [Error]           │
         │             │
         ▼             │
    ❌ FAIL            │
    (rare)            │
                      │
                      ▼ (audio base64)
              ┌─────────────────┐
              │  Anam Avatar    │
              └────────┬────────┘
                       │
                  [Success]──────────┐
                       │             │
                   [Error]           │
                       │             │
                       ▼             │
              ┌─────────────────┐    │
              │  Audio Only     │    │
              │  Visualization  │    │
              │  (Fallback)     │    │
              └─────────────────┘    │
                                    │
                                    ▼
                            ┌─────────────────┐
                            │  Display Result │
                            │  (Video or      │
                            │   Audio Only)   │
                            └─────────────────┘
```

---

## API Key Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      .env File (Local)                        │
│  - ANAM_API_KEY                                               │
│  - ELEVENLAB_API_KEY                                          │
│  - OPENAI_API_KEY                                             │
│  - VITE_SUPABASE_ANON_KEY                                     │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 │ (deployment)
                 ▼
┌──────────────────────────────────────────────────────────────┐
│              Supabase Secrets (Server-side)                   │
│  - ANAM_API_KEY           ✅ Server only                      │
│  - ELEVENLAB_API_KEY      ✅ Server only                      │
│  - OPENAI_API_KEY         ✅ Server only                      │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 │ (injected into)
                 ▼
┌──────────────────────────────────────────────────────────────┐
│              Supabase Edge Functions                          │
│  - whisper-transcription   (uses OPENAI_API_KEY)             │
│  - elevenlabs-tts          (uses ELEVENLAB_API_KEY)          │
│  - openai-tts              (uses OPENAI_API_KEY)             │
│  - anam-avatar             (uses ANAM_API_KEY)               │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 │ (called by)
                 ▼
┌──────────────────────────────────────────────────────────────┐
│                  Frontend (Browser)                           │
│  - Uses: VITE_SUPABASE_ANON_KEY only                          │
│  - No direct API keys exposed ✅ Secure                       │
│  - Calls Supabase functions via HTTPS                         │
└──────────────────────────────────────────────────────────────┘
```

---

## Timing Diagram

```
Time: 0s    5s     10s    15s    20s    25s    30s    35s    40s
      │     │      │      │      │      │      │      │      │
User  ├─────┤
Input │ STT │
      └─────┴──────┬─────────────────────────────────────────────
                   │
Search             ├───────┬────────────────────────────────────
                   │ Brave │
                   └───────┴──────┬────────────────────────────
                                  │
LLM                               ├──────────┬─────────────────
                                  │ Narrative│
                                  └──────────┴─────┬───────────
                                                   │
TTS                                                ├─────┬─────
                                                   │ EL  │
                                                   └─────┴─┬───
                                                           │
Anam                                                       ├────
                                                           │ Gen
                                                           │ Video
                                                           └────┬
Display                                                         ├──▶
                                                                │Play
                                                                └───▶

Legend:
STT   = Speech-to-Text (Whisper)      ~2-5s
Brave = Brave Search                  ~1-3s
LLM   = Narrative Generation          ~2-5s
EL    = ElevenLabs TTS                ~1-3s
Gen   = Anam Video Generation         ~10-30s
Play  = Display and playback          instant

Total: ~16-46 seconds (typical: ~25s)
```

---

## State Machine

```
┌─────────┐
│  IDLE   │
└────┬────┘
     │ User submits query
     ▼
┌─────────────┐
│ TRANSCRIBING│ (if voice input)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  SEARCHING  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ GENERATING  │ (narrative)
│  RESPONSE   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ GENERATING  │ (TTS)
│   AUDIO     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ GENERATING  │ (Anam)
│   VIDEO     │
└──────┬──────┘
       │
       ├─ Success ─┐
       │           │
       ▼           ▼
   ┌────────┐  ┌──────────┐
   │ ERROR  │  │ COMPLETE │
   └────────┘  └─────┬────┘
                     │
                     ▼
              ┌─────────────┐
              │  PLAYING    │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │   IDLE      │
              └─────────────┘
```

---

## Security Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Public Internet                          │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            ▼ HTTPS only
┌────────────────────────────────────────────────────────────────┐
│                    Frontend (Browser)                           │
│  - No API keys stored                                           │
│  - Only has Supabase anon key (safe to expose)                  │
│  - Makes authenticated requests via Supabase                    │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            ▼ Authenticated via anon key
┌────────────────────────────────────────────────────────────────┐
│                    Supabase Edge Functions                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ API Keys stored as secrets:                              │  │
│  │  - ANAM_API_KEY         (injected at runtime)            │  │
│  │  - ELEVENLAB_API_KEY    (injected at runtime)            │  │
│  │  - OPENAI_API_KEY       (injected at runtime)            │  │
│  │                                                          │  │
│  │ ✅ Keys never exposed to frontend                        │  │
│  │ ✅ Keys never in logs                                    │  │
│  │ ✅ Keys never in responses                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            ▼ API calls with keys
┌────────────────────────────────────────────────────────────────┐
│                    External APIs                                │
│  - Anam AI           (receives ANAM_API_KEY)                    │
│  - ElevenLabs        (receives ELEVENLAB_API_KEY)               │
│  - OpenAI            (receives OPENAI_API_KEY)                  │
└────────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      Developer Machine                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Source Code:                                             │  │
│  │  - Frontend: src/services/legacy-search/avatar/                 │  │
│  │  - Functions: supabase/functions/anam-avatar/            │  │
│  │  - Config: .env                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
┌───────────────────────┐   ┌───────────────────────┐
│ Netlify/Vercel        │   │ Supabase Dashboard    │
│ (Frontend Deploy)     │   │ (Function Deploy)     │
│  - npm run build      │   │  - Manual upload      │
│  - Deploy to CDN      │   │  - Or CLI deploy      │
└───────────────────────┘   └───────────┬───────────┘
                                        │
                            ┌───────────┴───────────┐
                            │  Secrets configured   │
                            │  in Dashboard         │
                            └───────────────────────┘
```

---

**This diagram system provides a complete visual reference for the Anam avatar implementation.**
