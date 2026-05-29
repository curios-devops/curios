# Development Scripts Guide

Quick reference for running the development server with different options.

---

## 🎯 **Recommended: Quick Testing**

```bash
npm run dev
```

**What it does:**
- ✅ Runs Netlify Dev + Vite
- ✅ **Auto-opens http://localhost:5173 ONLY** (not port 8888)
- ✅ Shows all output (functions loaded, Vite ready, etc.)
- ✅ Functions available on port 8888
- ✅ Direct app access on http://localhost:5173

**When to use:** Most of the time - opens your app, skips the Netlify proxy page

---

## 🔇 **Super Quiet Mode**

```bash
npm run dev:quiet
```

**What it does:**
- ✅ Runs Netlify Dev + Vite
- ✅ **Auto-opens http://localhost:5173**
- ✅ **Filters out** function loading messages and Netlify branding
- ✅ Only shows important logs (errors, warnings, ready messages)

**When to use:** When you want minimal terminal noise

---

## 🌐 **Open All Ports**

```bash
npm run dev:all
```

**What it does:**
- ✅ Runs Netlify Dev + Vite
- ✅ **Auto-opens BOTH** localhost:8888 AND localhost:5173
- ✅ Shows all output

**When to use:** When you need to see both the Netlify proxy and direct Vite dev server

---

## ⚡ **Fast Mode (Vite Only)**

```bash
npm run dev:fast
```

**What it does:**
- ✅ Runs **only Vite** (no Netlify functions)
- ✅ **Auto-opens browser** to http://localhost:5173
- ✅ Much faster startup
- ❌ No Netlify functions available

**When to use:**
- Frontend-only work (UI, components, styling)
- When you don't need edge functions

---

## 📊 **Comparison Table**

| Script | Browser Opens | Functions | Output | Speed |
|--------|--------------|-----------|---------|-------|
| `npm run dev` | ✅ 5173 only | ✅ Yes | 📢 Full | 🐢 Normal |
| `npm run dev:quiet` | ✅ 5173 only | ✅ Yes | 🔇 Filtered | 🐢 Normal |
| `npm run dev:all` | ✅ Both ports | ✅ Yes | 📢 Full | 🐢 Normal |
| `npm run dev:fast` | ✅ 5173 only | ❌ No | 📢 Vite only | ⚡ Fast |

---

## 🎬 **Quick Start Workflow**

### For Testing (Recommended)
```bash
# Start dev server - browser auto-opens to localhost:5173
npm run dev

# Wait for browser to open automatically
# You'll see: http://localhost:5173
```

### For Quiet Testing
```bash
npm run dev:quiet
# Browser auto-opens to http://localhost:5173
# Minimal terminal output
```

### For Quick UI Work
```bash
npm run dev:fast
# Browser auto-opens to http://localhost:5173
```

---

## 🔧 **What Changed**

### Before:
- `npm run dev` opened **2 browser tabs** (port 8888 AND localhost:5173)
- Lots of terminal output with function loading messages
- Both tabs opened every time

### After:
- `npm run dev` opens **1 browser tab** (localhost:5173 only) ⭐
- `npm run dev:quiet` filters unnecessary output + opens localhost:5173
- `npm run dev:all` if you want both tabs to open
- `npm run dev:fast` for frontend-only work (Vite only, no functions)

---

## 📝 **Notes**

- **Port 8888:** Netlify Dev proxy (includes functions + app)
- **Port 5173:** Direct Vite server (with functions via proxy) ⭐
- **Recommended workflow:** Use `npm run dev` - auto-opens localhost:5173
- **For silence:** Use `npm run dev:quiet`
- **For speed:** Use `npm run dev:fast` (Vite only, no Netlify)

---

## 🐛 **Troubleshooting**

### Too much terminal output?
```bash
npm run dev:quiet
```

### Functions not working?
Make sure you're using `npm run dev` or `npm run dev:all`, NOT `dev:fast`

### Want both browser tabs to open?
```bash
npm run dev:all
```

### Want the fastest startup?
```bash
npm run dev:fast
# (No functions, Vite only)
```

---

## ⚙️ **Configuration Files Modified**

1. **vite.config.ts:** Changed `open: true` → `open: false`
2. **netlify.toml:** Added `autoLaunch = false`
3. **package.json:** Updated `dev` script to use `--no-open` flag

You can revert these changes anytime if needed!
