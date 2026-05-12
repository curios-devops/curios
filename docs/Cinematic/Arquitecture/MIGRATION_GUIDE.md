# 🔄 Cinematic Feature Migration Guide

**Purpose:** Guide for migrating from the old Cinematic implementation to the new refactored version

---

## 🆚 Key Differences

### Old Implementation
```typescript
// Generated individual scenes only
const experience = await generateCinematicExperience(query, {
  aspectRatio: '16:9',
  userId,
  onProgress
});

// Scenes played sequentially in full-width player
<CinematicPlayer video={cinematicVideo} />
```

### New Implementation
```typescript
// Generates complete video with stitching, narration, and overlays
const experience = await generateCompleteCinematicVideo(query, {
  aspectRatio: '16:9',
  userId,
  enableNarration: true,
  enableTextOverlay: true,
  onProgress
});

// Full video as hero + scene preview cards
<CinematicPlayerRefactored
  experience={experience}
  aspectRatio="16:9"
  userId={userId}
/>
```

---

## 📦 Migration Steps

### Step 1: Update Imports

**Before:**
```typescript
import { generateCinematicExperience } from '@/services/cinematic/cinematicService';
import { CinematicPlayer } from '@/components/cinematic';
```

**After:**
```typescript
import {
  generateCompleteCinematicVideo,  // Use this for full video
  generateCinematicExperience       // Or keep this for scenes-only
} from '@/services/cinematic/cinematicService';

import {
  CinematicPlayerRefactored,  // New refactored player
  CinematicPlayer              // Old player (still works)
} from '@/components/cinematic';
```

### Step 2: Update Service Call

**Before:**
```typescript
const experience = await generateCinematicExperience(query, {
  aspectRatio: '16:9',
  userId: user.id,
  onProgress: (progress) => {
    setProgress(progress);
  }
});
```

**After:**
```typescript
const experience = await generateCompleteCinematicVideo(query, {
  aspectRatio: '16:9',
  userId: user.id,
  enableNarration: true,      // NEW: Enable voice narration
  enableTextOverlay: true,    // NEW: Enable text overlays
  onProgress: (progress) => {
    // NEW progress stage: 'composing'
    setProgress(progress);
  }
});

// NEW: experience now includes fullVideoUrl and id
console.log(experience.fullVideoUrl); // URL to complete video
console.log(experience.id);           // Saved video ID
```

### Step 3: Update Component Usage

**Before:**
```typescript
<CinematicPlayer
  video={cinematicVideo}
  onRegenerate={handleRegenerate}
/>
```

**After:**
```typescript
<CinematicPlayerRefactored
  experience={experience}
  aspectRatio="16:9"
  userId={user.id}
  onRegenerate={handleRegenerate}
/>
```

### Step 4: Handle Progress Stages

**Before (5 stages):**
- `planning` → `research` → `directing` → `generating` → `complete`

**After (6 stages):**
- `planning` → `research` → `directing` → `generating` → **`composing`** → `complete`

**Update your progress handler:**
```typescript
const handleProgress = (progress: CinematicProgress) => {
  switch (progress.stage) {
    case 'planning':
      return 'Planning your video...';
    case 'research':
      return 'Researching sources...';
    case 'directing':
      return 'Directing scenes...';
    case 'generating':
      return 'Generating video clips...';
    case 'composing':  // NEW STAGE
      return 'Composing final video...';
    case 'complete':
      return 'Complete!';
  }
};
```

---

## 🔧 Backward Compatibility

### Option 1: Keep Old Behavior (Scenes Only)
```typescript
// Use original function - no changes needed
const experience = await generateCinematicExperience(query, options);

// Use original player - no changes needed
<CinematicPlayer video={video} />
```

### Option 2: Gradual Migration (Both Players)
```typescript
// Generate with new service
const experience = await generateCompleteCinematicVideo(query, options);

// But use old player format (convert back)
const video: CinematicVideo = {
  id: experience.id || crypto.randomUUID(),
  query: experience.rewrittenQuery,
  recipe: {
    videoId: experience.id || '',
    query: experience.rewrittenQuery,
    category: 'general',
    scenes: experience.scenes.map((scene, index) => ({
      ...scene,
      index,
      type: 'explanation',
      // ... map other fields
    })),
    totalDuration: experience.totalDurationSeconds,
    format: 'horizontal',
    aspectRatio: '16:9',
    createdAt: new Date()
  },
  status: 'complete',
  progress: 100,
  currentStage: 'Complete',
  sceneVideos: new Map(
    experience.scenes
      .filter(s => s.videoUrl)
      .map(s => [s.id, s.videoUrl!])
  ),
  finalVideoUrl: experience.fullVideoUrl,
  title: experience.title,
  description: experience.description,
  duration: experience.totalDurationSeconds,
  format: 'horizontal',
  createdAt: new Date()
};

<CinematicPlayer video={video} />
```

### Option 3: Full Migration (Recommended)
```typescript
// Use new service
const experience = await generateCompleteCinematicVideo(query, options);

// Use new player
<CinematicPlayerRefactored
  experience={experience}
  aspectRatio="16:9"
  userId={user.id}
/>
```

---

## 🗄️ Database Migration

### Run Migration
```bash
# Apply database schema
supabase db push

# Or manually
psql -f supabase/migrations/20260408_cinematic_videos.sql
```

### Verify Tables
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'cinematic%';

-- Expected:
-- cinematic_videos
-- cinematic_video_likes
-- cinematic_video_saves
-- cinematic_video_feedback
```

### Check Storage Bucket
```sql
SELECT * FROM storage.buckets WHERE name = 'cinematic-assets';
```

If bucket doesn't exist:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('cinematic-assets', 'cinematic-assets', true);
```

---

## 🌐 Deploy Edge Functions

### Deploy All Functions
```bash
# Deploy stitching function
supabase functions deploy stitch-cinematic-video

# Deploy audio mixing
supabase functions deploy mix-cinematic-audio

# Deploy text overlay
supabase functions deploy add-text-overlay
```

### Test Functions
```bash
# Test stitch function
curl -X POST \
  https://your-project.supabase.co/functions/v1/stitch-cinematic-video \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "scenes": [
      {"id": "1", "videoUrl": "https://...", "duration": 8, "order": 0}
    ],
    "userId": "test-user",
    "videoId": "test-video",
    "aspectRatio": "16:9"
  }'
```

---

## ⚙️ Environment Variables

### Required Variables
```bash
# Existing (should already be set)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# New (if using narration)
VITE_ELEVENLABS_TTS_URL=https://your-project.supabase.co/functions/v1/elevenlabs-tts
VITE_OPENAI_TTS_URL=https://your-project.supabase.co/functions/v1/openai-tts
```

### Check Variables
```typescript
// In your app, verify:
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Has TTS URLs:', {
  elevenlabs: !!import.meta.env.VITE_ELEVENLABS_TTS_URL,
  openai: !!import.meta.env.VITE_OPENAI_TTS_URL
});
```

---

## 🧪 Testing Migration

### 1. Test Individual Components

**ScenePreviewCard:**
```typescript
<ScenePreviewCard
  sceneId="test-1"
  title="Test Scene"
  videoUrl="https://..."
  duration={8}
  narration="Test narration"
  status="ready"
/>
```

**FullVideoPlayer:**
```typescript
<FullVideoPlayer
  videoUrl="https://..."
  title="Test Video"
  description="Test description"
  duration={30}
  aspectRatio="16:9"
/>
```

**EngagementBar:**
```typescript
<EngagementBar
  videoId="test-id"
  videoUrl="https://..."
  title="Test"
  description="Test"
  onLike={() => console.log('liked')}
  onSave={() => console.log('saved')}
  onShare={(platform) => console.log('shared:', platform)}
  onFeedback={(text) => console.log('feedback:', text)}
/>
```

### 2. Test Service Integration

```typescript
// Test scenes-only generation (old)
const experienceOld = await generateCinematicExperience('test query', {
  aspectRatio: '16:9',
  userId: 'test-user'
});
console.log('Scenes only:', experienceOld);

// Test full video generation (new)
const experienceNew = await generateCompleteCinematicVideo('test query', {
  aspectRatio: '16:9',
  userId: 'test-user',
  enableNarration: false,  // Disable for faster testing
  enableTextOverlay: false
});
console.log('Full video:', experienceNew);
```

### 3. Test Database Operations

```typescript
const persistence = new VideoPersistenceService();

// Test save
const videoId = await persistence.saveCinematicVideo(
  experience,
  'https://...',
  'path/to/video',
  'user-id',
  '16:9'
);

// Test like
await persistence.toggleLike(videoId, 'user-id');

// Test save
await persistence.toggleSave(videoId, 'user-id');

// Test feedback
await persistence.submitFeedback(videoId, 'user-id', 'Great video!');
```

---

## ⚠️ Common Issues

### Issue 1: FFmpeg Not Found
**Error:** `FFmpeg failed with code 127`

**Solution:**
Edge functions need FFmpeg layer. Add to function config or use Docker image with FFmpeg.

### Issue 2: Storage Upload Fails
**Error:** `Failed to upload stitched video`

**Solution:**
- Check storage bucket exists and is public
- Verify RLS policies allow uploads
- Check file size limits

### Issue 3: Narration Generation Fails
**Error:** `Both TTS providers failed`

**Solution:**
- Check TTS API URLs are configured
- Verify API keys/tokens for ElevenLabs/OpenAI
- Test with `enableNarration: false` first

### Issue 4: Database Permission Error
**Error:** `permission denied for table cinematic_videos`

**Solution:**
```sql
-- Grant permissions
GRANT ALL ON public.cinematic_videos TO authenticated;
GRANT ALL ON public.cinematic_video_likes TO authenticated;
GRANT ALL ON public.cinematic_video_saves TO authenticated;
GRANT ALL ON public.cinematic_video_feedback TO authenticated;
```

---

## 📊 Rollback Plan

If migration causes issues:

### 1. Revert to Old Player
```typescript
// Quick fix: Use old player
import { CinematicPlayer } from '@/components/cinematic';

<CinematicPlayer video={oldFormatVideo} />
```

### 2. Disable New Features
```typescript
// Use new service but disable advanced features
const experience = await generateCompleteCinematicVideo(query, {
  aspectRatio: '16:9',
  userId,
  enableNarration: false,      // Disable
  enableTextOverlay: false,    // Disable
  onProgress
});
```

### 3. Keep Using Old Service
```typescript
// Continue using generateCinematicExperience()
const experience = await generateCinematicExperience(query, options);
```

---

## ✅ Migration Checklist

- [ ] Database migration applied (`20260408_cinematic_videos.sql`)
- [ ] Storage bucket `cinematic-assets` created
- [ ] Edge functions deployed (stitch, mix-audio, text-overlay)
- [ ] Environment variables configured
- [ ] Component imports updated
- [ ] Service calls updated to new function
- [ ] Progress handlers updated for new stage
- [ ] Player component replaced with refactored version
- [ ] Engagement features tested (like/save/share/feedback)
- [ ] Video playback tested
- [ ] Narration generation tested
- [ ] Video stitching tested
- [ ] Database operations tested

---

**Need Help?** See [REFACTORING_COMPLETE.md](./REFACTORING_COMPLETE.md) for full documentation.
