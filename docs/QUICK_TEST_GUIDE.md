# Quick Test Guide - Pro Search V2

## 🚀 Quick Start

### Server Running ✅
```
http://localhost:5173/
```

---

## 📝 Step-by-Step Testing

### 1. Open Home Page
Navigate to: `http://localhost:5173/`

### 2. Find the Search Box
You'll see:
```
┌─────────────────────────────────────┐
│     AI Web Search                   │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ Enter your search query...    │ │
│  │                               │ │
│  └───────────────────────────────┘ │
│  🎤    [Pro Toggle]  🔍           │
└─────────────────────────────────────┘
```

### 3. Enable Pro Mode
Click the toggle switch at the bottom right
- **OFF** (gray) = Regular Search → `/search`
- **ON** (blue) = Pro Search → `/pro-search` ✅

### 4. Enter Test Query
Type: **"Elon Musk"**

### 5. Click Search
The blue search button on the right

### 6. Expected Result
```
URL: http://localhost:5173/pro-search?q=Elon%20Musk
```

---

## 🔍 What You'll See

### Loading Phase
```
┌─────────────────────────────────────┐
│  ← Elon Musk        🕒 just now  ⋮  │
├─────────────────────────────────────┤
│  Overview  News  Videos  Images ... │
├─────────────────────────────────────┤
│                                     │
│         ⟳ Loading...                │
│  Analyzing your query with          │
│  multiple perspectives...           │
│                                     │
└─────────────────────────────────────┘
```

### Results Phase
```
┌─────────────────────────────────────┐
│  ← Elon Musk        🕒 2s ago    ⋮  │
├─────────────────────────────────────┤
│  Overview  News  Videos  Images ... │
├─────────────────────────────────────┤
│                                     │
│  📊 Perspectives                    │
│  ├─ Business Impact                 │
│  ├─ Technology Innovation           │
│  └─ Public Opinion                  │
│                                     │
│  📝 Answer                          │
│  Elon Musk is the CEO of...        │
│                                     │
│  🔗 Sources                         │
│  └─ Wikipedia, Forbes, etc.         │
│                                     │
└─────────────────────────────────────┘
```

---

## 🧪 Test Scenarios

### ✅ Test 1: Pro Mode ON
1. Toggle Pro: **ON** (blue)
2. Query: "Elon Musk"
3. Search
4. ✓ URL should be: `/pro-search?q=Elon%20Musk`
5. ✓ Should see tabs: Overview, News, Videos, Images, Sources
6. ✓ Should see Perspectives section

### ✅ Test 2: Pro Mode OFF
1. Toggle Pro: **OFF** (gray)
2. Query: "artificial intelligence"
3. Search
4. ✓ URL should be: `/search?q=artificial%20intelligence`
5. ✓ Regular search results (no tabs, no perspectives)

### ✅ Test 3: Tab Switching
1. Search with Pro ON
2. Wait for results
3. Click **News** tab → See news articles
4. Click **Videos** tab → See video grid
5. Click **Images** tab → See image gallery
6. Click **Sources** tab → See all sources
7. Click **Overview** tab → Back to main view

### ✅ Test 4: Console Logs
Open DevTools Console (F12) and watch for:
```
✓ 🔍 [SWARM] Calling WriterAgent with research data:
✓ 🔍 [WRITER] Initiating fetch to Supabase Edge Function...
✓ 🔍 [WRITER] Fetch completed, response received:
✓ 🔍 [WRITER] Response parsed successfully
✓ SwarmController: WriterAgent completed successfully
```

---

## ⚠️ Troubleshooting

### Issue: Pro Toggle Doesn't Navigate to /pro-search
**Check**: URL after search
- If still `/search?q=...` → SearchBox change didn't apply
- **Solution**: Restart dev server with `npm run dev`

### Issue: Page Shows Error
**Check**: Console for error messages
- TypeScript errors?
- Missing imports?
- **Solution**: Check `get_errors` output

### Issue: Search Hangs
**Check**: Console for timeout messages
- Look for: `❌ [WRITER] Fetch timeout`
- **Solution**: Check Supabase edge function and API keys

### Issue: No Perspectives
**Check**: Console for PerspectiveAgent logs
- May skip on error (non-blocking)
- **Solution**: Normal behavior, results still show

---

## 📊 Success Criteria

✅ Pro toggle changes URL route
✅ Tabs appear in header
✅ Overview shows perspectives
✅ Can switch between tabs
✅ Console shows all debug logs
✅ Search completes in < 30 seconds
✅ No timeout errors
✅ Answer section renders with citations

---

## 🎯 Next Steps After Testing

### If Working ✅
1. Test with multiple queries
2. Test tab switching
3. Verify all console logs
4. Check error handling (try invalid query)
5. **Consider deleting** `/pro-search-v2` route and `ProSearchResultsV2.tsx`

### If Issues ❌
1. Share console errors
2. Check Network tab for failed requests
3. Verify environment variables
4. Review changes in SearchBox.tsx

---

## 📝 Quick Commands

### Start Server
```bash
npm run dev
```

### Kill Port 5173
```bash
lsof -ti:5173 | xargs kill -9
```

### Check TypeScript Errors
Open Command Palette (Cmd+Shift+P):
- Type: "TypeScript: Restart TS Server"

---

## 🎊 Ready!

**Server**: http://localhost:5173/
**Test Query**: Elon Musk
**Pro Toggle**: ON
**Expected Route**: /pro-search?q=Elon%20Musk

**Let's test it! 🚀**
