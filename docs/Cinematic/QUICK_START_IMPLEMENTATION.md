# Quick Start: Resilient Cinematic Implementation

**Priority:** Start with smallest, highest-impact changes first

## Phase 1: Quick Wins (Do This First) 🚀

### 1. Reduce Scene Count (5 minutes)

**File:** `src/services/cinematic/agents/DirectorAgent.ts`

Change scene count from 3-5 to 2-4:

```typescript
// BEFORE
const sceneCount = Math.min(3 + Math.floor(Math.random() * 3), 5); // 3-5

// AFTER
const sceneCount = Math.min(2 + Math.floor(Math.random() * 3), 4); // 2-4
```

**Impact:** Immediate 20-40% reduction in wait time

### 2. Add VEO Timeout (10 minutes)

**File:** `src/services/cinematic/cinematicService.ts`

Add timeout to polling loop:

```typescript
async function waitForOperation(operationName: string) {
  const MAX_WAIT_MS = 150000; // 2.5 minutes max per scene
  const startTime = Date.now();

  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt += 1) {
    // Check if exceeded max wait time
    if (Date.now() - startTime > MAX_WAIT_MS) {
      throw new Error(`VEO operation timeout after ${MAX_WAIT_MS / 1000}s`);
    }

    await delay(POLL_INTERVAL_MS);
    const status = await veoProvider.checkStatus(operationName);

    if (status.done) {
      return status;
    }
  }

  throw new Error('VEO polling timeout');
}
```

**Impact:** Prevents infinite waits, clear error after 2.5 min

### 3. Sequential Processing (30 minutes)

**File:** `src/services/cinematic/cinematicService.ts`

Change from `Promise.all()` to sequential:

```typescript
// BEFORE - All parallel
await Promise.all(
  scenesState.map(async (scene, index) => {
    // Process scene
  })
);

// AFTER - Sequential with max 2 concurrent
const processedScenes = [];
for (let i = 0; i < scenesState.length; i += 2) {
  const batch = scenesState.slice(i, i + 2); // Take 2 scenes

  const results = await Promise.all(
    batch.map(async (scene, batchIndex) => {
      const delay = batchIndex * 8000; // Stagger by 8s
      await new Promise(resolve => setTimeout(resolve, delay));

      return await processScene(scene);
    })
  );

  processedScenes.push(...results);
}
```

**Impact:** Controlled load, max 2 VEO calls at a time

## Phase 2: Pexels Fallback (1-2 hours)

### 1. Create Pexels Provider

**New File:** `src/services/cinematic/providers/PexelsFallbackProvider.ts`

```typescript
export class PexelsFallbackProvider {
  private apiKey = import.meta.env.VITE_PEXELS_API_KEY;

  async getVideo(query: string, aspectRatio: '16:9' | '1:1'): Promise<string> {
    const orientation = aspectRatio === '1:1' ? 'square' : 'landscape';

    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3&orientation=${orientation}`,
      { headers: { Authorization: this.apiKey } }
    );

    const data = await response.json();

    if (!data.videos?.[0]) {
      throw new Error('No Pexels videos found');
    }

    // Get HD file
    const video = data.videos[0];
    const hdFile = video.video_files.find((f: any) =>
      f.quality === 'hd' && f.width >= 1280
    ) || video.video_files[0];

    return hdFile.link;
  }
}
```

### 2. Add Fallback Logic

**File:** `src/services/cinematic/cinematicService.ts`

```typescript
import { PexelsFallbackProvider } from './providers/PexelsFallbackProvider';

const pexelsProvider = new PexelsFallbackProvider();

async function processScene(scene: CinematicScene): Promise<CinematicScene> {
  scene.status = 'generating';

  try {
    // Try VEO
    const result = await processSceneWithVeo(scene);
    return result;
  } catch (veoError) {
    logger.warn('[CinematicService] VEO failed, trying Pexels', {
      sceneId: scene.id,
      error: veoError,
    });

    try {
      // Fallback to Pexels
      const videoUrl = await pexelsProvider.getVideo(
        scene.visualPrompt,
        aspectRatio
      );

      scene.videoUrl = videoUrl;
      scene.status = 'ready';
      scene.provider = 'pexels';

      logger.info('[CinematicService] Pexels fallback successful', {
        sceneId: scene.id,
      });

      return scene;
    } catch (pexelsError) {
      scene.status = 'failed';
      scene.error = 'Both VEO and Pexels failed';
      throw pexelsError;
    }
  }
}
```

**Impact:** 95%+ success rate even when VEO fails

## Phase 3: Environment Setup

### 1. Add Pexels API Key

**File:** `.env`

```bash
VITE_PEXELS_API_KEY=your_api_key_here
```

Get API key from: https://www.pexels.com/api/

### 2. Update Types

**File:** `src/services/cinematic/types.ts`

```typescript
export interface CinematicScene {
  id: string;
  title: string;
  narration: string;
  visualPrompt: string;
  videoUrl?: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  provider?: 'veo' | 'pexels'; // NEW
  error?: string;
  operationName?: string;
}
```

## Testing Checklist

### Test Scenario 1: All VEO Success
```
Query: "How does photosynthesis work?"
Expected: 2-4 scenes, all from VEO, completes in ~3-5 min
```

### Test Scenario 2: VEO Timeout → Pexels
```
Query: "Abstract concepts in quantum physics"
Expected: Some scenes from Pexels (VEO struggles with abstract)
```

### Test Scenario 3: Sequential Processing
```
Open browser console
Watch logs:
- Should see "Scene 1 processing"
- Then "Scene 2 processing" (not both at same time if >2 scenes)
- Max 2 concurrent
```

## Rollout Strategy

### Week 1: Test Internally
- [ ] Implement Phase 1 changes
- [ ] Test with 5-10 queries
- [ ] Fix any bugs

### Week 2: Add Pexels
- [ ] Get Pexels API key
- [ ] Implement fallback
- [ ] Test with failing VEO scenarios

### Week 3: Monitor
- [ ] Deploy to production
- [ ] Watch error rates
- [ ] Track VEO vs Pexels usage

## Success Metrics

Track these before/after:

```typescript
// Add telemetry
logger.info('[CinematicService] Generation complete', {
  totalScenes: scenes.length,
  veoScenes: scenes.filter(s => s.provider === 'veo').length,
  pexelsScenes: scenes.filter(s => s.provider === 'pexels').length,
  failedScenes: scenes.filter(s => s.status === 'failed').length,
  totalTimeMs: Date.now() - startTime,
});
```

**Target Metrics:**
- ✅ Completion time: < 5 minutes
- ✅ Success rate: > 95%
- ✅ Pexels fallback: 10-20% of scenes
- ✅ User satisfaction: High

## Summary

**Start with Phase 1** (quick wins):
1. Reduce to 2-4 scenes (5 min)
2. Add VEO timeout (10 min)
3. Sequential processing (30 min)

**Then Phase 2** (fallback):
4. Create Pexels provider (1 hour)
5. Add fallback logic (1 hour)

**Total time:** ~3-4 hours for a dramatically more resilient system

The full queue-based refactor from the detailed plan can come later if needed, but these changes will solve 90% of the current issues immediately.
