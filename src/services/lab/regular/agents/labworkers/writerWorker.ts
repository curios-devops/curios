import { Artifact, ArtifactStep } from '../../../../../commonApp/types/index';


const SUPABASE_EDGE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENAI_API_URL)
  ? import.meta.env.VITE_OPENAI_API_URL
  : 'VITE_OPENAI_API_URL';
const SUPABASE_ANON_KEY = typeof window === 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : import.meta.env.VITE_SUPABASE_ANON_KEY;

async function chatCompletion({ prompt, research, title }: { prompt: string; research: string; title?: string }): Promise<string> {
  try {
    const messages = [
      { role: 'system', content: 'You are a professional technical writer. Write clear, well-structured markdown content based on the user instruction and research background.' },
      { role: 'user', content: `Instruction: ${prompt}\n\nBackground/Research: ${research || 'No specific research data provided.'}` }
    ];
    const response = await fetch(SUPABASE_EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        prompt: JSON.stringify({
          model: 'gpt-4.1',
          messages,
          temperature: 0.7,
          max_output_tokens: 1200,
          response_format: { type: 'text' }
        })
      })
    });
    const data = await response.json();
    let content = data.text || data.content || data.output_text || data.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('Could not extract content from response:', data);
      content = `# ${title || 'Generated Content'}\n\n${research || 'No specific research data was available.'}`;
    }
    console.log('✅ WriterWorker: OpenAI response received, length:', content.length);
    return content;
  } catch (error) {
    console.error('❌ WriterWorker: OpenAI API error:', error);
    return `# ${title || prompt}\n\n${research || 'No research data available.'}\n\n*This is a fallback markdown document due to an OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}*`;
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
  const markdown = await chatCompletion({ prompt, research, title: artifact.title });

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