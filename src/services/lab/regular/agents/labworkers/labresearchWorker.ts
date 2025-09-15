import { Artifact, ArtifactStep, Citation } from '../../../../../commonApp/types/index';
import { searxngSearch } from '../../../../../commonService/searchTools/searxng';
import { secureOpenAI } from '../../../../secureOpenAI.ts';
import { env } from '../../../../../config/env.ts';

// --- OpenAI websearch tool integration ---
// Uses secureOpenAI with the Responses API (web_search_preview)
// Fallback to DuckDuckGo/SearxNG if OpenAI API key is not configured or fails

const hasOpenAI = !!env.openai.apiKey;

function parseCitationsFromOpenAI(response: any): Citation[] {
  // Find annotations in the response
  if (!response || !response.content || !Array.isArray(response.content)) return [];
  const content = response.content[0];
  if (!content || !content.annotations) return [];
  return content.annotations
    .filter((a: any) => a.type === 'url_citation')
    .map((a: any) => ({
      url: a.url,
      title: a.title,
      start_index: a.start_index,
      end_index: a.end_index,
    }));
}

async function openaiWebsearch(prompt: string): Promise<{text: string, citations: Citation[]}> {
  if (!hasOpenAI) {
    return { text: '', citations: [] };
  }
  try {
    const response = await secureOpenAI.responses.create({
      model: 'gpt-4o-mini',
      tools: [{ type: 'web_search_preview' }],
      input: prompt,
      tool_choice: { type: 'web_search_preview' },
    });
    let text = '';
    if (response && (response as any).output_text) {
      text = (response as any).output_text as string;
    } else if (response && response.content && response.content[0] && (response.content[0] as any).text) {
      text = (response.content[0] as any).text as string;
    }
    const citations = parseCitationsFromOpenAI(response);
    return { text, citations };
  } catch (e) {
    return { text: '', citations: [] };
  }
}

async function generateSubtasks(prompt: string): Promise<string[]> {
  // Use OpenAI if available
  if (hasOpenAI) {
    try {
      const response = await secureOpenAI.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that breaks down a user question into clear, actionable research subtasks. Respond only with a JSON array of up to 5 subtasks, each as a short imperative sentence.' },
          { role: 'user', content: `Break down the following question into no more than 5 clear research subtasks. Respond only with a JSON array.\n\nQuestion: ${prompt}` }
        ],
        temperature: 0.2,
        max_tokens: 200,
        response_format: { type: 'json_object' }
      });
      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) return parsed;
        if (Array.isArray(parsed.subtasks)) return parsed.subtasks;
      }
    } catch (e) {
      // Fallback below
    }
  }
  // Fallback: split prompt into 1-3 generic subtasks
  return [
    `Research background and context for: ${prompt}`,
    `Find recent developments or news about: ${prompt}`,
    `Summarize key findings and implications for: ${prompt}`
  ].slice(0, Math.max(1, Math.min(3, Math.ceil(prompt.length / 40))));
}

export async function researchWorker(artifact: Artifact, prompt: string, updateArtifact: (partial: Partial<Artifact>) => void): Promise<Artifact> {
  console.log('🔎 ResearchWorker: Starting research for prompt:', prompt);
  // Generate subtasks (steps)
  const subtasks = await generateSubtasks(prompt);
  let steps: ArtifactStep[] = subtasks.map((subtask, i) => ({
    name: subtask,
    status: (i === 0 ? 'in_progress' : 'pending') as ArtifactStep['status'],
    result: '',
    citations: [],
    agentName: i === 0 ? 'Researcher' : undefined,
    agentStatus: i === 0 ? 'is working' : undefined,
    thinkingSince: i === 0 ? Date.now() : undefined,
  }));

  // Add subtasks to thinkingLog
  const thinkingLog = artifact.thinkingLog ? [...artifact.thinkingLog] : [];
  subtasks.forEach((subtask, i) => {
    thinkingLog.push(`${i + 1}. ${subtask}`);
  });
  thinkingLog.push('You can interrupt me at any time during my work to provide new information or adjust the plan.');
  thinkingLog.push(`Searching for general information about ${prompt}.`);

  updateArtifact({
    ...artifact,
    steps,
    thinkingLog,
  });

  let result: {text: string, citations: Citation[]} = { text: '', citations: [] };
  if (hasOpenAI) {
    try {
      result = await openaiWebsearch(prompt);
      console.log('🔎 ResearchWorker: OpenAI websearch result:', result.text);
      if (result.citations && result.citations.length > 0) {
        thinkingLog.push('**Web sources found:**');
        result.citations.forEach((c, idx) => {
          thinkingLog.push(`${idx + 1}. [${c.title}](${c.url})`);
        });
      }
    } catch (e) {
      result = { text: '', citations: [] };
      console.log('🔎 ResearchWorker: OpenAI websearch failed:', e);
    }
  }
  // Fallback: use searxngSearch (RapidAPI)
  if (!result.text) {
    try {
      const searxngRes = await searxngSearch(prompt);
      // Flatten web results into text
      const webText = searxngRes.web.map((r: any) => r.title + '\n' + r.snippet).join('\n\n');
      result = { text: webText, citations: [] };
      if (searxngRes.web && searxngRes.web.length > 0) {
        thinkingLog.push('**Web sources found (SearxNG):**');
        searxngRes.web.forEach((r: any, idx: number) => {
          thinkingLog.push(`${idx + 1}. [${r.title}](${r.url})`);
        });
      }
      console.log('🔎 ResearchWorker: SearxNG websearch result:', webText);
    } catch (e) {
      result = { text: `SearxNG search failed: ${e}`, citations: [] };
      console.log('🔎 ResearchWorker: SearxNG websearch failed:', e);
    }
  }

  thinkingLog.push('Summarizing findings and preparing the answer.');
  console.log('🔎 ResearchWorker: Passing research result to artifact. Length:', result.text.length);

  // Mark all steps as complete and clear agent status, except last
  const completedSteps = steps.map((step, idx) =>
    idx === steps.length - 1
      ? { ...step, status: 'in_progress' as ArtifactStep['status'], agentName: 'Researcher', agentStatus: 'is working', thinkingSince: Date.now() }
      : { ...step, status: 'complete' as ArtifactStep['status'], result: result.text, agentStatus: undefined, thinkingSince: undefined }
  );
  const updatedArtifact = {
    ...artifact,
    steps: completedSteps,
    thinkingLog,
  };
  updateArtifact(updatedArtifact);
  return updatedArtifact;
}