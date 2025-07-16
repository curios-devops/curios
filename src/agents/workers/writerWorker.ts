import { Artifact, ArtifactStep } from '../../types/artifact';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

async function openaiWriteMarkdown(prompt: string, research: string, title?: string): Promise<string> {
  console.log('🔍 WriterWorker: VITE_OPENAI_API_KEY available:', !!OPENAI_API_KEY);
  if (!OPENAI_API_KEY) {
    console.log('⚠️ WriterWorker: Using fallback - OpenAI API key not available');
    return `# ${title || prompt}\n\n${research || 'No research data available.'}\n\n*This is a fallback markdown document because OpenAI is not available.*`;
  }
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a gifted writer agent. Write a complete, well-structured, and beautifully formatted Markdown document that fulfills the user\'s intent (biography, essay, poem, etc.), using all appropriate Markdown features (headers, bold, italics, lists, references, etc.). The document should have a clear, relevant title (do not just repeat the user instruction as the title).' },
          { role: 'user', content: `Instruction: ${prompt}\n\nBackground/Research: ${research || 'No specific research data provided.'}` }
        ],
        temperature: 0.7,
        max_tokens: 1800,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log('✅ WriterWorker: OpenAI response received, length:', content.length);
    return content;
  } catch (error) {
    console.error('❌ WriterWorker: OpenAI API error:', error);
    return `# ${title || prompt}\n\n${research || 'No research data available.'}\n\n*This is a fallback markdown document due to an OpenAI API error.*`;
  }
}

export async function writerWorker(artifact: Artifact, prompt: string, updateArtifact: (partial: Artifact) => void): Promise<Artifact> {
  console.log('📝 WriterWorker: Starting with prompt:', prompt);
  console.log('📝 WriterWorker: Artifact steps:', artifact.steps.map(s => ({ name: s.name, status: s.status, hasResult: !!s.result })));
  
  // Add to thinkingLog with minimal Markdown formatting
  const thinkingLog = artifact.thinkingLog ? [...artifact.thinkingLog] : [];
  thinkingLog.push('---');
  thinkingLog.push('### 📝 **Writer Agent is starting a new writing task**');
  thinkingLog.push(`**Instruction:** _${prompt}_`);
  thinkingLog.push('');
  thinkingLog.push('**Writing...**');
  thinkingLog.push('');
  thinkingLog.push('---');

  updateArtifact({
    ...artifact,
    // Mark all steps as in_progress for writing, since step names may vary
    steps: artifact.steps.map((s, idx) =>
      idx === artifact.steps.findIndex(st => st.status === 'pending' || st.status === 'in_progress')
        ? { ...s, status: 'in_progress' as ArtifactStep['status'], agentName: 'Writer', agentStatus: 'is working', thinkingSince: Date.now() }
        : s
    ),
    thinkingLog,
  });

  // Use the result of the last completed step before writing as research/background
  const writingStepIdx = artifact.steps.findIndex(st => st.status === 'in_progress');
  let research = '';
  if (writingStepIdx > 0) {
    // Find the last completed step before the writing step
    for (let i = writingStepIdx - 1; i >= 0; i--) {
      if (artifact.steps[i].status === 'complete' && artifact.steps[i].result) {
        research = artifact.steps[i].result || '';
        break;
      }
    }
  }
  if (research) {
    console.log('📝 WriterWorker: Received research data from researcher. Length:', research.length);
  } else {
    console.log('📝 WriterWorker: No research data found.');
  }
  console.log('📝 WriterWorker: Starting writing process...');
  // Always use OpenAI LLM if available, fallback only if not
  const markdown = await openaiWriteMarkdown(prompt, research, artifact.title);

  thinkingLog.push('✔️ **Writing complete.**');
  console.log('📝 WriterWorker: Writing complete. Markdown length:', markdown.length);

  // Mark the current writing step as complete and set the content
  const updatedArtifact = {
    ...artifact,
    content: markdown,
    steps: artifact.steps.map((s, idx) =>
      idx === writingStepIdx
        ? { ...s, status: 'complete' as ArtifactStep['status'], result: markdown, agentStatus: undefined, thinkingSince: undefined }
        : s
    ),
    thinkingLog,
  };
  updateArtifact(updatedArtifact);
  return updatedArtifact;
} 