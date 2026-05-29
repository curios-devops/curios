# Avatar Grid Selector with Image Support

## Summary

Successfully upgraded the avatar selector to a **3x2 grid layout** with support for avatar images from the Anam API. The selector now displays 6 avatars (Cora, Liz, Astrid, Leo, Finn, Pablo) with circular thumbnails and names.

## What Was Implemented

### 1. **Anam API Image Support**

**Discovered**: Anam API provides `imageUrl` field in the `/v1/avatars` endpoint response:
```json
{
  "data": [{
    "id": "<string>",
    "displayName": "<string>",
    "imageUrl": "<string>",
    "variantName": "<string>",
    "createdAt": "<string>",
    "updatedAt": "<string>"
  }]
}
```

**Updated Files**:
- `supabase/functions/list-anam-avatars/index.ts` - Added `imageUrl` field extraction
- `src/services/search/avatar/services/listAnamAvatars.ts` - Added `imageUrl` to interface

### 2. **Pablo Avatar Added**

**Updated Files**:
- `.env` - Added `VITE_ANAM_AVATAR_PABLO_ID`
- `src/config/env.ts` - Added Pablo to avatar configuration
- `src/services/search/avatar/components/AvatarSelector.tsx` - Added Pablo to available avatars

### 3. **3x2 Grid Layout**

**New Design**:
```
[Cora]  [Liz]   [Astrid]
[Leo]   [Finn]  [Pablo]
```

Each avatar cell displays:
- **64x64px circular image** (or User icon placeholder if no image)
- **Avatar name** below the image
- **Accent color ring** around selected avatar
- **Hover effect** on non-selected avatars

### 4. **Smart Image Handling**

**Features**:
- Displays avatar `imageUrl` from Anam API if available
- Falls back to User icon if `imageUrl` is `undefined`
- Falls back to User icon if image fails to load (`onError` handler)
- Graceful degradation for all scenarios

## Current Avatar Configuration

You need to provide the following IDs in `.env`:

```env
# Only CORA is custom - others need their IDs added
VITE_ANAM_AVATAR_CORA_ID=your-cora-id-here        # ✅ Custom avatar you created
VITE_ANAM_AVATAR_LIZ_ID=071b0286-4cce-4808-bee2-e642f1062de3  # ✅ Already configured
VITE_ANAM_AVATAR_ASTRID_ID=                       # ❌ Need to add
VITE_ANAM_AVATAR_LEO_ID=                          # ❌ Need to add
VITE_ANAM_AVATAR_FINN_ID=                         # ❌ Need to add
VITE_ANAM_AVATAR_PABLO_ID=                        # ❌ Need to add
```

## How to Get Avatar IDs and Images

### Option 1: Use Anam's Stock Avatars

1. **List available avatars** via Anam API:
   ```bash
   curl --request GET \
     --url https://api.anam.ai/v1/avatars \
     --header 'Authorization: Bearer YOUR_ANAM_API_KEY'
   ```

2. **Response includes**:
   - `id` - Use this for `.env` configuration
   - `displayName` - Avatar name
   - `imageUrl` - Avatar thumbnail (will display in grid automatically)

3. **Find avatars named**: Astrid, Leo, Finn, Pablo (or similar)

### Option 2: Create Custom Avatars (Like CORA)

1. Go to **Anam Lab** (https://lab.anam.ai/)
2. **Upload an image** or **generate via text prompt**
3. Avatar generates in ~2 minutes
4. **Copy the avatar ID** from the Avatar Gallery
5. Avatar's `imageUrl` will be automatically available via API

## UI Changes

### Before (Dropdown List)
```
┌─────────────────┐
│ Cora         ▼ │
├─────────────────┤
│ Cora           │ ← Selected
│ Liz            │
│ Astrid         │
│ Leo            │
│ Finn           │
└─────────────────┘
```

### After (3x2 Grid)
```
┌─────────────────────────────┐
│ Cora         ▼             │
├─────────────────────────────┤
│  ●●●●●    ●●●●●    ●●●●●  │
│  ●Img●    ●Img●    ●Img●  │ ← Avatar images (64x64 circles)
│  ●●●●●    ●●●●●    ●●●●●  │
│   Cora      Liz    Astrid  │
│                             │
│  ●●●●●    ●●●●●    ●●●●●  │
│  ●Img●    ●Img●    ●Img●  │
│  ●●●●●    ●●●●●    ●●●●●  │
│    Leo     Finn    Pablo   │
└─────────────────────────────┘
```

## Technical Implementation

### Avatar Selector Component

**File**: `src/services/search/avatar/components/AvatarSelector.tsx`

**Key Features**:
- **Grid**: `grid grid-cols-3 gap-2 w-[280px]`
- **Circular images**: `w-16 h-16 rounded-full`
- **Selected state**: Ring with accent color `ring-2 ring-offset-1`
- **Image fallback**: `User` icon from lucide-react
- **Error handling**: `onError` switches to fallback on image load failure

### Avatar Interface

```typescript
export interface AvatarOption {
  id: string;          // Anam avatar ID
  name: string;        // Lowercase name (cora, liz, etc)
  label: string;       // Display name (Cora, Liz, etc)
  imageUrl?: string;   // Optional Anam avatar thumbnail
}
```

## How Images Are Loaded

1. **Anam API** returns avatars with `imageUrl` field
2. **Supabase function** `list-anam-avatars` fetches and includes `imageUrl`
3. **Frontend** uses `imageUrl` if available, otherwise shows User icon
4. **Fallback chain**: `imageUrl` → `onError` handler → User icon placeholder

## Next Steps

### To Get Avatar Images Working:

1. **Add missing avatar IDs to `.env`**:
   - Get IDs from Anam API or Anam Lab
   - Update ASTRID, LEO, FINN, PABLO entries

2. **Images will load automatically** if:
   - Avatar ID is valid
   - Avatar has an `imageUrl` in Anam's database
   - No manual image upload needed!

3. **Test the selector**:
   ```bash
   npm run dev
   ```
   - Click avatar dropdown
   - Should see 3x2 grid with images (or placeholders)
   - Selected avatar has accent-colored ring

## Build Status

✅ Build successful
✅ TypeScript types correct
✅ Grid layout responsive
✅ Image loading with fallbacks
✅ All 6 avatars supported

## Alternative: Use Anam's Dynamic Avatar List

Instead of hardcoding 6 avatars, you could **fetch avatars dynamically** from Anam:

1. Call `listAnamAvatars()` on component mount
2. Display whatever avatars Anam returns
3. Images automatically included from API

This would make the selector truly dynamic and always show your latest avatars.

---

**Questions?**
- ✅ Yes, you need IDs for all 6 avatars (or remove the ones you don't want)
- ✅ CORA is custom, others can be stock avatars from Anam
- ✅ Images come from Anam API automatically once IDs are configured
- ✅ No manual image upload needed - Anam provides `imageUrl`
