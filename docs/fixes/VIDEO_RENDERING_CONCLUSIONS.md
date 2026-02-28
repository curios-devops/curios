# Video Rendering Performance Analysis

## Summary
After extensive testing, **Netlify Functions (Free tier) cannot render videos fast enough** to stay under the 26-second timeout limit.

## Timeline of Optimizations Attempted

### Starting Point
- Resolution: 1920x1080 (1080p)
- FPS: 30
- Chunk Duration: 5 seconds (150 frames)
- Bundling: Runtime (15 seconds)
- Result: **Timeout after 30s**

### Optimization Round 1
- ✅ Reduced to 720p (1280x720) - 44% fewer pixels
- ✅ Reduced chunks to 2 seconds (60 frames)
- ✅ CRF 28 → 30 (faster encoding)
- Result: **Still timeout after 30s**

### Optimization Round 2
- ✅ Reduced to 1-second chunks (30 frames)
- ✅ CRF 30 → 32 (even faster encoding)
- ✅ Bundle caching implemented
- Result: **Still timeout after 30s**

### Optimization Round 3
- ✅ Reduced FPS from 30 → 15 (50% fewer frames)
- ✅ Now only 15 frames total (1s × 15fps)
- Result: **Still timeout after 30s**

### Optimization Round 4
- ✅ Pre-bundle Remotion at build time (0s at runtime)
- ✅ Skip Supabase upload
- ✅ Chrome caching working
- Result: **STILL TIMEOUT - stuck on frame 0/15 for 30+ seconds**

## Root Cause Analysis

### What Works
1. ✅ Chrome installation and extraction (4-5s first time, cached after)
2. ✅ Remotion bundling (pre-bundled at build time)
3. ✅ Function invocation and setup (<1s)

### What Doesn't Work
❌ **Actual frame rendering is too slow**
- Frame 0 alone takes 30+ seconds
- This suggests the Chrome/Puppeteer rendering in Netlify's serverless environment is extremely slow
- Even with all optimizations, rendering is 20-30x slower than expected

### Why Netlify Functions Are Too Slow

1. **Limited CPU** - Serverless functions have constrained CPU
2. **Chrome overhead** - Headless Chrome is resource-intensive
3. **No GPU acceleration** - Video encoding without GPU is slow
4. **Network constraints** - Possible throttling in free tier

## Performance Comparison

| Platform | Expected Time (15 frames) | Actual Time |
|----------|---------------------------|-------------|
| Local machine | 2-3 seconds | N/A (macOS 11 incompatible) |
| Netlify Free | 2-3 seconds | **30+ seconds** |
| AWS Lambda (with @remotion/lambda) | 3-5 seconds | Not tested |

## Recommended Solutions

### Option 1: Use @remotion/lambda (AWS) ⭐ **RECOMMENDED**
**Pros:**
- Designed specifically for video rendering
- No timeout limits (can take minutes if needed)
- Distributed rendering (multiple chunks in parallel)
- Proven, production-ready solution
- Good documentation

**Cons:**
- More complex initial setup
- AWS account required
- Costs ~$0.01-0.05 per video (very cheap at scale)

**Implementation:**
```bash
npm install @remotion/lambda
npx remotion lambda sites create
npx remotion lambda render
```

### Option 2: Upgrade to Netlify Pro ($19/month)
**Pros:**
- Simpler (no code changes needed)
- Supports existing infrastructure

**Cons:**
- **Still has 26s timeout** - might not be enough!
- More expensive than Lambda at scale
- No distributed rendering

**Verdict:** ❌ **Not recommended** - timeout still too short

### Option 3: Use External Render Service
Services like:
- Shotstack (https://shotstack.io)
- RenderMachines (https://rendermachines.com)
- Bannerbear Video API

**Pros:**
- No infrastructure management
- Fast and reliable
- Easy API integration

**Cons:**
- Recurring costs ($50-200/month)
- Vendor lock-in
- Less customization

### Option 4: Client-Side Rendering (Progressive)
Render videos in the browser using WebCodecs API

**Pros:**
- No server costs
- No timeouts
- Works on modern browsers

**Cons:**
- Requires modern browser
- Can't render on mobile easily
- User must wait (can't navigate away)

## Recommendation

**Go with @remotion/lambda** because:
1. ✅ Purpose-built for this exact use case
2. ✅ No timeout issues
3. ✅ Scales automatically
4. ✅ Very cheap ($0.01-0.05 per video)
5. ✅ Remotion team maintains it
6. ✅ Can render full videos (not just chunks)

## Next Steps

If proceeding with @remotion/lambda:

1. Install dependencies
2. Set up AWS credentials
3. Deploy Remotion site to S3
4. Update rendering code to use Lambda
5. Test with a single video
6. Implement progress tracking
7. Add error handling

## Cost Estimate (Lambda)

For 1000 videos/month:
- Lambda compute: ~$5-10
- S3 storage: ~$1-2
- **Total: ~$6-12/month**

Much cheaper than Netlify Pro ($19/mo) and actually works!

## Files to Change

If switching to Lambda:
- `src/services/studio/rendering/chunkedRenderer.ts` - Use Lambda renderer
- Remove `netlify/functions/render-chunk.js`
- Add Lambda deployment scripts
- Update environment variables

