import { Artifact, ArtifactStep } from '../../types/artifact';
import { getOpenAIClient } from '../../services/openai/client';

async function openaiWriteMarkdown(prompt: string, research: string, title?: string): Promise<string> {
  console.log('🔍 WriterWorker: Initializing OpenAI client');
  
  try {
    const openai = getOpenAIClient();
    
    const response = await openai.responses.create({
      model: 'gpt-4.1',
      input: `Instruction: ${prompt}\n\nBackground/Research: ${research || 'No specific research data provided.'}`,
      text: {
        format: {
          type: 'text'
        }
      },
      reasoning: {
        effort: 'high'
      },
      temperature: 0.7
    });
    
    // Extract content from the new response format
    let content = '';
    if (response.output && response.output[0]) {
      const output = response.output[0];
      if ('content' in output && Array.isArray(output.content)) {
        // New format with content array
        content = output.content
          .filter((item: any) => item.type === 'output_text' && item.text)
          .map((item: any) => item.text)
          .join('\n\n');
      } else if ('text' in output && typeof output.text === 'string') {
        // Fallback to direct text access
        content = output.text;
      }
    }
    
    // Fallback if no content was extracted
    if (!content) {
      console.warn('Could not extract content from response:', response);
      content = `# ${title || 'Generated Content'}\n\n${research || 'No specific research data was available.'}`;
    }
    console.log('✅ WriterWorker: OpenAI response received, length:', content.length);
    return content;
    
  } catch (error) {
    console.error('❌ WriterWorker: OpenAI API error:', error);
    // Fallback content in case of error
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