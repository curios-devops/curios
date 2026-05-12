# 🎬 CinematicAI Service

Cinematic video generation using OpenAI Sora and GPT-4.

## Quick Start

```typescript
import { CinematicOrchestrator } from '@/services/cinematic';

const orchestrator = new CinematicOrchestrator();

const video = await orchestrator.generateCinematicVideo(
  'Why do octopuses have 3 hearts?',
  'vertical',
  (progress) => {
    console.log(`${progress.stage}: ${progress.progress}%`);
  }
);

console.log('Video generated:', video.finalVideoUrl);
```

## Architecture

```
User Query
    ↓
AnswerLLMAgent (GPT-4)
  → Generates structured explanation
    ↓
SceneDirectorAgent
  → Creates 5 cinematic scenes with Sora prompts
    ↓
SoraSceneGenerator
  → Generates videos in parallel (3 at a time)
    ↓
CinematicVideo (24-30 seconds)
```

## Components

### Agents
- **AnswerLLMAgent** - GPT-4 explanation generator
- **SceneDirectorAgent** - Scene planning & Sora prompt engineering
- **SoraSceneGenerator** - Sora API integration
- **CinematicOrchestrator** - Main workflow coordinator

### Providers
- **SoraProvider** - OpenAI Sora API wrapper

### Composers
- **TextOverlayComposer** - Text overlay processing
- **VideoStitcher** - Video stitching (MVP: playlist)

## Scene Structure

1. **Hook** (4s) - Attention-grabbing opening
2. **Explanation** (5s each) - 2-3 key points
3. **Insight** (6s) - Mind-blow moment
4. **Conclusion** (4s) - Satisfying ending

Total: 20-30 seconds

## Configuration

```bash
# .env.local
VITE_OPENAI_API_KEY=sk-...  # Needs Sora access
```

## Cost

- GPT-4: ~$0.02 per video
- Sora: ~$2-4 per video (5 scenes)
- **Total: ~$2-4 per video**

## Generation Time

- Planning: ~5-10s
- Scene generation: ~90-150s
- Composition: ~5s
- **Total: ~2-3 minutes**

## Next Steps

1. Obtain Sora API access from OpenAI
2. Test with real queries
3. Integrate with Studio UI
4. Add caching for popular queries

See [CINEMATICAI_IMPLEMENTATION_SUMMARY.md](../../../CINEMATICAI_IMPLEMENTATION_SUMMARY.md) for full documentation.
