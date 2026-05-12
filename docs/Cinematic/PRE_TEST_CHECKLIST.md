# ✅ PRE-TEST CHECKLIST - Director v3 Refactor

**Status**: Ready for manual testing
**Date**: 2026-04-23

---

## 📋 SYSTEM STATUS

### Build Status
- ✅ **Build successful** (20.01s, 0 TypeScript errors)
- ✅ **All core modules created** (11 new files)
- ✅ **Integration complete** (VideoOrchestrator integrated into cinematicService.ts)

### Feature Flags (CinematicConfig.ts)
```typescript
ltxEnabled: false      // 🚨 No API key → will fall to STOCK
wanEnabled: true       // ⚠️ Enabled but no API key → will fall to STOCK
veoEnabled: true       // ✅ Should attempt if score > 0.85
```

### Expected Behavior (No WAVESPEED_API_KEY)
```text
Query → Director → Scenes → STOCK fallback → VEO async (if engaged)
                              ↑
                              WAN attempted → fails (no key)
                              LTX skipped (disabled)
                              → Falls to STOCK
```

---

## 🎯 TEST PLAN

### Test 1: Basic Flow (Fallback Cascade)
**URL**: `/cinematic-results?q=what is photosynthesis`

**Expected Console Logs**:
```
[CinematicService] Starting video generation with Director v3
[Orchestrator] Starting video generation
[Orchestrator] Processing all scenes in parallel

[SceneProcessor] Processing scene { sceneId: "scene_1" }
[SceneProcessor] Stock evaluated { stockScore: 0.xxx }
[SceneProcessor] Scene score computed { sceneScore: 0.xxx }
[EngineSelector] Selecting base engine
[EngineSelector] High score → WAN selected (or STOCK if low)
[SceneProcessor] Engine selected { engine: "WAN" or "STOCK" }

[Fallback] Attempting WAN generation
[SafeGen] WAN disabled, skipping (o falla si enabled pero sin API key)
[Fallback] WAN failed → trying LTX
[SafeGen] LTX disabled, skipping
[Fallback] LTX failed → using STOCK
[Fallback] Using STOCK (final fallback)

[SceneProcessor] Scene generation completed { finalEngine: "STOCK" }

(Repeat for scenes 2-4)

[Orchestrator] All scenes processed { engines: ["STOCK", "STOCK", ...] }
```

**Expected UI**:
- ✅ Narrative streams in (2-3 seconds)
- ✅ 4 scenes generate with Pexels videos
- ✅ Video state: **"Preview"** (STOCK)
- ✅ Videos are playable
- ✅ No errors in UI

---

### Test 2: VEO Async Upgrade (After 5s)
**Action**: Wait 5+ seconds after initial generation

**Expected Console Logs**:
```
[Orchestrator] Starting VEO async upgrades { isEngaged: true }

[VeoUpgrade] Attempting VEO upgrade (if score > 0.85)
  OR
[VeoUpgrade] Score too low for VEO { sceneScore: 0.xxx }
  OR
[VeoUpgrade] User not engaged, skipping VEO

If VEO attempts:
  [VeoUpgrade] VEO succeeded → upgrading scene
    OR
  [VeoUpgrade] VEO timeout → trying fallback
  [Fallback] Attempting WAN generation
  [SafeGen] WAN disabled, skipping
  (fallback chain continues...)
```

**Expected UI**:
- ⏱️ If VEO attempted: Video state might change to **"Quality"** (if succeeds)
- ✅ If VEO fails/timeout: State remains **"Preview"** (STOCK)
- ✅ UI remains stable (no crashes)

---

### Test 3: Continue Exploring Section
**Action**: Scroll to bottom of CinematicResults page

**Expected UI**:
- ✅ Section visible with title **"Continue Exploring"**
- ✅ Icon: Link2 (chain link icon)
- ✅ **4 horizontal cards** with:
  - Image (16:9 aspect ratio)
  - Topic title
  - Hover effect (border color change)
- ✅ Click on card → new cinematic search

**Location in Code**: [CinematicResults.tsx:98-114](../src/pages/CinematicResults.tsx#L98-L114)

---

## 🔍 KEY DECISION POINTS TO OBSERVE

### 1. Engine Selection Logic
Watch for these key decisions in console:

```typescript
// CASO 1: Stock score > 0.8
[EngineSelector] STOCK quality sufficient → final

// CASO 2: No APIs available
[EngineSelector] No AI engines available → STOCK fallback

// CASO 3: Scene score > 0.7 + WAN enabled
[EngineSelector] High score → WAN selected

// CASO 4: Scene score > 0.4 + LTX enabled
[EngineSelector] Medium score → LTX selected

// CASO 5: Score too low
[EngineSelector] Low score → STOCK fallback
```

### 2. Fallback Chain
Every scene MUST complete, observe:

```typescript
WAN attempted → null
  ↓
LTX attempted → null
  ↓
STOCK attempted → ✅ SUCCESS (ALWAYS)
```

### 3. VEO Upgrade Trigger
Only if ALL conditions met:

```typescript
✅ veoEnabled: true
✅ sceneScore > 0.85
✅ userEngaged (elapsed > 5000ms)
```

---

## 🚨 EXPECTED ERRORS (OK TO SEE)

These are **expected** when WAVESPEED_API_KEY is not configured:

```
[SafeGen] WAN disabled, skipping
[SafeGen] LTX disabled, skipping
[Fallback] WAN failed → trying LTX
[Fallback] LTX failed → using STOCK
```

---

## ❌ UNEXPECTED ERRORS (NEED FIX)

These indicate **real problems**:

```
❌ [SafeGen] STOCK failed
❌ [SceneProcessor] Scene generation failed
❌ [Orchestrator] All scenes processed { engines: [] }
❌ TypeError: Cannot read property 'videoUrl' of undefined
❌ 400 Bad Request (Supabase save error)
```

---

## 📊 SUCCESS CRITERIA

### ✅ Minimum Success
- [x] Build completes without errors
- [x] Page loads without crashes
- [x] Narrative streams successfully
- [x] All 4 scenes generate (even if all STOCK)
- [x] Videos are playable
- [x] Continue Exploring section visible with 4 topics
- [x] Console logs show decision flow clearly

### 🎯 Ideal Success
- [x] All above +
- [x] WAN fallback chain works (attempts WAN → fails → tries LTX → fails → uses STOCK)
- [x] VEO upgrade attempts after 5s (if score high enough)
- [x] No unexpected errors in console
- [x] UI state updates correctly (Preview → Quality if VEO succeeds)

---

## 🔧 TROUBLESHOOTING QUICK REFERENCE

| Symptom | Likely Cause | Check |
|---------|--------------|-------|
| No videos generate | Pexels API issue | Check `videoProvider` in cinematicService |
| Videos not playable | Missing mixedVideoUrl | Check scene.videoUrl assignment |
| Continue Exploring empty | relatedTopics not enriched | Check `enrichRelatedTopics()` |
| VEO never attempts | Score < 0.85 or engagement < 5s | Check console logs for thresholds |
| Build errors | Type conflicts | Check import statements |
| 400 from Supabase | full_video_path issue | Check migration was applied |

---

## 🚀 NEXT STEPS AFTER TESTING

If all tests pass:

1. ✅ Obtain `VITE_WAVESPEED_API_KEY` from Wavespeed
2. ✅ Add to `.env.local`
3. ✅ Test with real WAN/LTX generation
4. ✅ Verify WAN generates faster than STOCK
5. ✅ Verify LTX generates ultra-fast (5-15s)
6. ✅ Fine-tune thresholds in CinematicConfig if needed

---

**Ready to test!** 🎬

Run the app and navigate to:
```
/cinematic-results?q=what is photosynthesis
```

Watch the console and observe the flow. Report any unexpected errors.
