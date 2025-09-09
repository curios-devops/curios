# Swarm Architecture Implementation Guide for CuriosAI

## Overview

This guide documents the implementation of a Swarm-inspired multi-agent architecture in CuriosAI, based on OpenAI's Swarm framework principles but adapted to our existing BaseAgent system and TypeScript environment.

## Swarm Principles in CuriosAI

### Core Concepts
1. **Lightweight Agents**: Simple, focused agents with specific responsibilities
2. **Function-based Handoffs**: Agents can transfer control to other agents
3. **Context Variables**: Shared state across agent interactions
4. **Stateless Design**: Each agent call is independent
5. **Ergonomic Interface**: Easy to understand and maintain

## Current Working Agent Architecture

### BaseAgent Foundation
All agents extend `BaseAgent` which provides:
- OpenAI API integration via `secureOpenAI`
- Rate limiting and error handling
- Standardized response format
- Fallback mechanisms

```typescript
export abstract class BaseAgent implements Agent {
  protected openai: typeof secureOpenAI | null = null;
  protected async safeOpenAICall<T>(operation: () => Promise<T>, fallback: T): Promise<T>
  protected async handleError(error: unknown): Promise<AgentResponse>
  protected getFallbackData(): any
  abstract execute(...args: any[]): Promise<AgentResponse>
}
```

## Swarm-Style Agent Patterns

### 1. Simple Agent (Template)
```typescript
export class SimpleAgent extends BaseAgent {
  constructor() {
    super('Agent Name', 'Agent purpose and instructions');
  }

  async execute(input: string): Promise<AgentResponse> {
    try {
      if (!this.openai) {
        return { success: true, data: this.getFallbackData() };
      }

      return await this.safeOpenAICall(
        async () => {
          const completion = await this.openai!.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'System prompt' },
              { role: 'user', content: input }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 1200
          });

          const content = completion.choices[0]?.message?.content;
          if (!content) throw new Error('No content generated');
          
          return { success: true, data: JSON.parse(content) };
        },
        this.getFallbackData()
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}
```

### 2. Agent with Handoffs
```typescript
export class TriageAgent extends BaseAgent {
  constructor(
    private searchAgent: SearchAgent,
    private researchAgent: ResearchAgent
  ) {
    super('Triage Agent', 'Routes queries to appropriate specialized agents');
  }

  async execute(query: string): Promise<AgentResponse> {
    // Determine which agent to hand off to
    const classification = await this.classifyQuery(query);
    
    if (classification.type === 'search') {
      return this.handoffToAgent(this.searchAgent, query);
    } else {
      return this.handoffToAgent(this.researchAgent, query);
    }
  }

  private async handoffToAgent(agent: BaseAgent, query: string): Promise<AgentResponse> {
    try {
      return await agent.execute(query);
    } catch (error) {
      return this.handleError(error);
    }
  }
}
```

### 3. Context-Aware Agent
```typescript
interface AgentContext {
  userId?: string;
  sessionId?: string;
  focusMode?: string;
  previousResults?: any[];
}

export class ContextualAgent extends BaseAgent {
  async execute(input: string, context: AgentContext = {}): Promise<AgentResponse> {
    const enhancedPrompt = this.buildContextualPrompt(input, context);
    
    return await this.safeOpenAICall(
      async () => {
        const completion = await this.openai!.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: enhancedPrompt.system },
            { role: 'user', content: enhancedPrompt.user }
          ]
        });
        
        return { 
          success: true, 
          data: JSON.parse(completion.choices[0]?.message?.content || '{}'),
          context: { ...context, lastAgent: this.name }
        };
      },
      this.getFallbackData()
    );
  }
}
```

## Current Working Agents Analysis

### ✅ Working Agents (Follow Swarm Principles)

#### 1. Research WriterAgent (`/src/services/research/writerAgent.ts`)
- **Role**: Synthesizes research data into comprehensive reports
- **Handoff**: Receives data from SearchAgent and PlannerAgent
- **Context**: Uses search results and query context

#### 2. PlannerAgent (`/src/services/research/plannerAgent.ts`)
- **Role**: Creates structured research plans
- **Handoff**: Passes plans to SearchAgent
- **Context**: Query analysis and focus mode

#### 3. InsightsWorkflow (`/src/services/agents/insightsWorkflow.ts`)
- **Role**: Multi-agent journalistic research
- **Handoff**: Coordinates between Planner → Search → Writer
- **Context**: Focus mode and progressive research

#### 4. ResearcherWorkflow (`/src/services/agents/researcherWorkflow.ts`)
- **Role**: Advanced SEARCH-R1 framework
- **Handoff**: Complex multi-agent coordination
- **Context**: Research phases and agent results

## Swarm Implementation Patterns

### Agent Coordination
```typescript
class SwarmOrchestrator {
  private agents: Map<string, BaseAgent> = new Map();

  registerAgent(name: string, agent: BaseAgent) {
    this.agents.set(name, agent);
  }

  async executeWorkflow(query: string, workflow: string[]): Promise<AgentResponse> {
    let context = { query, results: [] };
    
    for (const agentName of workflow) {
      const agent = this.agents.get(agentName);
      if (!agent) continue;
      
      const result = await agent.execute(context.query, context);
      context.results.push(result);
      
      // Check for handoffs
      if (result.handoff) {
        const nextAgent = this.agents.get(result.handoff.agent);
        if (nextAgent) {
          return nextAgent.execute(result.handoff.input, context);
        }
      }
    }
    
    return { success: true, data: context.results };
  }
}
```

### Function-Based Tools
```typescript
export class ToolEnabledAgent extends BaseAgent {
  private tools = [
    {
      name: 'transferToSearchAgent',
      description: 'Transfer to search specialist',
      fn: () => ({ handoff: { agent: 'SearchAgent', input: this.currentInput } })
    },
    {
      name: 'transferToResearchAgent', 
      description: 'Transfer to research specialist',
      fn: () => ({ handoff: { agent: 'ResearchAgent', input: this.currentInput } })
    }
  ];

  async execute(input: string): Promise<AgentResponse> {
    return await this.safeOpenAICall(
      async () => {
        const completion = await this.openai!.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You can transfer tasks to other agents using the provided tools.' },
            { role: 'user', content: input }
          ],
          tools: this.tools.map(tool => ({
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description
            }
          }))
        });

        // Handle tool calls for handoffs
        const toolCalls = completion.choices[0]?.message?.tool_calls;
        if (toolCalls) {
          for (const toolCall of toolCalls) {
            const tool = this.tools.find(t => t.name === toolCall.function.name);
            if (tool) {
              return tool.fn();
            }
          }
        }

        return { success: true, data: completion.choices[0]?.message?.content };
      },
      this.getFallbackData()
    );
  }
}
```

## Migration Strategy

### Phase 1: WriterAgent Optimization (Current Focus)
1. ✅ Fix TypeScript compilation errors
2. ✅ Optimize for performance (reduced tokens, content limits)
3. ✅ Maintain BaseAgent compatibility
4. ✅ Test timeout resolution

### Phase 2: Swarm Pattern Implementation
1. Add handoff capabilities to BaseAgent
2. Implement context passing
3. Create orchestrator for multi-agent workflows
4. Add tool-based transfers

### Phase 3: Progressive Agent Updates
1. Update other problematic agents (ProSearch, Labs)
2. Implement streaming responses
3. Add agent-to-agent communication
4. Optimize performance across all flows

## Best Practices

### Agent Design
- **Single Responsibility**: Each agent has one clear purpose
- **Lightweight**: Minimal setup and dependencies
- **Stateless**: No persistent state between calls
- **Composable**: Easy to combine with other agents

### Error Handling
- Always provide fallback data
- Use `safeOpenAICall` wrapper for all OpenAI interactions
- Log errors but don't expose to users
- Graceful degradation when agents fail

### Performance Optimization
- Limit token usage (max 1200 tokens for responses)
- Reduce content length (max 300 chars per source)
- Use efficient models (gpt-4o-mini)
- Implement proper rate limiting

### Context Management
- Pass relevant context between agents
- Avoid duplicating work across agents
- Maintain session state when needed
- Clear context after workflows complete

## Current Status

### ✅ Working (Swarm-Compatible)
- Research WriterAgent
- PlannerAgent  
- InsightsWorkflow
- ResearcherWorkflow
- UIAgent
- RetrieverAgent

### 🔧 Needs Update (Problematic)
- WriterAgent (Search flow) - **Current Priority**
- ProSearch agents
- Labs workflow agents

### 🎯 Goals
1. **Immediate**: Fix WriterAgent timeout issues
2. **Short-term**: Implement basic handoff patterns
3. **Long-term**: Full Swarm architecture with streaming and tools

This architecture provides a solid foundation for building Swarm-like multi-agent systems while maintaining compatibility with our existing BaseAgent infrastructure and TypeScript environment.
