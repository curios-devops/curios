ToDO:
1.re-read the insight / regular resarch in the services / research / regular directory.
2.keep Debuging the workflow that it got stuck in insights analizer agent and those are the last lines in console before stuck:
🔍 [REGULAR SEARCH] WriterAgent.execute() completed
regularSearchService.ts:100 ✅ [REGULAR SEARCH] WriterAgent complete: {success: true, hasContent: true, contentLength: 3251}
regularSearchService.ts:111 ✅ [REGULAR SEARCH] Writer SUCCESS
regularSearchService.ts:114 ✅ [REGULAR SEARCH] Formatting response...
regularSearchService.ts:131 ✅✅✅ [REGULAR SEARCH] === COMPLETE - RETURNING TO UI === {hasAnswer: true, answerLength: 3251, sourcesCount: 10, imagesCount: 10, videosCount: 6, …}
SearchResults.tsx:101 ⚠️ [SearchResults] Request cancelled, not updating state
logger.ts:67 [2025-11-03T21:35:08.040Z] INFO: ResearchPlannerAgent: Planning completed {"complexity":"complex","queryCount":4}
2.1 refactor the swarm and the "Insights X" agents to follow the same estructure that we use in the regular search (be very carefully to not modify the agents, tool or other logic from regular search ) 
2.2 also look for memory leeks or potential complex logic that can freeze the web, read the REGULAR_SEARCH_FREEZE_FIX.md file and look for similar paterns that can potentially froze the app.
2.3 put specia atention why ⚠️ [SearchResults] Request was cancelled