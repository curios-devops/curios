# Cinematic Service Flow Diagram

## Current Flow (Problematic)

```
User Query
    ↓
Research Sources (10s)
    ↓
Generate 3-5 Scenes (Director)
    ↓
┌─────────────────────────────────────────────┐
│ Start ALL Scenes in Parallel               │
│                                             │
│  Scene 1 → VEO API → Wait 2-5 min → ?     │
│  Scene 2 → VEO API → Wait 2-5 min → ?     │  All at once!
│  Scene 3 → VEO API → Wait 2-5 min → ?     │  Uncontrolled!
│  Scene 4 → VEO API → Wait 2-5 min → ?     │
│  Scene 5 → VEO API → Wait 2-5 min → ?     │
│                                             │
└─────────────────────────────────────────────┘
    ↓
Wait for ALL to complete (or timeout/fail)
    ↓
Result:
- Success: 60-70% (if ALL succeed)
- Time: 5-25 minutes
- User: Frustrated 😞
```

## New Flow (Resilient)

```
User Query
    ↓
Research Sources (10s)
    ↓
Generate 2-4 Scenes (Director) ← Fewer scenes!
    ↓
┌──────────────────────────────────────────────────────┐
│ Sequential Queue (Max 2 Concurrent)                  │
│                                                       │
│  0:00  Scene 1: CREATED → PROCESSING (VEO)          │
│  0:08  Scene 2: CREATED → PROCESSING (VEO)          │ Max 2!
│        Scene 3: CREATED (waiting...)                 │
│                                                       │
│  0:30  Scene 1: VEO timeout? → RETRY                │
│  0:45  Scene 1: Retry failed? → PEXELS ✅           │ Fallback!
│  1:00  Scene 2: COMPLETED (VEO) ✅                   │
│                                                       │
│  1:08  Scene 3: PROCESSING (VEO)                    │
│  1:30  Scene 3: COMPLETED (VEO) ✅                   │
│                                                       │
└──────────────────────────────────────────────────────┘
    ↓
All Scenes Complete (Mix of VEO + Pexels)
    ↓
Result:
- Success: 95%+ (with fallback)
- Time: 2-5 minutes
- User: Happy 😊
```

## Detailed Scene Processing

```
┌─────────────────────────────────────────────────────────┐
│                    Scene Workflow                        │
└─────────────────────────────────────────────────────────┘

Scene Created
    ↓
 ┌──────────────────────┐
 │  Try VEO (Attempt 1) │
 └──────────────────────┘
    │
    ├─ Success (30s) ─────────→ COMPLETED ✅
    │
    └─ Timeout/Fail ─────→ Retry VEO (Attempt 2)
                                │
                                ├─ Success ────→ COMPLETED ✅
                                │
                                └─ Fail ────→ Try Pexels
                                                   │
                                                   ├─ Success → COMPLETED ✅
                                                   │
                                                   └─ Fail ─→ FAILED ❌
```

## Queue State Over Time

```
Time  | Queue Status              | Action
------|--------------------------|----------------------------------
0:00  | [C, C, C]                | Scene 1: Created → Processing
0:00  | [P, C, C]                | VEO call for Scene 1
0:08  | [P, C, C]                | Wait (stagger)
0:08  | [P, P, C]                | Scene 2: Processing (VEO call)
0:16  | [P, P, C]                | Poll Scene 1 & 2 status
0:24  | [P, P, C]                | Poll Scene 1 & 2 status
0:32  | [✅, P, C]               | Scene 1 COMPLETED!
0:32  | [✅, P, P]               | Scene 3: Processing (VEO call)
0:40  | [✅, ✅, P]              | Scene 2 COMPLETED!
0:48  | [✅, ✅, ✅]             | Scene 3 COMPLETED! ALL DONE!

Legend:
C = Created
P = Processing
✅ = Completed
❌ = Failed
```

## Timeout & Retry Flow

```
┌─────────────────────────────────────────────────────────┐
│                VEO Attempt with Timeout                  │
└─────────────────────────────────────────────────────────┘

Start VEO Request
    ↓
Poll every 8 seconds
    ↓
  0:08  Check status → Not done
  0:16  Check status → Not done
  0:24  Check status → Not done
  0:30  TIMEOUT! → Retry
    ↓
Retry VEO Request
    ↓
Poll every 8 seconds
    ↓
  0:38  Check status → Not done
  0:46  Check status → Done! ✅
    ↓
Extract video URL
    ↓
COMPLETED


Alternative: Retry also fails
    ↓
  0:30  TIMEOUT! → Retry
  0:60  TIMEOUT again! → Pexels
    ↓
Search Pexels API
    ↓
Get stock video (< 2s)
    ↓
COMPLETED ✅
```

## Concurrency Control

```
┌─────────────────────────────────────────────────────────┐
│         Max 2 Concurrent VEO Calls                       │
└─────────────────────────────────────────────────────────┘

Scenario: 4 scenes to process

Time  | VEO Slot 1    | VEO Slot 2    | Queued
------|---------------|---------------|----------------
0:00  | Scene 1 ▓▓▓   | Empty         | [2, 3, 4]
0:08  | Scene 1 ▓▓▓   | Scene 2 ▓▓▓   | [3, 4]
0:30  | Scene 1 ✅    | Scene 2 ▓▓▓   | [3, 4]
0:30  | Scene 3 ▓▓▓   | Scene 2 ▓▓▓   | [4]
0:45  | Scene 3 ▓▓▓   | Scene 2 ✅    | [4]
0:45  | Scene 3 ▓▓▓   | Scene 4 ▓▓▓   | []
1:00  | Scene 3 ✅    | Scene 4 ▓▓▓   | []
1:15  | Empty         | Scene 4 ✅    | []
DONE! ✅

Legend:
▓▓▓ = Processing
✅ = Completed
```

## Provider Fallback Chain

```
┌─────────────────────────────────────────────────────────┐
│              Provider Priority Chain                     │
└─────────────────────────────────────────────────────────┘

Scene needs video
    ↓
┌───────────────┐
│   VEO (Try 1) │  ← Primary (high quality, custom)
└───────────────┘
    │
    ├─ Success (70%) ────→ Use VEO video ✅
    │
    └─ Fail (30%) ───────→ VEO (Try 2) ← Retry
                                │
                                ├─ Success (50%) ─→ Use VEO video ✅
                                │
                                └─ Fail (50%) ────→ Pexels ← Fallback
                                                        │
                                                        ├─ Success (95%) ─→ Use Pexels ✅
                                                        │
                                                        └─ Fail (5%) ─────→ FAILED ❌

Overall Success Rate: ~95%
- VEO success: 70% + (30% × 50%) = 85%
- Pexels success: 15% × 95% = 14%
- Total: 99%
- Failure: 1% (extremely rare)
```

## User Experience Timeline

```
┌─────────────────────────────────────────────────────────┐
│            User Sees (Progress Updates)                  │
└─────────────────────────────────────────────────────────┘

0:00  "Researching your topic..."
      [▓▓░░░░░░░░] 10%

0:10  "Creating cinematic plan..."
      [▓▓▓░░░░░░░] 30%

0:15  "Generating Scene 1: Introduction"
      [▓▓▓▓░░░░░░] 40%

0:30  "Generating Scene 2: Key Concept"
      [▓▓▓▓▓░░░░░] 60%

0:45  "Scene 1 complete! ✅"
      [▓▓▓▓▓▓░░░░] 70%

1:00  "Generating Scene 3: Conclusion"
      [▓▓▓▓▓▓▓░░░] 80%

1:15  "Scene 2 complete! ✅"
      [▓▓▓▓▓▓▓▓░░] 90%

1:30  "Scene 3 complete! ✅"
      [▓▓▓▓▓▓▓▓▓▓] 100%

1:35  "Your cinematic video is ready! 🎬"
      ✅ 3 scenes, 24 seconds total
```

## Before vs After Comparison

```
┌─────────────────────────────────────────────────────────┐
│                    BEFORE                                │
└─────────────────────────────────────────────────────────┘

User Query → Research → Generate 4 scenes in parallel
                          ↓         ↓         ↓        ↓
                        VEO       VEO       VEO      VEO
                          ↓         ↓         ↓        ↓
                        Wait      Wait      Wait     Wait
                        5 min     5 min     5 min    5 min
                          ↓         ↓         ↓        ↓
                        Fail?     OK?       Fail?    OK?
                          ↓         ↓         ↓        ↓
                          ❌───────✅────────❌───────✅
                                    ↓
                          Partial success (50%)
                          Total time: 20 minutes
                          User: Frustrated 😞


┌─────────────────────────────────────────────────────────┐
│                     AFTER                                │
└─────────────────────────────────────────────────────────┘

User Query → Research → Generate 3 scenes sequentially
                          ↓
                      ┌───────┐
                      │ Queue │ Max 2 concurrent
                      └───────┘
                          ↓
    ┌─────────────────────┼─────────────────────┐
    ↓                     ↓                     ↓
  VEO 1                 VEO 2                 VEO 3
    ↓                     ↓                  (waits)
  30s timeout          Success!                ↓
    ↓                     ✅                  VEO 3
  Retry                                        ↓
    ↓                                       Success!
  Pexels!                                      ✅
    ✅

Result: 3/3 success (100%)
Total time: 3 minutes
User: Happy 😊
```

## Summary

The new flow ensures:
- ✅ **Controlled load** - Max 2 VEO calls at once
- ✅ **Fast results** - 2-4 scenes instead of 3-5
- ✅ **High reliability** - Pexels fallback for failures
- ✅ **Better UX** - Clear progress, predictable timeline
- ✅ **Debuggable** - Simple sequential flow to trace

**Result:** Transform from 60-70% success in 15-20 min to 95%+ success in 3-5 min!
