import type { Artifact, ArtifactStep } from '../../../../commonApp/types/index.ts';
import { logger } from '../../../../utils/logger.ts';
import { ServiceHealthMonitor } from '../../../../commonService/utils/serviceHealth.ts';
import { LabPlannerAgent } from './plannerAgent.ts';
import { LabResearcherAgent } from './researcherAgent.ts';
import { LabWriterAgent } from './writerAgent.ts';
import { LabFormatterAgent } from './formatterAgent.ts';

const IMAGE_TYPES = ['diagram', 'sketch', 'photo'];
const GAME_TYPES = ['arcade', 'retro', 'puzzles', 'rpg', 'flashcards'];

export class LabController {
  private plannerAgent: LabPlannerAgent;
  private researcherAgent: LabResearcherAgent;
  private writerAgent: LabWriterAgent;
  private formatterAgent: LabFormatterAgent;
  private healthMonitor: ServiceHealthMonitor;

  constructor() {
    this.plannerAgent = new LabPlannerAgent();
    this.researcherAgent = new LabResearcherAgent();
    this.writerAgent = new LabWriterAgent();
    this.formatterAgent = new LabFormatterAgent();
    this.healthMonitor = ServiceHealthMonitor.getInstance();
  }

  async processPrompt(
    prompt: string,
    type: string,
    onStatusUpdate?: (status: string) => void,
    onArtifactUpdate?: (partial: Partial<Artifact>) => void,
    isPro: boolean = true // Studio is always Pro
  ): Promise<Artifact> {
    try {
      // Validate the prompt
      if (!prompt?.trim()) {
        throw new Error('Artifact prompt cannot be empty');
      }
      
      logger.info('Starting artifact generation', { prompt, type, isPro });

      // Initialize artifact
      const artifact: Artifact = {
        id: Math.random().toString(36).substring(2, 10),
        title: prompt.slice(0, 50),
        type,
        content: '',
        status: 'pending',
        steps: [],
        thinkingLog: [prompt],
        planDetails: []
      };

      onArtifactUpdate?.(artifact);

      // Step 1: Planning
      onStatusUpdate?.('Creating execution plan...');
      logger.info('LabController: Starting PlannerAgent execution');
      
      const planResponse = await this.executeWithHealthCheck(
        () => this.plannerAgent.execute(prompt, type),
        'PlannerAgent'
      );

      if (planResponse.success && planResponse.data?.planDetails) {
        artifact.planDetails = planResponse.data.planDetails;
        artifact.steps = planResponse.data.planDetails.map((plan: { step: string }, idx: number) => ({
          name: plan.step,
          status: idx === 0 ? 'in_progress' : 'pending',
          result: '',
          citations: [],
          agentName: undefined,
          agentStatus: undefined,
          thinkingSince: undefined,
        }));
        
        const thinkingLog = artifact.thinkingLog ? [...artifact.thinkingLog] : [];
        thinkingLog.push('**Planning:**');
        if (artifact.planDetails) {
          artifact.planDetails.forEach(({ step }: { step: string }) => {
            thinkingLog.push(`- ${step}`);
          });
        }
        artifact.thinkingLog = thinkingLog;
        
        onArtifactUpdate?.(artifact);
      }

      // Step 2: Research (if needed)
      if (!IMAGE_TYPES.includes(type) && !GAME_TYPES.includes(type)) {
        onStatusUpdate?.('Gathering relevant information...');
        logger.info('LabController: Starting ResearcherAgent execution');
        
        const researchResponse = await this.executeWithHealthCheck(
          () => this.researcherAgent.execute(prompt, type),
          'ResearcherAgent'
        );

        if (researchResponse.success && researchResponse.data?.content) {
          // Update the current step
          artifact.steps = artifact.steps.map((step: ArtifactStep, idx: number) => {
            if (step.status === 'in_progress') {
              return {
                ...step,
                status: 'complete' as const,
                result: (researchResponse.data && researchResponse.data.content) || '',
                agentName: 'Researcher',
                agentStatus: undefined,
                thinkingSince: undefined
              };
            }
            if (idx === artifact.steps.findIndex((s: ArtifactStep) => s.status === 'pending')) {
              return { ...step, status: 'in_progress' as const };
            }
            return step;
          });
          
          const thinkingLog = artifact.thinkingLog ? [...artifact.thinkingLog] : [];
          thinkingLog.push('✔️ **Research complete.**');
          artifact.thinkingLog = thinkingLog;
          
          onArtifactUpdate?.(artifact);
        }
      }

      // Step 3: Content Generation
      onStatusUpdate?.('Creating your content...');
      logger.info('LabController: Starting WriterAgent execution');
      
      const writerResponse = await this.executeWithHealthCheck(
        () => this.writerAgent.execute(prompt, type, artifact),
        'WriterAgent'
      );

      if (writerResponse.success && writerResponse.data?.content) {
        artifact.content = writerResponse.data.content;
        
        // Update the current step
        artifact.steps = artifact.steps.map((step: ArtifactStep, idx: number) => {
          if (step.status === 'in_progress') {
            return {
              ...step,
              status: 'complete' as const,
              result: (writerResponse.data && writerResponse.data.content) || '',
              agentName: 'Writer',
              agentStatus: undefined,
              thinkingSince: undefined
            };
          }
          if (idx === artifact.steps.findIndex((s: ArtifactStep) => s.status === 'pending')) {
            return { ...step, status: 'in_progress' as const };
          }
          return step;
        });
        
        const thinkingLog = artifact.thinkingLog ? [...artifact.thinkingLog] : [];
        thinkingLog.push('✔️ **Content generation complete.**');
        artifact.thinkingLog = thinkingLog;
        
        onArtifactUpdate?.(artifact);
      }

      // Step 4: Formatting (if needed)
      if (!IMAGE_TYPES.includes(type) && !GAME_TYPES.includes(type)) {
        onStatusUpdate?.('Finalizing format...');
        logger.info('LabController: Starting FormatterAgent execution');
        
        const formatterResponse = await this.executeWithHealthCheck(
          () => this.formatterAgent.execute(artifact),
          'FormatterAgent'
        );

        if (formatterResponse.success && formatterResponse.data?.content) {
          artifact.content = formatterResponse.data.content;
        }
      }

      // Final delivery step
      onStatusUpdate?.('Delivering your artifact...');
      const deliverStepName = `Deliver the ${type === 'doc' ? 'document' : type === 'biography' ? 'biography' : type} to the user`;
      
      if (!artifact.steps.some((s: ArtifactStep) => s.name === deliverStepName)) {
        artifact.steps.push({
          name: deliverStepName,
          status: 'in_progress' as const,
          result: '',
          citations: [],
          agentName: undefined,
          agentStatus: undefined,
          thinkingSince: Date.now(),
        });
      }

      // Mark all remaining steps as complete
      artifact.steps = artifact.steps.map((step: ArtifactStep, _idx: number) => {
        if (step.status === 'in_progress' || step.status === 'pending') {
          return {
            ...step,
            status: 'complete' as const,
            agentStatus: undefined,
            thinkingSince: undefined
          };
        }
        return step;
      });

      const thinkingLog = artifact.thinkingLog ? [...artifact.thinkingLog] : [];
      thinkingLog.push(`Here is your ${type === 'doc' ? 'document' : type === 'biography' ? 'biography' : type}.`);
      artifact.thinkingLog = thinkingLog;
      artifact.status = 'complete';
      
      onArtifactUpdate?.(artifact);

      logger.info('Artifact generation completed', {
        hasContent: !!artifact.content,
        stepsCount: artifact.steps.length,
        contentLength: artifact.content?.length || 0
      });

      return artifact;
    } catch (error) {
      logger.error('Artifact generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        prompt
      });
      
      return {
        id: this.generateId(),
        title: prompt.slice(0, 50),
        type,
        content: 'We apologize, but we could not generate your artifact at this time. Please try again in a moment.',
        status: 'error',
        steps: [],
        thinkingLog: ['Generation failed. Please try again.'],
        planDetails: []
      };
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  private async executeWithHealthCheck<T>(
    operation: () => Promise<T>,
    serviceName: string
  ): Promise<T> {
    try {
      if (!this.healthMonitor.isHealthy(serviceName)) {
        throw new Error(`Service ${serviceName} is currently unavailable`);
      }
      const result = await operation();
      this.healthMonitor.reportSuccess(serviceName);
      return result;
    } catch (error) {
      this.healthMonitor.reportFailure(serviceName);
      throw error;
    }
  }
}