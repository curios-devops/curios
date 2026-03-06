# YouTube-Style Video Description Feature

## Overview
Added a YouTube-style description section to Studio videos that displays below the video title, providing a short, plain-text summary of the video content.

## Implementation Details

### 1. Description Generation (`studioWriterAgent.ts`)

Added `generateDescription()` method that creates a 2-3 sentence summary:

```typescript
private async generateDescription(
  query: string,
  keyIdeas: string
): Promise<string> {
  const messages = [
    {
      role: 'system',
      content: `You are creating a short description for a video.

Question: "${query}"

Key Ideas:
${keyIdeas}

Generate a plain text description (2-3 sentences) that:
- Summarizes what the video is about
- Uses simple, conversational language
- Includes the main insights
- NO conclusion or call-to-action
- Just factual overview

Generate the description now:`
    }
  ];

  return await this.callOpenAI(messages, this.defaultModel);
}
```

**Key Features:**
- Uses non-streaming call (description is short)
- Based on query and key ideas
- No conclusion or CTA (factual overview only)
- Simple, conversational language
- 2-3 sentences maximum

### 2. Updated Interfaces

#### StudioWriterOutput Interface
```typescript
export interface StudioWriterOutput {
  success: boolean;
  keyIdeas: string;
  script: string;
  description?: string;  // New field
  error?: string;
}
```

#### StudioVideo Type
```typescript
export interface StudioVideo {
  id?: string;
  type: StudioOutputType;
  content: string;
  keyIdeas?: string;
  script?: string;
  description?: string;  // New field
  title?: string;
  // ... other fields
}
```

### 3. Workflow Integration (`orchestrator.ts`)

Updated orchestration flow to capture and pass description:

```typescript
// Generate all content with executeWithStreaming
const result = await writerAgent.executeWithStreaming({
  query: prompt,
  onKeyIdeasChunk: (chunk, isComplete) => { /* ... */ },
  onScriptChunk: (chunk, isComplete) => { /* ... */ },
});

// Extract results
keyIdeas = result.keyIdeas;
script = result.script;
description = result.description || '';

// Include in final video
const finalVideo: StudioVideo = {
  // ...
  keyIdeas,
  script,
  description,  // New field
  // ...
};
```

### 4. UI Display (`StudioResults.tsx`)

Added description section below video title and info:

```tsx
{/* Video Description (YouTube-style) */}
{video.description && (
  <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
      {video.description}
    </p>
  </div>
)}
```

**Styling:**
- Light gray background (matches YouTube's subtle box)
- Small text size (text-sm)
- Relaxed line height for readability
- Rounded corners with padding
- Only displays if description exists

## Generation Flow

1. **Key Ideas Generated** → Streamed to UI
2. **Script Generated** → Streamed to UI
3. **Description Generated** → Created from key ideas (non-streaming)
4. **All Content Available** → Description displayed below video title

## Design Rationale

### Why After Key Ideas and Script?
- Description is a summary of the main content
- Requires key ideas to be generated first
- Non-streaming call (fast, short content)
- Generated once script workflow completes

### Why Non-Streaming?
- Description is short (2-3 sentences)
- No need for progressive rendering
- Simpler implementation
- Faster completion

### Why No Conclusion?
- Matches YouTube's description style
- Purely informational/factual
- Avoids promotional language
- Lets content speak for itself

## Visual Layout

```
┌─────────────────────────────────┐
│     [Video Player]              │
└─────────────────────────────────┘

Video Title
30s • Vertical Format • 2 minutes ago

┌─────────────────────────────────┐  ← Description Box
│ This video explores the main    │
│ concepts behind quantum physics, │
│ explaining key principles in    │
│ simple terms.                   │
└─────────────────────────────────┘

[Regenerate] [Share to socials] [Download]
```

## Testing Checklist

- [ ] Description generates for new queries
- [ ] Description displays correctly in UI
- [ ] Description updates on regenerate
- [ ] Description styling matches dark/light mode
- [ ] Description handles long text gracefully
- [ ] Description is optional (doesn't break if missing)
- [ ] Error handling works (description generation fails gracefully)

## Future Enhancements

1. **Expandable Description**: Add "Show more" for longer descriptions
2. **Timestamps in Description**: Link to specific chapters
3. **Hashtags/Tags**: Auto-generate relevant tags
4. **Social Media Variants**: Different descriptions for different platforms

## Related Files

- `/src/services/studio/agents/studioWriterAgent.ts` - Description generation
- `/src/services/studio/agents/orchestrator.ts` - Workflow integration
- `/src/services/studio/types.ts` - Type definitions
- `/src/services/studio/pages/StudioResults.tsx` - UI display

## Related Documentation

- [YOUTUBE_VIDEO_PLAYER.md](./YOUTUBE_VIDEO_PLAYER.md) - Video player implementation
- [YOUTUBE_TIMESTAMPS.md](./YOUTUBE_TIMESTAMPS.md) - Timestamp format
- [STUDIO_UI_REFACTOR.md](./STUDIO_UI_REFACTOR.md) - Overall UI structure
