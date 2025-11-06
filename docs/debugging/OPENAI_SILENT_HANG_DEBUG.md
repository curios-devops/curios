# OpenAI Silent Hang - Enhanced Debugging

## 🐛 Current Issue

**Console Log**:
```
[2025-10-27T08:49:58.005Z] DEBUG: Calling OpenAI API via Supabase Edge Function {"model":"gpt-4o","messageCount":2}
```

Then: **App freezes** - no error, no response, just hangs.

---

## 🔍 Enhanced Logging Added

### File: `searchWriterAgent.ts`

Added comprehensive console logging at each step to identify exactly where the hang occurs.

### 1. **Environment Variable Check**
```typescript
console.log('🔍 [WRITER] Environment check:', {
  hasUrl: !!supabaseEdgeUrl,
  hasKey: !!supabaseAnonKey,
  urlPreview: supabaseEdgeUrl ? supabaseEdgeUrl.substring(0, 50) + '...' : 'MISSING',
  keyPreview: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING'
});
```

**What to look for**:
- ✅ `hasUrl: true`
- ✅ `hasKey: true`
- ✅ URL should start with: `https://gpfccicfqynahflehpqo.supabase.co/functions/v1/fetch-openai`
- ✅ Key should start with: `eyJhbGciOiJIUzI1NiI...`

### 2. **Payload Structure Check**
```typescript
console.log('🔍 [WRITER] Request payload structure:', {
  hasPrompt: !!payload.prompt,
  promptType: typeof payload.prompt,
  promptLength: payload.prompt.length,
  promptPreview: payload.prompt.substring(0, 200)
});
```

**What to look for**:
- ✅ `hasPrompt: true`
- ✅ `promptType: 'string'`
- ✅ `promptLength` should be > 500 (contains messages + config)
- ✅ `promptPreview` should show JSON structure

### 3. **Fetch Initiation**
```typescript
console.log('🔍 [WRITER] Initiating fetch to Supabase Edge Function...', {
  url: supabaseEdgeUrl,
  hasAuth: !!supabaseAnonKey,
  timeout: '30s',
  model,
  messagesCount: messages.length,
  payloadSize: JSON.stringify(payload).length
});
```

**What to look for**:
- ✅ Full URL displayed
- ✅ `hasAuth: true`
- ✅ `messagesCount: 2` (system + user message)
- ✅ `payloadSize` should be 1000-5000 bytes typically

### 4. **Fetch Waiting**
```typescript
console.log('🔍 [WRITER] Fetch call initiated, waiting for response...');
```

**Critical**: If you see this but NOT the next log, the fetch is hanging!

### 5. **Response Received**
```typescript
console.log('🔍 [WRITER] Fetch completed, response received:', {
  ok: response.ok,
  status: response.status,
  statusText: response.statusText
});
```

**What to look for**:
- ✅ `ok: true` and `status: 200` = Success
- ❌ `ok: false` and `status: 401` = Auth error
- ❌ `ok: false` and `status: 500` = Server error

### 6. **JSON Parsing**
```typescript
console.log('🔍 [WRITER] Response parsed successfully:', {
  hasText: !!data.text,
  textLength: data.text?.length || 0
});
```

---

## 🎯 Diagnostic Flow

### Expected Console Output (Success)

```
1️⃣ [DEBUG] Calling OpenAI API via Supabase Edge Function {model: "gpt-4o", messageCount: 2}
2️⃣ 🔍 [WRITER] Environment check: {hasUrl: true, hasKey: true, ...}
3️⃣ 🔍 [WRITER] Request payload structure: {hasPrompt: true, promptType: 'string', ...}
4️⃣ 🔍 [WRITER] Initiating fetch to Supabase Edge Function... {url: "...", ...}
5️⃣ 🔍 [WRITER] Fetch call initiated, waiting for response...
6️⃣ 🔍 [WRITER] Fetch completed, response received: {ok: true, status: 200}
7️⃣ 🔍 [WRITER] Response parsed successfully: {hasText: true, textLength: 2543}
8️⃣ 🔍 [WRITER] OpenAI returned: {textType: 'string', textLength: 2543, ...}
```

### Hang Scenarios

#### Scenario A: Hangs after step 5️⃣
```
🔍 [WRITER] Fetch call initiated, waiting for response...
(30 seconds pass...)
❌ [WRITER] Fetch timeout - aborting request
```

**Diagnosis**: Supabase Edge Function not responding
**Possible causes**:
- Edge function is down
- Network connectivity issue
- CORS problem
- Function is stuck processing

#### Scenario B: Hangs before step 5️⃣
```
🔍 [WRITER] Initiating fetch to Supabase Edge Function...
(freeze, no next log)
```

**Diagnosis**: Fetch never initiated
**Possible causes**:
- Browser blocking fetch
- Invalid URL
- CORS preflight failing

#### Scenario C: Gets 401/403
```
🔍 [WRITER] Fetch completed, response received: {ok: false, status: 401}
❌ [WRITER] OpenAI API error: {status: 401, ...}
```

**Diagnosis**: Authentication failure
**Possible causes**:
- Wrong anon key
- Expired key
- Key not configured in Supabase

---

## 🔧 Verification Steps

### 1. Check Environment Variables

Open browser console and run:
```javascript
console.log({
  url: import.meta.env.VITE_OPENAI_API_URL,
  key: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 30) + '...'
});
```

**Expected**:
```javascript
{
  url: "https://gpfccicfqynahflehpqo.supabase.co/functions/v1/fetch-openai",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6Ik..."
}
```

### 2. Test Edge Function Directly

Open a new terminal and run:
```bash
curl -X POST https://gpfccicfqynahflehpqo.supabase.co/functions/v1/fetch-openai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "prompt": "{\"messages\":[{\"role\":\"user\",\"content\":\"test\"}],\"model\":\"gpt-4o\"}"
  }'
```

**Expected Response**:
```json
{
  "text": "...",
  "openai": {...}
}
```

### 3. Check Network Tab

1. Open DevTools → Network tab
2. Search for "fetch-openai"
3. Check request status:
   - **Pending** = Still waiting (hang)
   - **200 OK** = Success
   - **401/403** = Auth issue
   - **500** = Server error
   - **Failed** = Network error

### 4. Check Browser Console for CORS

Look for:
```
❌ Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Timeout After 30s
**Symptom**: `❌ [WRITER] Fetch timeout - aborting request`

**Possible Causes**:
1. OpenAI API is slow (> 30s)
2. Supabase Edge Function timeout
3. Edge function stuck in processing

**Solutions**:
1. Check Supabase Edge Function logs:
   ```bash
   supabase functions logs fetch-openai
   ```
2. Increase timeout to 45s:
   ```typescript
   setTimeout(() => controller.abort(), 45000); // 45s
   ```
3. Check OpenAI API status: https://status.openai.com/

### Issue 2: Silent Hang (No Logs After Step 5)
**Symptom**: Stops at "Fetch call initiated, waiting for response..."

**Possible Causes**:
1. Supabase Edge Function not deployed
2. Wrong URL
3. Network blocking

**Solutions**:
1. Verify Edge Function is deployed:
   ```bash
   supabase functions list
   ```
2. Check URL in .env matches deployed function
3. Try from different network (disable VPN)

### Issue 3: 401 Unauthorized
**Symptom**: `status: 401`

**Possible Causes**:
1. Wrong anon key
2. Key not set in .env
3. Edge function checking wrong auth

**Solutions**:
1. Copy anon key from Supabase dashboard
2. Update .env:
   ```bash
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
3. Restart dev server: `npm run dev`

### Issue 4: JSON Parse Error
**Symptom**: `❌ [WRITER] JSON parsing failed`

**Possible Causes**:
1. Edge function returning wrong format
2. OpenAI returning non-JSON
3. Markdown code blocks in response

**Solutions**:
1. Check Edge Function response format
2. Verify `response_format: { type: 'json_object' }` in payload
3. Clean response before parsing (already implemented)

---

## 📊 Payload Structure

### What We Send
```json
{
  "prompt": "{\"messages\":[{\"role\":\"system\",\"content\":\"You are...\"},{\"role\":\"user\",\"content\":\"Query: ...\"}],\"model\":\"gpt-4o\",\"response_format\":{\"type\":\"json_object\"},\"temperature\":0.7,\"max_output_tokens\":1200}"
}
```

### What Edge Function Receives
```typescript
{ prompt } = await req.json();
parsedPrompt = typeof prompt === 'string' ? JSON.parse(prompt) : prompt;
```

### What Edge Function Sends to OpenAI
```json
{
  "model": "gpt-4o",
  "messages": [...],
  "temperature": 0.7,
  "max_tokens": 1200,
  "response_format": { "type": "json_object" }
}
```

### What We Receive
```json
{
  "text": "{\"content\":\"...\",\"followUpQuestions\":[...],\"citations\":[...]}",
  "openai": { "choices": [...], "usage": {...} }
}
```

---

## 🧪 Next Steps

### 1. Test Pro Search with Enhanced Logging

1. Navigate to: http://localhost:5173/
2. Enable Pro mode
3. Search: "Elon Musk"
4. Watch console for ALL the new logs

### 2. Identify Exact Hang Point

Compare what you see vs. expected output above.

**Report**:
- Last log message you see
- Any error messages
- Network tab status for fetch-openai request

### 3. Test Edge Function Independently

If fetch hangs, test Edge Function with curl (see above).

### 4. Check Supabase Logs

```bash
supabase functions logs fetch-openai --tail
```

Run this while testing to see real-time Edge Function logs.

---

## 📝 Test Checklist

After starting dev server, test and report:

- [ ] Environment variables logged correctly
- [ ] Payload structure looks valid
- [ ] Fetch initiated log appears
- [ ] "Waiting for response" log appears
- [ ] Response received log appears (or timeout)
- [ ] What's the last log before hang/freeze?
- [ ] Network tab shows fetch-openai request status
- [ ] Any CORS errors in console?
- [ ] Any red errors anywhere?

---

**Enhanced logging is now live! Test and share the console output! 🔍**
