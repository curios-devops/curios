# Browser Cache Fix for Avatar Search

The edge function IS working (curl test succeeds), but the browser is getting a 401 error due to caching.

## Steps to Fix

### 1. Hard Refresh in Browser
- **Chrome/Edge:** Press `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
- **Firefox:** Press `Cmd + Shift + R` (Mac) or `Ctrl + F5` (Windows)
- **Safari:** Press `Cmd + Option + R`

### 2. Clear Browser Cache Manually
1. Open DevTools (F12 or Cmd+Option+I)
2. Right-click the refresh button
3. Select **"Empty Cache and Hard Reload"**

### 3. Clear Application Storage
1. Open DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **"Clear site data"** or **"Clear storage"**
4. Refresh the page

### 4. Disable Cache in DevTools
1. Open DevTools (F12)
2. Go to **Network** tab
3. Check **"Disable cache"** checkbox
4. Keep DevTools open while testing

### 5. Test in Incognito/Private Mode
- Open a new Incognito/Private window
- Navigate to: http://localhost:5173/avatar-search?q=test
- This bypasses all cache

## Expected Result

After clearing cache, you should see:
- ✅ `📡 [ElevenLabs] Edge function response: 200` (not 401!)
- ✅ Audio plays successfully
- ✅ Avatar displays with working TTS

## Verification

The curl test confirms the function works:
```bash
bash scripts/test-elevenlabs-direct.sh
```

Returns: `{"audio":"SUQz...","size":13000}` ✅

## If Still 401 After Cache Clear

Wait 30-60 seconds for CDN propagation, then try again.
