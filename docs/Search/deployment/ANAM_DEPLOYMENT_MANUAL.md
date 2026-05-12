# Manual Anam Avatar Deployment Guide

## Issue
The Supabase CLI has compatibility issues with macOS 10.16 (Darwin 20.6.0). This guide provides manual deployment steps.

## Steps

### 1. Configure Anam API Key via Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com/project/gpfccicfqynahflehpqo)
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add new secret:
   - Name: `ANAM_API_KEY`
   - Value: `OGY2N2UxN2MtMmUxMS00MGM5LTg4N2UtZDNjM2NhZDNjMDIwOi9lMUEzTmdhZ1hoSEJIZlM4cUw1RjdtSUtHWW9tNVdpNFplZklpMzVPYXM9`
4. Click **Save**

### 2. Deploy Function via Supabase Dashboard

#### Option A: Using Web Interface
1. Go to **Edge Functions** in Supabase Dashboard
2. Click **Create Function**
3. Name: `anam-avatar`
4. Copy contents from `supabase/functions/anam-avatar/index.ts`
5. Click **Deploy**
6. Enable **No JWT verification** in function settings

#### Option B: Using CI/CD (GitHub Actions)
Add to `.github/workflows/deploy-supabase.yml`:

```yaml
name: Deploy Supabase Functions

on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1

      - name: Deploy functions
        run: |
          supabase functions deploy anam-avatar --no-verify-jwt
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_REF: gpfccicfqynahflehpqo
```

#### Option C: Use Docker Container with Supabase CLI
```bash
docker run --rm -it \
  -v $(pwd):/workspace \
  -w /workspace \
  supabase/cli:latest \
  supabase functions deploy anam-avatar --no-verify-jwt
```

### 3. Alternative: Use Remote Machine

If you have access to a Linux machine or newer macOS:

```bash
# Copy function to remote machine
scp -r supabase/functions/anam-avatar user@remote:/tmp/

# SSH to remote machine
ssh user@remote

# Deploy
cd /tmp
supabase link --project-ref gpfccicfqynahflehpqo
supabase secrets set ANAM_API_KEY="YOUR_KEY"
supabase functions deploy anam-avatar --no-verify-jwt
```

### 4. Verify Deployment

Test the deployed function:

```bash
curl -X POST \
  https://gpfccicfqynahflehpqo.supabase.co/functions/v1/anam-avatar \
  -H 'Content-Type: application/json' \
  -H 'apikey: YOUR_SUPABASE_ANON_KEY' \
  -d '{
    "audioBase64": "test_base64_audio_data"
  }'
```

Expected response:
```json
{
  "videoUrl": "https://...",
  "video": "base64_video_data",
  "duration": 12.5
}
```

## Manual API Key Configuration

If dashboard access is unavailable, use the Supabase Management API:

```bash
curl -X POST \
  https://api.supabase.com/v1/projects/gpfccicfqynahflehpqo/secrets \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ANAM_API_KEY",
    "value": "OGY2N2UxN2MtMmUxMS00MGM5LTg4N2UtZDNjM2NhZDNjMDIwOi9lMUEzTmdhZ1hoSEJIZlM4cUw1RjdtSUtHWW9tNVdpNFplZklpMzVPYXM9"
  }'
```

## Testing After Deployment

### 1. Test with Sample Audio

Create a test file `test-anam.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Test Anam Avatar</title>
</head>
<body>
  <h1>Test Anam Avatar Function</h1>
  <button onclick="testAnam()">Generate Avatar</button>
  <div id="result"></div>
  <video id="video" controls style="max-width: 512px;"></video>

  <script>
    async function testAnam() {
      const resultDiv = document.getElementById('result');
      const videoEl = document.getElementById('video');

      resultDiv.textContent = 'Generating avatar...';

      try {
        // Use a small test audio (you'd need real base64 audio here)
        const response = await fetch(
          'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/anam-avatar',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audioBase64: 'YOUR_TEST_AUDIO_BASE64'
            })
          }
        );

        const data = await response.json();

        if (data.videoUrl) {
          videoEl.src = data.videoUrl;
          resultDiv.textContent = 'Avatar generated!';
        } else if (data.video) {
          const blob = base64ToBlob(data.video, 'video/mp4');
          videoEl.src = URL.createObjectURL(blob);
          resultDiv.textContent = 'Avatar generated from base64!';
        } else {
          resultDiv.textContent = 'Error: ' + JSON.stringify(data);
        }
      } catch (error) {
        resultDiv.textContent = 'Error: ' + error.message;
      }
    }

    function base64ToBlob(base64, mimeType) {
      const byteCharacters = atob(base64);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      return new Blob([byteNumbers], { type: mimeType });
    }
  </script>
</body>
</html>
```

### 2. Test Full Flow

Use the avatar search page:
1. Navigate to `http://localhost:5173` (or your dev server)
2. Click the avatar button (left button in search box)
3. Enter a query: "What is artificial intelligence?"
4. Click the equalizer button to trigger avatar search
5. Wait for generation (may take 10-30 seconds)
6. Verify video plays with audio

## Troubleshooting

### Function Not Found
- Verify function is deployed in Supabase Dashboard
- Check function URL is correct
- Ensure function name is exactly `anam-avatar`

### 401 Unauthorized
- Verify ANAM_API_KEY is set correctly in secrets
- Check API key format (should be base64 encoded)

### 500 Internal Server Error
- Check function logs in Supabase Dashboard
- Verify Anam API endpoint is correct
- Test Anam API key with curl directly

### Video Not Playing
- Check browser console for errors
- Verify video MIME type is `video/mp4`
- Test with different browsers
- Check CORS headers

## Next Steps

Once deployed:
1. ✅ Configure ANAM_API_KEY secret
2. ✅ Deploy anam-avatar function
3. Test with sample audio
4. Test full workflow end-to-end
5. Monitor function logs
6. Optimize performance if needed

---

**Note:** The Supabase CLI compatibility issue is due to macOS version. Using the dashboard or CI/CD is recommended for deployment.
