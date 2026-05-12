# Resilient Cinematic Service Refactor Plan

**Goal:** Make cinematic video generation resilient to VEO API time variations with Pexels fallback
**Strategy:** Sequential processing, max 2 concurrent, VEO timeout → Pexels fallback

## Current Problems

1. ❌ **All scenes process in parallel** - Hard to manage, overwhelming
2. ❌ **VEO can take 2-5 minutes** - Users wait with no fallback
3. ❌ **No queue management** - All requests sent at once
4. ❌ **No fallback** - If VEO fails, entire scene fails
5. ❌ **Too many scenes** - 3-4 scenes × 5 min each = 15-20 min wait

## New Architecture

### Core Principles

1. **Sequential with Limited Concurrency**
   - Process scenes in order (scene 1, then 2, then 3)
   - Max 2 scenes processing simultaneously
   - Wait 8 seconds between initiating new scenes

2. **Simple State Machine**
   ```
   CREATED → PROCESSING → COMPLETED (success)
                       → FAILED → PEXELS_FALLBACK
   ```

3. **Timeouts & Retries**
   - VEO timeout: 30 seconds for initial response
   - Poll interval: 8 seconds (video duration)
   - Retry once on failure
   - Fallback to Pexels on second failure

4. **Shorter Videos**
   - **2-4 scenes max** (down from 3-5)
   - VEO: 8 seconds per scene
   - Pexels: Cap at 10 seconds per scene
   - Total video: 16-40 seconds (vs current 24-40)

## Implementation Plan

### Phase 1: Scene Queue Manager

**New File:** `src/services/cinematic/queue/SceneQueueManager.ts`

```typescript
interface SceneTask {
  id: string;
  scene: CinematicScene;
  status: 'created' | 'processing' | 'completed' | 'failed';
  provider: 'veo' | 'pexels' | null;
  retryCount: number;
  startTime: number | null;
  completedTime: number | null;
}

class SceneQueueManager {
  private queue: SceneTask[] = [];
  private maxConcurrent = 2;
  private staggerDelayMs = 8000; // 8 seconds

  async processQueue(
    scenes: CinematicScene[],
    onProgress: (task: SceneTask) => void
  ): Promise<CinematicScene[]> {
    // Initialize queue
    this.queue = scenes.map(scene => ({
      id: scene.id,
      scene,
      status: 'created',
      provider: null,
      retryCount: 0,
      startTime: null,
      completedTime: null,
    }));

    // Process sequentially with max 2 concurrent
    while (this.hasUnprocessedTasks()) {
      await this.processNextBatch();
      await this.pollActiveTasksOnce();
      await delay(8000); // Check every 8 seconds
    }

    return this.queue.map(task => task.scene);
  }

  private async processNextBatch(): Promise<void> {
    const processing = this.queue.filter(t => t.status === 'processing').length;
    const available = this.maxConcurrent - processing;

    if (available > 0) {
      const nextTasks = this.queue
        .filter(t => t.status === 'created')
        .slice(0, available);

      for (const task of nextTasks) {
        await this.startTask(task);
        await delay(this.staggerDelayMs); // Wait 8s between starts
      }
    }
  }

  private async startTask(task: SceneTask): Promise<void> {
    task.status = 'processing';
    task.startTime = Date.now();

    try {
      // Try VEO first
      const result = await this.tryVeo(task);
      if (result.success) {
        this.completeTask(task, result.videoUrl, 'veo');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      await this.handleTaskFailure(task, error);
    }
  }

  private async handleTaskFailure(task: SceneTask, error: unknown): Promise<void> {
    task.retryCount++;

    // Retry once
    if (task.retryCount === 1) {
      logger.warn('[SceneQueue] Retrying VEO', { sceneId: task.id });
      task.status = 'created'; // Retry
      return;
    }

    // Fallback to Pexels after second failure
    logger.info('[SceneQueue] Falling back to Pexels', { sceneId: task.id });
    try {
      const result = await this.tryPexels(task);
      this.completeTask(task, result.videoUrl, 'pexels');
    } catch (pexelsError) {
      task.status = 'failed';
      task.scene.status = 'failed';
      task.scene.error = 'Both VEO and Pexels failed';
    }
  }
}
```

### Phase 2: VEO Provider with Timeout

**Update:** `src/services/cinematic/providers/VeoVertexProvider.ts`

```typescript
class VeoVertexProvider {
  async generateWithTimeout(
    request: VideoGenerationRequest,
    options: {
      initialTimeout?: number; // Default 30s
      pollInterval?: number;   // Default 8s
      maxPolls?: number;       // Default 20 (2.6 minutes)
    } = {}
  ): Promise<VideoGenerationResult> {
    const {
      initialTimeout = 30000,  // 30 seconds to get operation started
      pollInterval = 8000,     // 8 seconds between polls
      maxPolls = 20,          // Max 20 polls = 2.6 minutes
    } = options;

    // Start generation with timeout
    const operation = await Promise.race([
      this.generate(request),
      this.timeout(initialTimeout, 'VEO generation timeout')
    ]);

    // Poll for completion
    for (let i = 0; i < maxPolls; i++) {
      await delay(pollInterval);

      const status = await this.checkStatus(operation.operation);
      if (status.done) {
        return { ...status, operation: operation.operation };
      }
    }

    throw new Error('VEO polling timeout');
  }

  private timeout<T>(ms: number, message: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }
}
```

### Phase 3: Pexels Fallback Provider

**New File:** `src/services/cinematic/providers/PexelsFallbackProvider.ts`

```typescript
interface PexelsVideo {
  url: string;
  duration: number;
  width: number;
  height: number;
}

class PexelsFallbackProvider {
  private apiKey = import.meta.env.VITE_PEXELS_API_KEY;

  async searchVideo(query: string, aspectRatio: '16:9' | '1:1'): Promise<PexelsVideo> {
    // Search Pexels for relevant video
    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5&orientation=${aspectRatio === '1:1' ? 'square' : 'landscape'}`,
      {
        headers: {
          Authorization: this.apiKey,
        },
      }
    );

    const data = await response.json();

    if (!data.videos || data.videos.length === 0) {
      throw new Error('No Pexels videos found');
    }

    // Get first video, prefer HD quality
    const video = data.videos[0];
    const file = video.video_files.find((f: any) =>
      f.quality === 'hd' && f.width >= 1280
    ) || video.video_files[0];

    return {
      url: file.link,
      duration: Math.min(video.duration, 10), // Cap at 10 seconds
      width: file.width,
      height: file.height,
    };
  }
}
```

### Phase 4: Director Refactor (Shorter Videos)

**Update:** `src/services/cinematic/agents/DirectorAgent.ts`

```typescript
const DIRECTOR_PROMPT = `
You are a cinematic video director. Create a compelling visual story.

RULES:
- Generate exactly 2-4 scenes (prefer 3 for balance)
- Each scene is 8 seconds
- Total video: 16-32 seconds
- Focus on key moments, not comprehensive coverage
- Each scene should be visually distinct

Output JSON with 2-4 scenes.
`;

interface DirectorOutput {
  title: string;
  description: string;
  scenes: Array<{
    id: string;
    title: string;
    visualPrompt: string; // For VEO or Pexels search
    narration: string;
  }>;
}

// Validation
function validateDirectorOutput(output: DirectorOutput): void {
  if (output.scenes.length < 2 || output.scenes.length > 4) {
    throw new Error(`Invalid scene count: ${output.scenes.length}. Must be 2-4 scenes.`);
  }
}
```

### Phase 5: Main Service Integration

**Update:** `src/services/cinematic/cinematicService.ts`

```typescript
export async function generateCompleteCinematicVideo(
  query: string,
  options: CinematicOptions
): Promise<CinematicExperience> {
  // Step 1: Research (unchanged)
  const sources = await searchSources(query);

  // Step 2: Generate 2-4 scenes (updated)
  const director = new DirectorAgent();
  const plan = await director.createPlan(query, sources);

  if (plan.scenes.length < 2 || plan.scenes.length > 4) {
    throw new Error('Director must create 2-4 scenes');
  }

  // Step 3: Process scenes with queue (NEW)
  const queueManager = new SceneQueueManager({
    maxConcurrent: 2,
    staggerDelayMs: 8000,
    veoTimeout: 30000,
    veoMaxPolls: 20,
  });

  const completedScenes = await queueManager.processQueue(
    plan.scenes,
    (task) => {
      onProgress?.({
        stage: 'generating',
        message: `Scene ${task.scene.title}: ${task.status}`,
        progress: calculateProgress(task),
        scenes: queueManager.getAllScenes(),
      });
    }
  );

  return {
    ...plan,
    scenes: completedScenes,
  };
}
```

## State Transitions

```
Scene Lifecycle:

CREATED
  ↓
PROCESSING (VEO attempt 1)
  ↓
  ├─→ COMPLETED (VEO success) ✅
  ↓
PROCESSING (VEO attempt 2, retry)
  ↓
  ├─→ COMPLETED (VEO success) ✅
  ↓
PROCESSING (Pexels fallback)
  ↓
  ├─→ COMPLETED (Pexels success) ✅
  ↓
FAILED (both failed) ❌
```

## Queue Processing Example

```
Time    | Scene 1      | Scene 2      | Scene 3      | Action
--------|--------------|--------------|--------------|------------------
0:00    | CREATED      | CREATED      | CREATED      | Start Scene 1
0:00    | PROCESSING   | CREATED      | CREATED      | VEO call
0:08    | PROCESSING   | CREATED      | CREATED      | Wait (stagger)
0:08    | PROCESSING   | PROCESSING   | CREATED      | Start Scene 2
0:16    | PROCESSING   | PROCESSING   | CREATED      | Poll both
0:24    | PROCESSING   | PROCESSING   | CREATED      | Poll both
0:32    | COMPLETED ✅ | PROCESSING   | CREATED      | Scene 1 done!
0:32    | COMPLETED    | PROCESSING   | PROCESSING   | Start Scene 3
0:40    | COMPLETED    | COMPLETED ✅ | PROCESSING   | Scene 2 done!
0:48    | COMPLETED    | COMPLETED    | COMPLETED ✅ | All done!
```

## Benefits

### User Experience
- ✅ **Faster results** - Shorter videos (2-4 scenes vs 3-5)
- ✅ **Reliable** - Pexels fallback ensures completion
- ✅ **Progress visible** - See each scene status
- ✅ **No freezing** - Max 2.6 min wait per scene

### System Resilience
- ✅ **Controlled load** - Max 2 concurrent VEO calls
- ✅ **Graceful degradation** - Falls back to Pexels
- ✅ **Retry logic** - One retry before fallback
- ✅ **Timeout protection** - Won't wait forever

### Developer Experience
- ✅ **Simple state machine** - Easy to debug
- ✅ **Sequential processing** - Predictable behavior
- ✅ **Reusable queue** - Can apply to other services
- ✅ **Clear logging** - Track every state change

## Migration Path

### Step 1: Add Pexels Provider (Low Risk)
- Create `PexelsFallbackProvider.ts`
- Test independently
- No impact on existing code

### Step 2: Add Queue Manager (Medium Risk)
- Create `SceneQueueManager.ts`
- Test with mock scenes
- Add feature flag to toggle old/new behavior

### Step 3: Update VEO Provider (Low Risk)
- Add `generateWithTimeout` method
- Keep existing methods working
- Gradual migration

### Step 4: Update Director (Low Risk)
- Change scene count to 2-4
- Update prompts
- Existing code still works

### Step 5: Integration (High Risk)
- Update `cinematicService.ts` to use queue
- Feature flag: `USE_QUEUE_MANAGER`
- A/B test with users
- Monitor error rates

### Step 6: Cleanup (Low Risk)
- Remove old parallel processing
- Remove feature flags
- Update documentation

## Testing Strategy

### Unit Tests
```typescript
describe('SceneQueueManager', () => {
  it('processes max 2 concurrent scenes', async () => {
    const queue = new SceneQueueManager({ maxConcurrent: 2 });
    const scenes = createMockScenes(5);

    await queue.processQueue(scenes);

    expect(queue.getMaxConcurrentReached()).toBe(2);
  });

  it('falls back to Pexels after VEO failure', async () => {
    const queue = new SceneQueueManager();
    const scene = createMockScene();

    // Mock VEO to fail twice
    mockVeoProvider.fail();

    await queue.processQueue([scene]);

    expect(scene.provider).toBe('pexels');
    expect(scene.status).toBe('completed');
  });
});
```

### Integration Tests
```typescript
describe('Cinematic Service Integration', () => {
  it('generates 2-4 scenes with VEO/Pexels mix', async () => {
    const result = await generateCompleteCinematicVideo('Test query');

    expect(result.scenes.length).toBeGreaterThanOrEqual(2);
    expect(result.scenes.length).toBeLessThanOrEqual(4);

    const completed = result.scenes.filter(s => s.status === 'completed');
    expect(completed.length).toBe(result.scenes.length);
  });
});
```

## Rollout Plan

### Week 1: Foundation
- [ ] Create `PexelsFallbackProvider`
- [ ] Create `SceneQueueManager`
- [ ] Add unit tests
- [ ] Documentation

### Week 2: VEO Updates
- [ ] Add timeout to VEO provider
- [ ] Update polling logic
- [ ] Test with real API

### Week 3: Director Updates
- [ ] Update prompts for 2-4 scenes
- [ ] Test output quality
- [ ] Validate scene count

### Week 4: Integration
- [ ] Integrate queue into service
- [ ] Add feature flag
- [ ] Test end-to-end

### Week 5: Rollout
- [ ] Enable for 10% of users
- [ ] Monitor metrics
- [ ] Fix issues

### Week 6: Cleanup
- [ ] Enable for 100%
- [ ] Remove old code
- [ ] Update docs

## Metrics to Track

### Before vs After
| Metric | Before | Target After |
|--------|--------|--------------|
| Average completion time | 15-20 min | 3-5 min |
| Success rate | 60-70% | 95%+ |
| User satisfaction | Low | High |
| VEO timeout rate | 30% | 5% |
| Pexels fallback rate | N/A | 15-20% |

## Summary

This refactor makes the cinematic service **resilient, fast, and reliable** by:
1. Processing sequentially with limited concurrency
2. Adding Pexels fallback for failed VEO scenes
3. Reducing video length to 2-4 scenes
4. Adding proper timeouts and retries
5. Implementing a simple, debuggable queue system

**Result:** Users get completed videos in 3-5 minutes instead of waiting 15-20 minutes or getting failures.
