# 🚀 TESTING QUICK START - Director v3

**Status**: ✅ Ready to test NOW
**Configuration**: Fallback cascade test (no WAVESPEED_API_KEY)

---

## ⚡ QUICK START

### 1. Start Development Server
```bash
npm run dev
```

### 2. Open Browser with Console
- Open Chrome/Firefox DevTools (F12)
- Go to Console tab
- Clear console

### 3. Navigate to Test URL
```
http://localhost:5173/cinematic-results?q=what is photosynthesis
```

### 4. Watch Console Logs
Look for these key log messages:

✅ **GOOD LOGS** (Expected):
```
[CinematicService] Starting video generation with Director v3
[Orchestrator] Starting video generation
[SceneProcessor] Processing scene
[EngineSelector] Selecting base engine
[SafeGen] WAN disabled, skipping  ← EXPECTED (no API key)
[SafeGen] LTX disabled, skipping  ← EXPECTED (disabled)
[Fallback] Using STOCK (final fallback)  ← EXPECTED
[Orchestrator] All scenes processed
```

❌ **BAD LOGS** (Need fixing):
```
[SafeGen] STOCK failed  ← PROBLEM
TypeError: ...  ← PROBLEM
400 Bad Request  ← PROBLEM
Uncaught error  ← PROBLEM
```

### 5. Verify UI (30 seconds)
- [ ] Narrative appears (2-3s)
- [ ] 4 scenes generate
- [ ] Videos playable
- [ ] State badge shows "Preview"
- [ ] Scroll to bottom → "Continue Exploring" with 4 topics

### 6. Wait 5+ Seconds (VEO Test)
- [ ] Check console for `[VeoUpgrade]` logs
- [ ] Verify no crashes
- [ ] State may change to "Quality" (if VEO succeeds)

---

## 🎯 PASS/FAIL CRITERIA

### ✅ PASS = All of these:
- Video generates successfully
- All 4 scenes have videos
- State shows "Preview" (STOCK)
- Console shows fallback chain working
- No TypeScript errors
- Continue Exploring section visible

### ❌ FAIL = Any of these:
- Page crashes
- Videos don't load
- Console shows STOCK failures
- TypeScript errors
- 400 from Supabase
- Blank screen

---

## 📊 WHAT YOU'RE TESTING

### Test 1: Fallback Cascade
**What**: WAN → LTX → STOCK fallback chain
**Expected**: Falls to STOCK (no API key)
**Success**: All scenes use STOCK, video works

### Test 2: VEO Async
**What**: VEO upgrade after 5s engagement
**Expected**: Attempts VEO if score > 0.85
**Success**: No crashes, state updates correctly

### Test 3: Continue Exploring
**What**: Related topics section
**Expected**: 4 topic cards with images
**Success**: Section visible, clickable

---

## 🔍 DETAILED CONSOLE LOG WALKTHROUGH

### Expected Complete Flow:
```
1. [CinematicService] Starting video generation with Director v3
   → System initialized

2. [Orchestrator] Starting video generation { sceneCount: 4 }
   → Main orchestrator started

3. [Orchestrator] Processing all scenes in parallel
   → All 4 scenes processing simultaneously

4. [SceneProcessor] Processing scene { sceneId: "scene_1" }
   → Individual scene started

5. [SceneProcessor] Stock evaluated { stockScore: 0.6 }
   → Pexels video fetched and scored

6. [SceneProcessor] Scene score computed { sceneScore: 0.7 }
   → Overall scene score calculated

7. [EngineSelector] Selecting base engine
   → Decision time!

8. [EngineSelector] High score → WAN selected
   → Decided to try WAN (but will fail)

9. [SceneProcessor] Engine selected { engine: "WAN", reason: "..." }
   → WAN chosen upfront

10. [Fallback] Attempting WAN generation
    → Trying WAN...

11. [SafeGen] WAN disabled, skipping
    → WAN fails (no API key) ✓ EXPECTED

12. [Fallback] WAN failed → trying LTX
    → Moving to next fallback

13. [SafeGen] LTX disabled, skipping
    → LTX skipped (disabled) ✓ EXPECTED

14. [Fallback] LTX failed → using STOCK
    → Moving to final fallback

15. [Fallback] Using STOCK (final fallback)
    → STOCK selected ✓ SUCCESS

16. [SceneProcessor] Scene generation completed { finalEngine: "STOCK" }
    → Scene 1 done!

... (Repeat steps 4-16 for scenes 2, 3, 4)

17. [Orchestrator] All scenes processed
    engines: ["STOCK", "STOCK", "STOCK", "STOCK"]
    states: ["Preview", "Preview", "Preview", "Preview"]
    → All scenes complete!

18. [Orchestrator] Starting VEO async upgrades { isEngaged: false }
    → VEO upgrade check (not engaged yet, < 5s)

... After 5 seconds ...

19. [VeoUpgrade] Attempting VEO upgrade (or skip if score low)
    → VEO upgrade attempt (if conditions met)
```

---

## 🐛 TROUBLESHOOTING

### Problem: Nothing happens
**Solution**: Check dev server is running, check URL

### Problem: Console shows many errors
**Solution**: Take screenshot, share with team

### Problem: Videos don't load
**Solution**: Check Pexels API key (VITE_PEXELS_API_KEY)

### Problem: TypeScript errors
**Solution**: Check build output, might need `npm install`

### Problem: 400 from Supabase
**Solution**: Check migration was applied (full_video_path nullable)

---

## ✅ NEXT STEPS AFTER PASS

If test passes:

1. **Report success** ✓
2. **Obtain WAVESPEED_API_KEY** from https://wavespeed.ai
3. **Add to .env.local**:
   ```bash
   VITE_WAVESPEED_API_KEY=sk-your-key-here
   ```
4. **Enable LTX** in CinematicConfig.ts:
   ```typescript
   ltxEnabled: true,
   ```
5. **Re-test** with real AI generation

---

## 📞 NEED HELP?

Share:
- Console screenshot
- Network tab (if videos not loading)
- Error messages
- What you were doing when it failed

---

**Ready?** Start your dev server and test! 🎬

**Test URL**: `/cinematic-results?q=what is photosynthesis`
**Watch**: Console logs + UI behavior
**Time**: 30 seconds to complete test
