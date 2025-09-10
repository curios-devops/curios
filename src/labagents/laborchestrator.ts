import { Artifact } from '../types/artifact';
import { researchWorker } from './labworkers/labresearchWorker';
import { writerWorker } from './labworkers/labwriterWorker';
import { formatterWorker } from './labworkers/formatterWorker';
import { dalleWorker } from './labworkers/dalleWorker';
import { gameWorker } from './labworkers/gameWorker';
import { secureOpenAI } from '../services/secureOpenAI';

const IMAGE_TYPES = ['diagram', 'sketch', 'photo'];
const GAME_TYPES = ['arcade', 'retro', 'puzzles', 'rpg', 'flashcards'];

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

// Update openaiPlan to return array of { step, detail }
async function openaiPlan(userPrompt: string): Promise<{ step: string, detail: string }[]> {
  try {
    const response = await secureOpenAI.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert workflow planner for a multi-agent AI system. Given a user request, break it down into a list of clear, actionable subtasks for agents (e.g., researcher, writer, formatter). For each subtask, provide a short, context-aware detail/explanation. Respond only with a JSON array of objects: [{ step: string, detail: string }], where step is the main subtask and detail is a short explanation. The steps and details should be user-friendly, actionable, and in the same language as the user request.' },
        { role: 'user', content: `User request: ${userPrompt}` }
      ],
      temperature: 0.2,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });
    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed.plan)) return parsed.plan;
    }
  } catch (_e) {
    // Fallback below
  }
  // Fallback: generic plan with details
  return [
    { step: `Investigar información general sobre: ${userPrompt}`, detail: 'Buscar información actualizada en fuentes confiables y relevantes.' },
    { step: `Escribir el documento solicitado sobre: ${userPrompt}`, detail: 'Redactar el documento en formato Markdown, estructurando la información de manera clara y profesional.' },
    { step: `Entregar el resultado al usuario`, detail: 'Presentar el documento final al usuario para su revisión o descarga.' }
  ];
}

export async function orchestrateArtifact(
  userPrompt: string,
  updateArtifact: (partial: Partial<Artifact>) => void,
  type: string
) {
  let artifact: Artifact = {
    id: generateId(),
    title: '',
    type,
    content: '',
    status: 'in_progress',
    steps: [],
    thinkingLog: [`${userPrompt}`],
    planDetails: [], // new field for UI
  };
  updateArtifact(artifact);

  // Dynamic planning phase using OpenAI LLM
  const plan = await openaiPlan(userPrompt);
  const thinkingLog = artifact.thinkingLog ?? [];
  thinkingLog.push('**Planning:**');
  plan.forEach(({ step }) => {
    thinkingLog.push(`- ${step}`);
  });
  artifact.thinkingLog = thinkingLog;
  artifact.planDetails = plan;

  // Use the plan to generate the steps array so Planning and Task Progress always match
  artifact.steps = plan.map(({ step }, idx) => ({
    name: step,
    status: idx === 0 ? 'in_progress' : 'pending',
    result: '',
    citations: [],
    agentName: undefined,
    agentStatus: undefined,
    thinkingSince: undefined,
  }));
  updateArtifact({ ...artifact });

  // Pass plan to researchWorker and writerWorker as needed
  artifact = await researchWorker(artifact, userPrompt, (partial: Partial<typeof artifact>) => {
    if (partial.thinkingLog) {
      artifact.thinkingLog = partial.thinkingLog;
    }
    updateArtifact({ ...artifact, ...partial, thinkingLog: artifact.thinkingLog });
  });

  if (IMAGE_TYPES.includes(type)) {
    artifact = await dalleWorker(artifact, userPrompt, updateArtifact);
  } else if (GAME_TYPES.includes(type)) {
    artifact = await gameWorker(artifact, userPrompt, updateArtifact);
  } else {
    artifact = await writerWorker(artifact, userPrompt, (partial: Partial<typeof artifact>) => {
      if (partial.thinkingLog) {
        artifact.thinkingLog = partial.thinkingLog;
      }
      updateArtifact({ ...artifact, ...partial, thinkingLog: artifact.thinkingLog });
    });
    artifact = await formatterWorker(artifact, userPrompt, updateArtifact);
  }

  // Always append a final delivery step if not already present
  const deliverStepName = `Deliver the ${type === 'doc' ? 'document' : type === 'biography' ? 'biography' : type} to the user`;
  if (!artifact.steps.some((s: { name: string }) => s.name === deliverStepName)) {
    const deliverStep = {
      name: deliverStepName,
      status: 'in_progress' as const,
      agentName: undefined,
      agentStatus: undefined,
      thinkingSince: Date.now(),
    };
    artifact.steps = [
      ...artifact.steps,
      deliverStep
    ];
  }
  (artifact.thinkingLog ?? []).push(`Here is your ${type === 'doc' ? 'document' : type === 'biography' ? 'biography' : type}.`);
  updateArtifact({ ...artifact });
  // Mark delivery as complete
  artifact.steps = artifact.steps.map((s: { status: string; agentStatus?: string; thinkingSince?: number }, i: number) =>
    i === artifact.steps.length - 1
      ? { ...s, status: 'complete', agentStatus: undefined, thinkingSince: undefined }
      : s
  );
  artifact.status = 'complete';
  updateArtifact(artifact);
  return artifact;
}