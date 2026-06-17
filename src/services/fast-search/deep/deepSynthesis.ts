// Ask Deeper — Step C: structured synthesis.
// One streaming LLM pass over the deduped sources, forced into the research-grade
// section structure from the refactor spec. Reuses the shared streaming primitive.

import { streamLLMText, buildSourcesText } from '../providers/llmProvider';
import type { WebSearchResult } from '../providers/webSearchProvider';

// Ask Deeper uses the full (non-mini) model for research-grade synthesis.
// Default tier stays on gpt-5-mini.
const DEEP_MODEL = import.meta.env.VITE_FASTSEARCH_DEEP_MODEL || 'gpt-5';

export interface DeepSynthesisContext {
  query: string;
  webResults: WebSearchResult[];
  date: string;
  locale: string;
}

/**
 * Stream a structured, research-grade answer. Returns the full text once the
 * stream completes (caller extracts follow-ups / summary from it).
 */
export async function generateDeepAnswerStreaming(
  context: DeepSynthesisContext,
  onChunk: (chunk: string) => void
): Promise<string> {
  const userMessage = `You are a research analyst. Using ONLY the search results below, write a thorough, research-grade answer to: "${context.query}"

Search Results:
${buildSourcesText(context.webResults)}

Structure the answer in markdown with these exact section headings, in this order:
## Summary
A rich but focused overview (a few short paragraphs).
## Key Insights
3-6 bullet points with the most important takeaways.
## Evidence
The supporting detail, citing multiple sources.
## Contrapoints & Risks
Alternative views, criticisms, limitations or risks found in the sources.
## Context & Trends
Current developments, trends, and what people are saying (social/forum signals if present).

Requirements:
- Use inline citations with the website name like [wikipedia], [nytimes], [bbc]. Use [sitename +N] when multiple results share a site.
- Be substantive (roughly 1.5-2x a normal answer) but do not pad.
- After the sections, add "## Follow-up Questions:" with 3-5 numbered questions.

Today's date: ${context.date}
Language: ${context.locale}`;

  // Higher token budget + longer timeout for the "report" tier, on the full model.
  return streamLLMText(userMessage, 3000, onChunk, 90000, DEEP_MODEL);
}
