Agent Instruction Brief

Goal:
Refactor the current swarm-based workflow for search results to significantly reduce latency while keeping the existing logic, features, and external workloads fully intact.

What to do:
	•	Analyze the current agent chain including the hi agent, research agent, Brave search integrations (text + image), and the writer agent.
	•	Identify where sequential processing, duplicated work, or unnecessary handoffs create latency.
	•	Propose and apply a refactor that reduces end-to-end response time while preserving functionality.
	•	Consolidate or simplify agent roles where beneficial, without altering user-facing behavior.
	•	Ensure external API calls (Brave, fallback search providers) are executed efficiently and, when appropriate, in parallel.
	•	Review how the research results are transferred to the writer agent and remove redundant transforms or formatting overhead.
	•	Optimize the flow so results can be streamed earlier without waiting for slow paths.
	•	Apply the refactor in a minimal-risk way that maintains compatibility with current workloads, routes, handlers, and orchestrations.

What to look at:
	•	Current agent-to-agent call graph and the number of sequential LLM calls.
	•	Implementation of Brave text/image search and any wrappers around them.
	•	The research aggregation logic and timing of synchronous vs. parallel tasks.
	•	Writer-agent formatting, schema constraints, and retry patterns.
	•	Any middleware or orchestrator logic that may inject delays.
	•	Logs and telemetry around average/slowest path timings to pinpoint bottlenecks.
	•	Caching layers, if present, and whether they are being utilized or bypassed.

Refactor focus:
	•	Reduce the number of sequential agent hops.
	•	Parallelize external API requests where safe.
	•	Remove redundant transformations between agents.
	•	Improve early-response streaming behavior.
	•	Minimize model calls where possible.
	•	Preserve all existing functionality and accuracy.
    -   Focus on refactor the writer agent to use stream response from open ai the minimize the time to show up the response.

Safety clause:
Be careful: do not break existing swarm workload logic, fallbacks, messaging flows, or any routes used by other services agents or components.
