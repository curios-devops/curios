# 🧪 CuriosAI Testing Guide

## ✅ Issues Fixed

### 1. **LoadingState Modal Theme** ✅ FIXED
- **Problem**: "Searching with SearxNG..." modal showed light colors in dark theme
- **Solution**: Updated LoadingState.tsx with proper theme-responsive classes
- **Test**: Search for anything and toggle dark/light mode while loading

### 2. **LinkedIn Sharing Dynamic Content** 🔄 READY FOR PRODUCTION
- **Problem**: LinkedIn shows static "CuriosAI Web Search" instead of query-specific content
- **Solution**: Complete LinkedIn sharing system with Edge Functions
- **Status**: Needs deployment to curiosai.com to work (Edge Functions only work in production)

## 🎯 **What You Need to Copy to Production**

### **Files to Copy to Your curiosai.com Project:**

1. **Theme Fix (LoadingState.tsx)**
   ```tsx
   // Copy this entire file content to your production project
   // File: src/components/results/LoadingState.tsx
   ```

2. **LinkedIn Edge Function**
   ```typescript
   // Copy to: netlify/edge-functions/social-meta.ts
   // This detects LinkedIn bot and serves dynamic HTML
   ```

3. **Dynamic OG Image Function**
   ```typescript
   // Copy to: netlify/functions/og-image.ts
   // This generates query-specific images
   ```

4. **Netlify Configuration**
   ```toml
   # Add these sections to your netlify.toml
   [[edge_functions]]
   function = "social-meta"
   path = "/search"
   ```

5. **Meta Tags Utility**
   ```typescript
   // Update: src/utils/metaTags.ts
   // Enhanced LinkedIn meta tag handling
   ```

## 🧪 **Local Testing (Current Environment)**

### **Test 1: Theme Fix**
1. Start a search (dev server is running)
2. Watch for "Searching with SearxNG..." modal
3. Toggle theme (dark/light) - modal should adapt correctly ✅

### **Test 2: LinkedIn Sharing (Preparation)**
Since Edge Functions don't work locally, we can test the components:

1. **Open**: http://localhost:5173/linkedin-share-test.html
2. **Check**: Meta tag generation works
3. **Verify**: Share URLs are correct format

## 🚀 **Production Testing (After Deploy)**

### **Test LinkedIn Sharing on curiosai.com:**

1. **Deploy your fixes** to curiosai.com via GitHub
2. **Test URL**: https://curiosai.com/search?q=artificial%20intelligence
3. **LinkedIn Inspector**: https://www.linkedin.com/post-inspector/
4. **Expected Result**: 
   - Title: "artificial intelligence"
   - Description: AI-powered search results...
   - Image: Dynamic generated image with query

### **Test OG Image Generation:**
- **Direct URL**: https://curiosai.com/.netlify/functions/og-image?query=test
- **Expected**: SVG image with "test" as title

## 📋 **Deployment Checklist**

- [ ] Copy LoadingState.tsx → Fixes theme issue immediately
- [ ] Copy Edge Function files → Enables LinkedIn dynamic previews
- [ ] Copy Netlify config → Routes Edge Functions correctly
- [ ] Test on staging first if available
- [ ] Deploy to production via GitHub
- [ ] Test LinkedIn Post Inspector
- [ ] Verify theme switching works

## 🎯 **Expected Results After Production Deploy**

### **Theme Modal**: 
- ✅ "Searching with SearxNG..." modal respects dark/light theme
- ✅ Smooth transitions between themes
- ✅ Consistent styling with rest of app

### **LinkedIn Sharing**:
- ✅ Dynamic titles based on search query
- ✅ AI overview snippets as descriptions  
- ✅ Custom branded images per search
- ✅ Professional LinkedIn preview cards

**Ready to copy files to your production project! 🚀**
