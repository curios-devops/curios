# Explore Page Feature

**Date**: 2026-05-22
**Status**: ✅ Implemented

## Overview

A new **Explore** page has been created at `/explore` that displays trending news and topics using the SerpAPI Google News endpoint. The page is accessible to all users (no authentication required) and follows the app's design system for a consistent look and feel.

## Design

### Inspiration
- Based on Perplexity's Discover page concept
- Follows the app's Homepage Style Guide for consistency
- Modern, clean, minimalist interface with responsive design

### Layout
- **Featured Article** (first news item): Title and snippet on the left, image on the right
- **Regular Articles**: Image on top, title and snippet below
- **Grid Layout**: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)

### Visual Elements
- Typography matches homepage style (Inter/System UI)
- Supports light and dark themes
- Uses app's accent color system
- Smooth hover effects on cards
- Responsive for all screen sizes

## Technical Implementation

### Files Created/Modified

1. **Created**: `src/mainPages/Explore.tsx`
   - Main Explore page component
   - Calls Supabase Edge Function for news
   - Displays news in responsive grid layout

2. **Created**: `supabase/functions/google-news/index.ts`
   - Supabase Edge Function for secure API calls
   - Keeps SERPAPI_API_KEY server-side
   - Handles Google News API requests

3. **Modified**: `src/main.tsx`
   - Added lazy-loaded route for `/explore`
   - Imported Explore component

4. **Modified**: `src/components/Sidebar.tsx`
   - Removed `requiresAuth` from Explore NavItem
   - Page now accessible without sign-in

### API Integration

**Architecture**: Secure server-side API calls via Supabase Edge Function

**Backend**: `supabase/functions/google-news/index.ts`
- Keeps `SERPAPI_API_KEY` secure on the server (not exposed to frontend)
- Handles SerpAPI calls to `https://serpapi.com/search?engine=google_news`
- Provides CORS-enabled endpoint

**Frontend**: Calls Supabase Edge Function
- Base URL: `VITE_SERP_API_URL` (modified to `/google-news` endpoint)
- Example: `https://gpfccicfqynahflehpqo.supabase.co/functions/v1/google-news`

**Environment Variables**:
- `SERPAPI_API_KEY` - Server-side only (stored in Supabase Edge Function secrets)
- `VITE_SERP_API_URL` - Frontend URL to Supabase Edge Functions base

**Response Structure**:
```typescript
interface NewsArticle {
  title: string;
  link: string;
  snippet: string;
  date: string;
  source: string;
  thumbnail?: string;
}
```

### Features

#### Loading State
- Animated spinner using accent color
- "Loading news..." message

#### Error State
- Clear error message display
- Retry button

#### News Display
- Source name and date for each article
- Clickable cards that open articles in new tab
- Hover effects (border color change, shadow)
- Images with smooth scale transition on hover

## Navigation

### Sidebar
- "Explore" menu item with Globe2 icon
- Available to all users (no auth required)
- Properly highlighted when active

### Translation Support
All languages supported with existing keys:
- English: "Explore"
- Spanish: "Explorar"
- German: "Entdecken"
- French: "Explorer"
- Italian: "Esplora"
- Portuguese: "Explorar"
- Catalan: "Explorar"
- Japanese: "探す"

## Responsive Design

### Breakpoints
- Mobile (< 640px): Single column layout
- Tablet (640-1024px): 2 columns
- Desktop (> 1024px): 3 columns

### Layout Adjustments
- Featured article switches to vertical layout on mobile
- Proper padding and spacing on all screen sizes
- Max width: 1200px centered container

## Theme Support

### Light Theme
- Uses `var(--ui-bg-primary)` for background
- `var(--ui-text-primary)` for main text
- `var(--ui-text-secondary)` for metadata
- `var(--ui-border-default)` for borders

### Dark Theme
- Automatically adapts to dark theme variables
- Accent color highlights on hover

## Future Enhancements

Possible improvements for later:
1. Category filters (Technology, Business, Sports, etc.)
2. Search within news
3. Personalized news based on user interests
4. Bookmarking favorite articles
5. News categories/topics navigation
6. Pagination or infinite scroll
7. Time filters (Today, This Week, etc.)

## Security

✅ **API Key Protection**: The `SERPAPI_API_KEY` is stored server-side in Supabase Edge Function secrets and never exposed to the frontend.

✅ **Secure Architecture**: All SerpAPI calls are made server-side via the `google-news` edge function.

✅ **CORS Protection**: Edge function includes proper CORS headers for the frontend domain.

## Deployment

See [EXPLORE_PAGE_DEPLOYMENT.md](../deployment/EXPLORE_PAGE_DEPLOYMENT.md) for detailed deployment instructions.

**Quick Deploy**:
```bash
# Deploy edge function
supabase functions deploy google-news

# Set API key secret
supabase secrets set SERPAPI_API_KEY=your_key_here
```

## Testing Checklist

- [ ] Edge function deployed successfully
- [ ] API key secret set in Supabase
- [ ] Page loads without errors
- [ ] News fetches correctly from edge function
- [ ] API key not visible in browser network tab
- [ ] Light theme displays correctly
- [ ] Dark theme displays correctly
- [ ] All accent colors work properly
- [ ] Responsive on mobile (< 640px)
- [ ] Responsive on tablet (640-1024px)
- [ ] Responsive on desktop (> 1024px)
- [ ] Links open in new tab
- [ ] Hover effects work smoothly
- [ ] Loading state displays properly
- [ ] Error state displays and retry works
- [ ] Sidebar navigation works
- [ ] Active state shows correctly
- [ ] All translations display correctly

## References

- Design: [Homepage Style Guide](../UX|%20UI/Homepage_style.md)
- API: [SerpAPI Google News](https://serpapi.com/google-news-api)
- Inspiration: Perplexity Discover page
