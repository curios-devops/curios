# Phase 6 Optimization Fix Summary

## Issues Identified

1. **Security Issue**: `BRAVE_API_KEY` being checked in frontend (should only be in Supabase Edge Function)
2. **Cost Issue**: Making 2-3 separate Brave API calls per video ($0.01-$0.03 per video)

## Solutions Implemented

###  1. Fixed Brave API Key Check (braveImageService.ts)

**Before:**
```typescript
const BRAVE_API_KEY = import.meta.env.BRAVE_API_KEY || '';
this.enabled = !!BRAVE_API_KEY;
```

**After:**
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
this.enabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
```

**Why**: The Brave API key should NEVER be in the frontend. It's stored securely in Supabase Edge Function secrets.

### 2. Optimize to Single API Call (imageAssetAgent.ts - TO BE IMPLEMENTED)

**Current Flow** (EXPENSIVE):
```
Video Generation
├─→ Scene 1 (explain) → Brave API Call #1 → $0.005
├─→ Scene 2 (explain) → Brave API Call #2 → $0.005  
└─→ Scene 3 (takeaway) → Brave API Call #3 → $0.005
Total: 3 API calls = $0.015 per video
```

**Optimized Flow** (COST-EFFECTIVE):
```
Video Generation
└─→ ONE Brave API Call (request 6-10 images) → $0.005
    ├─→ Select best image for Scene 1
    ├─→ Select best image for Scene 2
    └─→ Select best image for Scene 3
Total: 1 API call = $0.005 per video
```

**Cost Savings**: 67% reduction ($0.015 → $0.005)

## Implementation Plan

The optimization requires replacing lines 99-155 in `imageAssetAgent.ts`:

### Current Code (Multiple API Calls):
```typescript
// Fetch images for selected scenes
for (const { scene, index } of selectedScenes) {
  const mood = this.getMoodFromStyle(scene.style);
  const images = await this.braveService.searchForScene(scene.text, mood, { count: 5 });
  // ... assign image ...
  await this.delay(1000); // Rate limiting
}
```

### Optimized Code (Single API Call):
```typescript
// OPTIMIZATION: Make ONE API call for all scenes
const firstScene = selectedScenes[0].scene;
const mood = this.getMoodFromStyle(firstScene.style);
const requestCount = Math.min(selectedScenes.length * 3, 10);

// Single API call
const allImages = await this.braveService.searchForScene(
  firstScene.text,
  mood,
  { count: requestCount }
);

// Select best images from the pool
const bestImages = this.braveService.selectBestImages(allImages, selectedScenes.length);

// Assign to scenes (no more API calls!)
selectedScenes.forEach(({ scene, index }, i) => {
  const selectedImage = bestImages[i];
  // ... assign image ...
});
```

## Benefits

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| API Calls | 2-3 per video | 1 per video | 67% reduction |
| Cost | $0.015/video | $0.005/video | $0.01 savings |
| Time | 3-6 seconds | 1-2 seconds | 50-67% faster |
| Rate Limits | Risk at scale | Minimal risk | Better scaling |

## Monthly Cost Projection

| Videos/Month | Old Cost | New Cost | Savings |
|--------------|----------|----------|---------|
| 1,000 | $15 | $5 | $10/month |
| 10,000 | $150 | $50 | $100/month |
| 100,000 | $1,500 | $500 | $1,000/month |

## Next Steps

1. ✅ Fixed braveImageService.ts security issue
2. ⏳ Need to apply optimization to imageAssetAgent.ts (lines 99-155)
3. ⏳ Test with Phase6TestPage
4. ⏳ Verify only 1 API call in console logs

## Testing Verification

After implementing optimization, check console logs:

**Expected Log**:
```
[Image Asset Agent] Making single Brave API call
  requestCount: 6
  scenesToCover: 2

[Brave Image Service] Search results
  totalResults: 15
  imagesReturned: 6

[Image Asset Agent] Selected best images
  totalReturned: 6
  bestSelected: 2

[Image Asset Agent] Key-point images assigned (OPTIMIZED: 1 API call)
  totalImages: 2
  failedScenes: 0
  strategy: "key-points-optimized"
  apiCalls: 1  ← VERIFY THIS IS 1!
```

## Configuration Note

Remove `BRAVE_API_KEY` from `.env` file - it should only exist in:
- Supabase Dashboard → Edge Functions → Secrets
- As `BRAVE_API_KEY` secret for the `brave-images-search` function

The frontend never needs direct access to this key!
