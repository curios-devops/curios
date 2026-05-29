# Manual Deployment - Cloudinary Process Video Function

## Fixes Applied

1. **Multi-line captions** - Text now displays in 2-3 lines (not single line)
2. **Audio not cut off** - Video duration matches audio length (no trimming)
3. **Better caption positioning** - Multiple text layers at bottom of screen

## Deployment Instructions

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** section
3. Find the `cloudinary-process-video` function
4. Click **Edit** or **Update**
5. Replace the entire code with the contents of:
   ```
   /Users/marcelo/Documents/Curios/supabase/functions/cloudinary-process-video/index.ts
   ```
6. Click **Deploy** or **Save**

### Option 2: Using curl with Supabase API

If you have your Supabase project credentials:

```bash
# Set your variables
PROJECT_REF="your-project-ref"
SERVICE_ROLE_KEY="your-service-role-key"

# Deploy function
curl -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/cloudinary-process-video" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d @supabase/functions/cloudinary-process-video/index.ts
```

### Option 3: Copy-Paste Method

1. **Open Supabase Dashboard**: https://app.supabase.com
2. **Select your project**
3. **Go to Edge Functions** → `cloudinary-process-video`
4. **Copy the code below** and paste it into the editor
5. **Click Deploy**

---

## Updated Code to Deploy

The file is located at:
```
/Users/marcelo/Documents/Curios/supabase/functions/cloudinary-process-video/index.ts
```

### Key Changes Made

#### 1. Multi-line Caption Support (Lines 106-155)

```typescript
function splitTextIntoLines(text: string, maxCharsPerLine: number = 45): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  // Limit to 2-3 lines max for readability
  return lines.slice(0, 3);
}

function toCloudinaryTextLayer(text: string): string | undefined {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (!cleaned) return undefined;

  // Split text into multiple lines for better readability
  const lines = splitTextIntoLines(cleaned);

  // Create multiple text layers - one for each line
  // Stack them vertically at different y positions
  const layers = lines.map((line, index) => {
    const yPosition = 100 + (index * 40); // Stack lines 40 pixels apart
    const encoded = encodeURIComponent(line)
      .replace(/%2C/gi, '%252C')
      .replace(/%2F/gi, '%252F')
      .replace(/%3F/gi, '%253F')
      .replace(/%23/gi, '%2523');

    // Each line gets its own text layer with background
    return `l_text:Arial_28_bold:${encoded},co_white,b_rgb:000000cc,g_south,y_${yPosition},fl_layer_apply`;
  });

  // Join all layers with forward slashes for Cloudinary URL
  return layers.join('/');
}
```

#### 2. Audio Duration Fix (Lines 365-375)

**BEFORE (audio was cut off):**
```typescript
const durationTransform = normalizedTargetDuration
  ? uploadedDurationSeconds > normalizedTargetDuration
    ? `so_0,du_${formatDurationSeconds(normalizedTargetDuration)}`
    : `e_loop:100,du_${formatDurationSeconds(normalizedTargetDuration)}`
  : undefined;
```

**AFTER (audio plays fully):**
```typescript
// If we have narration audio, DON'T limit video duration - let audio play fully
// Otherwise, use target duration for video loops
const durationTransform = !narrationAudioPublicId && normalizedTargetDuration
  ? uploadedDurationSeconds > normalizedTargetDuration
    ? `so_0,du_${formatDurationSeconds(normalizedTargetDuration)}`
    : `e_loop:100,du_${formatDurationSeconds(normalizedTargetDuration)}`
  : undefined;
```

---

## What These Fixes Do

### Multi-line Captions
**Before:**
```
"In 1969, scientists made a groundbreaking discovery that would change everything we knew about the universe..."
(All in one line - hard to read)
```

**After:**
```
Line 1: "In 1969, scientists made a groundbreaking"
Line 2: "discovery that would change everything"
Line 3: "we knew about the universe..."
(Easy to read, professional looking)
```

### Audio Not Cut Off
**Before:**
- Video limited to 7 seconds
- Audio narration = 10 seconds
- Result: Audio cut at 7 seconds ❌

**After:**
- Video plays until audio finishes
- Audio narration = 10 seconds
- Result: Full audio plays ✅

### Caption Positioning
- Line 1: 100px from bottom
- Line 2: 140px from bottom (100 + 40)
- Line 3: 180px from bottom (100 + 80)
- Each line has semi-transparent black background for readability

---

## Testing After Deployment

1. Generate a new cinematic video
2. Check that captions show in 2-3 lines (not single line)
3. Verify audio plays completely (not cut off)
4. Confirm captions are at the bottom of the video
5. Check that text has dark background for readability

---

## Troubleshooting

### If captions still show as single line:
- Clear browser cache
- Force refresh (Cmd+Shift+R or Ctrl+Shift+F5)
- Generate a NEW cinematic video (old ones use cached Cloudinary URLs)

### If audio is still cut off:
- Check that `enableNarration: true` in the request
- Verify narration audio URL is being sent to Cloudinary
- Look at Cloudinary URL - should NOT have `du_7` if narration exists

### If deployment fails:
- Use Supabase Dashboard web interface
- Copy-paste the entire index.ts file
- Make sure no syntax errors (check console)

---

## Files Changed

1. `supabase/functions/cloudinary-process-video/index.ts`
   - Lines 106-155: Multi-line text splitting
   - Lines 365-375: Audio duration fix

---

## Need Help?

If you encounter issues:
1. Check Supabase Edge Function logs in dashboard
2. Look for errors in browser console (F12)
3. Verify Cloudinary URL structure in network tab
4. Test with a simple narration text first

---

## Quick Deploy Checklist

- [ ] Open Supabase Dashboard
- [ ] Navigate to Edge Functions
- [ ] Select `cloudinary-process-video`
- [ ] Copy full code from `index.ts`
- [ ] Paste into dashboard editor
- [ ] Click Deploy
- [ ] Wait for deployment success
- [ ] Test with new cinematic video
- [ ] Verify multi-line captions
- [ ] Verify full audio playback
