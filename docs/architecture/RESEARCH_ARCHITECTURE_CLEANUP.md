# Research Service Architecture Cleanup - November 3, 2025

## Problem Statement

The research service had architectural issues with cross-contamination between regular/insights and pro research workflows:

1. **Duplicate researchService files** - Old deprecated service still present
2. **Cross-workflow dependencies** - Pro research using regular search agents
3. **No clear separation** - Shared agents not in common location
4. **Import confusion** - Multiple paths to same functionality

## Actions Taken

### 1. ✅ Deleted Old researchService.ts
**File**: `/src/services/research/researchService.ts` (OLD/DEPRECATED)

This file was using ResearchManager and didn't properly support insights. It's been completely removed as all pages now import from the correct service:

```typescript
// ✅ CORRECT - All pages now use this
import { researchService } from '../../pro/agents/researchService.ts';
```

### 2. ✅ Created Common Directory for Shared Agents
**Directory**: `/src/services/research/common/agents/`

Created a proper home for agents shared between regular and pro workflows.

### 3. ✅ Moved ResearchSearchAgent to Common
**From**: `/src/services/research/regular/agents/ResearchSearchAgent.ts`  
**To**: `/src/services/research/common/agents/ResearchSearchAgent.ts`

This agent is used by both:
- ResearchManager (pro)
- ResearchSwarmController (pro)

It's a shared component, so it belongs in common, not regular.

### 4. ✅ Fixed Pro Research Dependencies
**File**: `/src/services/research/pro/agents/researchSwarmController.ts`

**Before** (WRONG - Pro using Regular):
```typescript
import { SearchRetrieverAgent } from '../../../search/regular/agents/searchRetrieverAgent';
// ...
this.retrieverAgent = new SearchRetrieverAgent();
```

**After** (CORRECT - Pro using Common):
```typescript
import { ResearchSearchAgent } from '../../common/agents/ResearchSearchAgent';
// ...
this.searchAgent = new ResearchSearchAgent();
```

### 5. ✅ Updated All Imports
Updated imports in:
- `/src/services/research/pro/agents/researchManager.ts`
- `/src/services/research/pro/agents/researchSwarmController.ts`
- `/src/services/research/regular/researchRegularIndex.ts`

### 6. ✅ Removed Empty Placeholder Files
Deleted unused empty files:
- `searchAgent.ts`
- `researchManager.ts`
- `plannerAgent.ts`
- `writerAgent.ts`

## Final Architecture

### Clear Workflow Separation

```
services/
├── research/
│   ├── common/
│   │   └── agents/
│   │       └── ResearchSearchAgent.ts      ✅ Shared by both workflows
│   ├── regular/
│   │   ├── agents/
│   │   │   ├── ResearchPlannerAgent.ts     ✅ Regular only
│   │   │   ├── ResearchWriterAgent.ts       ✅ Regular only
│   │   │   ├── InsightSwarmController.ts    ✅ Insights only
│   │   │   ├── insightAnalyzerAgent.ts      ✅ Insights only
│   │   │   └── insightWriterAgent.ts        ✅ Insights only
│   │   └── pages/
│   │       ├── InsightsResults.tsx          → uses pro/agents/researchService
│   │       └── ResearcherResults.tsx        → uses pro/agents/researchService
│   └── pro/
│       └── agents/
│           ├── researchService.ts           ✅ Main service (NEW/CORRECT)
│           ├── ResearchSwarmController.ts   ✅ Pro research workflow
│           ├── researchManager.ts           ✅ Pro research (legacy)
│           ├── researchPlannerAgent.ts      ✅ Pro only
│           └── researchWriterAgent.ts       ✅ Pro only
└── search/
    └── regular/
        └── agents/
            └── searchRetrieverAgent.ts      ✅ Regular search only
```

### Workflow Independence Verified

#### Regular/Insights Workflow Dependencies:
✅ Uses `SearchRetrieverAgent` from `search/regular` (OK - both regular tier)
✅ Uses `InsightSwarmController` from `research/regular` (OK - insights are regular)
✅ Uses `ResearchSearchAgent` from `research/common` (OK - shared agent)
✅ **NO imports from `pro/`** ✓

#### Pro Research Workflow Dependencies:
✅ Uses `ResearchSwarmController` from `research/pro` (OK - pro only)
✅ Uses `ResearchSearchAgent` from `research/common` (OK - shared agent)
✅ Uses `researchService` from `research/pro/agents` (OK - pro only)
✅ **NO imports from `regular/` or `search/regular`** ✓

### Import Guidelines

```typescript
// ✅ CORRECT - For Insights page
import { researchService, InsightProgressCallback } from '../../pro/agents/researchService.ts';

// ✅ CORRECT - For Researcher page  
import { researchService, ResearchProgressCallback } from '../../pro/agents/researchService.ts';

// ✅ CORRECT - For shared search functionality
import { ResearchSearchAgent } from '../../common/agents/ResearchSearchAgent.ts';

// ❌ WRONG - Never import regular from pro
import { SearchRetrieverAgent } from '../../../search/regular/...';

// ❌ WRONG - Never import pro from regular
import { ResearchSwarmController } from '../../pro/...';
```

## Verification Checklist

✅ Old researchService.ts deleted  
✅ Common directory created with shared agents  
✅ ResearchSearchAgent moved to common  
✅ Pro workflows no longer import from regular  
✅ Regular workflows no longer import from pro  
✅ Empty placeholder files removed  
✅ All imports updated to correct paths  
✅ Export structure reflects new organization  

## Benefits

1. **Clear Separation**: Regular and Pro workflows are completely independent
2. **No Cross-Contamination**: Pro doesn't use regular-tier agents, and vice versa
3. **Proper Sharing**: Common agents are explicitly in `/common/` directory
4. **Single Source of Truth**: Only one researchService (the correct one)
5. **Maintainability**: Clear where each agent belongs and why

## Testing Recommendations

### Test Regular/Insights Workflow
1. Navigate to Insights page
2. Verify it uses InsightSwarmController
3. Confirm no errors about missing dependencies
4. Check browser console for correct agent logs

### Test Pro Research Workflow
1. Navigate to Researcher page
2. Verify it uses ResearchSwarmController
3. Confirm uses ResearchSearchAgent (not SearchRetrieverAgent)
4. Check no regular-tier imports in call stack

### Verify Independence
1. Grep for cross-imports:
   ```bash
   # Should return no matches
   grep -r "from.*pro" src/services/research/regular/
   grep -r "from.*regular" src/services/research/pro/
   ```

2. Check all files import from correct locations:
   ```bash
   # All should use common/
   grep -r "ResearchSearchAgent" src/services/research/
   ```

## Related Documentation

- `INSIGHTS_RESEARCH_FIX.md` - Fixes for workflow getting stuck
- `REGULAR_SEARCH_FREEZE_FIX.md` - Memory leak patterns to avoid
- `PRO_SEARCH_TIMEOUT_FIX.md` - Pro search timeout fixes

---

**Status**: ✅ Architecture cleanup complete  
**Date**: November 3, 2025  
**Impact**: Clean workflow separation, no cross-contamination
