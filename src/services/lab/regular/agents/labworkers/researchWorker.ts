import { Artifact, ArtifactStep, Citation } from '../../../../../commonApp/types/index';
import { searxngSearch } from '../../../../../commonService/searchTools/searxng';

// --- OpenAI websearch tool integration ---
// TODO: Refactor to use Supabase Edge Function for OpenAI chat completions/websearch



async function openaiWebsearch(prompt: string): Promise<{text: string, citations: Citation[]}> {
  // Use Supabase Edge Function for OpenAI websearch
  const supabaseEdgeUrl = 'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/fetch-openai';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  try {
    const response = await fetch(supabaseEdgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        prompt: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a research assistant. Use web search to find and summarize information for the following prompt. Provide a concise summary and cite sources if possible.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.5,
          max_output_tokens: 600
        })
      })
    });
    const data = await response.json();
    const content = data.text || data.choices?.[0]?.message?.content;
    if (content) {
      // Try to parse citations if present in JSON
      let parsed;
      try { parsed = JSON.parse(content); } catch { parsed = {}; }
      return {
        text: parsed.summary || parsed.content || content,
        citations: Array.isArray(parsed.citations) ? parsed.citations : []
      };
    }
    return { text: '', citations: [] };
  } catch (e) {
    return { text: '', citations: [] };
  }
}

async function generateSubtasks(prompt: string): Promise<string[]> {
  // TODO: Replace with Supabase Edge Function call for OpenAI chat completions
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