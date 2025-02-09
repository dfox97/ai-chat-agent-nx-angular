import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { generateAgentPrompt } from './agent-prompt';
import { AnthropicChatService, Message } from './anthropic-chat.service';

// Generic type for tool parameters and return values
export interface ToolDefinition<TParams = any, TResult = any> {
  name: string;
  description: string;
  paramsSchema: z.ZodType<TParams>;
  resultSchema: z.ZodType<TResult>;
  execute: (params: TParams) => Promise<TResult>;
}

// Interface for tool definition
interface Tool<TParams = any, TResult = any> {
  name: string;
  description: string;
  paramsSchema: z.ZodType<TParams>;
  resultSchema: z.ZodType<TResult>;
  execute: (params: TParams) => Promise<TResult>;
}

// Schema for tool execution details
const AgentActionSchema = z.object({
  tool: z.string(),
  params: z
    .record(z.any())
    .describe("Tool parameters matching the tool's schema"),
});

// Schema for the complete agent interaction
const AgentResponseSchema = z.object({
  thought: z.string().describe('Reasoning about the response or tool usage'),

  // Optional tool action if needed
  action: AgentActionSchema.nullable().describe(
    'Tool to use, or null if no tool needed',
  ),

  finalAnswer: z.string().describe('Complete response to the user'),
});
// Types derived from schemas
type AgentAction = z.infer<typeof AgentActionSchema>;
type AgentResponse = z.infer<typeof AgentResponseSchema>;

// Extended action type that includes the tool execution result
interface AgentInteraction extends AgentResponse {
  action: (AgentAction & { result?: unknown }) | null;
}

@Injectable()
export class AIAgentService {
  private tools: Map<string, Tool<unknown, unknown>> = new Map();

  constructor(private anthropicService: AnthropicChatService) { }

  registerTool<TParams, TResult>(
    toolDefinition: ToolDefinition<TParams, TResult>,
  ) {
    const tool: Tool<TParams, TResult> = {
      name: toolDefinition.name,
      description: toolDefinition.description,
      paramsSchema: toolDefinition.paramsSchema,
      resultSchema: toolDefinition.resultSchema,
      execute: async (params: TParams) => {
        const validatedParams = toolDefinition.paramsSchema.parse(params);
        const result = await toolDefinition.execute(validatedParams);
        return toolDefinition.resultSchema.parse(result);
      },
    };
    this.tools.set(tool.name, tool);
  }

  getTools(): Array<Tool<unknown, unknown>> {
    return Array.from(this.tools.values());
  }

  getConversationHistory(): Message[] {
    return this.anthropicService.getConversationHistory();
  }

  // when we make a chat service we should split this into using a system promp with a context.
  private generatePrompt(userQuery: string): string {
    const toolDescriptions = Array.from(this.tools.entries())
      .map(([name, tool]) => {
        const paramsInfo =
          tool.paramsSchema.description || 'No parameter description available';
        return `${name}: ${tool.description}\nParameters: ${paramsInfo}`;
      })
      .join('\n\n');

    return generateAgentPrompt(toolDescriptions, userQuery);
  }

  private parseResponse(response: string): AgentResponse {
    try {
      // Try to parse the response as JSON
      const parsed: AgentResponse = JSON.parse(response);

      // Validate against our schema
      return AgentResponseSchema.parse({
        thought: parsed.thought,
        action: parsed?.action ?? null,
        finalAnswer: parsed.finalAnswer.trim(),
      });
    } catch (error) {
      console.error('Response parsing error:', error);
      // If parsing fails, treat it as a direct response
      return {
        thought: 'Direct response',
        action: null,
        finalAnswer: response.trim(),
      };
    }
  }

  async process(query: string, maxIterations = 5): Promise<AgentInteraction> {
    let iterations = 0;
    let currentQuery = query;

    while (iterations < maxIterations) {
      const prompt = this.generatePrompt(currentQuery);
      const responseStr = await this.anthropicService.sendMessage(prompt);
      const response = this.parseResponse(responseStr);

      // If there's no action needed, return the final answer
      if (!response.action) {
        return response as AgentInteraction;
      }

      // If there is an action, execute it
      const tool = this.tools.get(response.action.tool);
      if (!tool) {
        throw new Error(`Tool ${response.action.tool} not found`);
      }

      // Execute tool with proper typing
      const result = await tool.execute(response.action.params);
      const validatedResult: unknown = tool.resultSchema.parse(result);

      // Store the result in the response
      const responseWithResult: AgentInteraction = {
        ...response,
        action: {
          ...response.action,
          result: validatedResult,
        },
      };

      // If this was the last action needed, return the response
      if (response.finalAnswer && response.finalAnswer !== '') {
        return responseWithResult;
      }

      // Otherwise, update query with tool result for next iteration
      const resultStr =
        typeof validatedResult === 'string'
          ? validatedResult
          : JSON.stringify(validatedResult);

      currentQuery = `Previous thought: ${response.thought}\nTool used: ${response.action.tool}\nResult: ${resultStr}\nOriginal query: ${query}`;
      iterations++;
    }

    throw new Error('Max iterations reached without final answer');
  }
}
