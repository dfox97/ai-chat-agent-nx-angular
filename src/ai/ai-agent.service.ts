/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { AnthropicChatService } from './anthropic-chat.service';
import { z } from 'zod';

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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AgentActionSchema = z.object({
  tool: z.string(),
  params: z.record(z.any()),
});

// Schema for the complete agent interaction
const AgentResponseSchema = z
  .object({
    // The AI's reasoning process
    thought: z.string().describe('AI reasoning about the action to take'),

    // Tool action (when tool is being requested)
    action: z
      .object({
        tool: z.string(),
        params: z.record(z.any()),
      })
      .optional(),

    // The final response to the user (required when no action, null when action present)
    finalAnswer: z.string().nullable(),
  })
  .refine(
    (data) => {
      return data.action
        ? data.finalAnswer === null
        : typeof data.finalAnswer === 'string';
    },
    {
      message:
        'Response must have either an action OR a finalAnswer, but not both',
    },
  );
// Types derived from the schemas
type AgentAction = z.infer<typeof AgentActionSchema>;
type AgentResponse = z.infer<typeof AgentResponseSchema>;

// Interface for tracking the complete interaction
interface AgentInteraction {
  thought: string;
  action?: AgentAction & {
    result?: unknown;
  };
  finalAnswer: string | null;
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

  private generatePrompt(userQuery: string): string {
    const toolDescriptions = Array.from(this.tools.entries())
      .map(([name, tool]) => {
        const paramsInfo =
          tool.paramsSchema.description || 'No parameter description available';
        return `${name}: ${tool.description}\nParameters: ${paramsInfo}`;
      })
      .join('\n\n');

    return `
      You are an AI assistant with access to the following tools:

      ${toolDescriptions}

      When a human asks a question that requires using a tool:
      1. First respond with your thought process and the tool action
      2. After getting the tool result, provide a final answer incorporating the result

      Response format when using a tool:
      {
        "thought": "your reasoning about what to do",
        "action": {
          "tool": "tool_name",
          "params": {
            // parameters should be passed as an object matching the tool's schema
            "parameterName": "parameterValue"
          }
        },
        "finalAnswer": null 
      }

      After getting the tool result, your next response should be:
      {
        "thought": "considering the tool result...",
        "finalAnswer": "complete response incorporating the tool result"
      }

      If you can answer directly without a tool:
      {
        "thought": "your reasoning",
        "finalAnswer": "your direct response"
      }

      Example flow:
      Human: "Translate 'Hello friend' to pirate speak"
      Assistant: {
        "thought": "I'll use the pirate_speak tool to translate this text",
        "action": {
          "tool": "pirate_speak",
          "params": {
            "text": "Hello friend"
          }
        },
        "finalAnswer": null
      }
      
      [After getting tool result]
      Assistant: {
        "thought": "I received the pirate translation",
        "finalAnswer": "Here's your text in pirate speak: 'Ahoy matey, arrr!'"
      }

      Human query: ${userQuery}
    `.trim();
  }

  private parseResponse(response: string): AgentResponse {
    try {
      // Parse the Anthropic API response
      const anthropicResponse = JSON.parse(response);
      console.log('Anthropic response:', anthropicResponse);

      // Extract the actual content from the message
      const content = anthropicResponse?.content?.[0]?.text;

      if (!content) {
        throw new Error('No content found in response');
      }

      try {
        // Try to parse as structured response
        const parsed = JSON.parse(content);
        return AgentResponseSchema.parse({
          thought: parsed.thought,
          action: parsed.action,
          finalAnswer: parsed.action ? null : parsed.finalAnswer,
        });
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        // Handle direct responses
        return {
          thought: 'Direct response',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          finalAnswer: content.trim(),
        };
      }
    } catch (error) {
      console.error('Response parsing error:', error);
      throw new Error(`Failed to parse agent response: ${error}`);
    }
  }

  async process(query: string, maxIterations = 5): Promise<AgentInteraction> {
    let iterations = 0;
    let currentQuery = query;
    const interactions: AgentInteraction[] = [];

    while (iterations < maxIterations) {
      const prompt = this.generatePrompt(currentQuery);
      const responseStr = await this.anthropicService.sendMessage(prompt);
      const response = this.parseResponse(responseStr);

      // Create interaction record
      const interaction: AgentInteraction = {
        thought: response.thought,
        action: response.action,
        finalAnswer: response.finalAnswer,
      };

      if (response.action) {
        const tool = this.tools.get(response.action.tool);
        if (!tool) {
          throw new Error(`Tool ${response.action.tool} not found`);
        }

        // Execute tool with proper typing
        // Execute tool with proper typing
        const result: unknown = await tool.execute(response.action.params);
        const validatedResult: unknown = tool.resultSchema.parse(result);

        // Store the result in the interaction
        interaction.action = {
          ...response.action,
          result: validatedResult,
        };
        const resultStr =
          typeof validatedResult === 'string'
            ? validatedResult
            : JSON.stringify(validatedResult);

        // Update query with tool result
        currentQuery = `Previous thought: ${response.thought}\nTool used: ${response.action.tool}\nResult: ${resultStr}\nOriginal query: ${query}`;
      }

      interactions.push(interaction);
      // If we have a final answer with no action, return the final interaction
      if (!response.action && response.finalAnswer) {
        return interaction;
      }
      iterations++;
    }

    throw new Error('Max iterations reached without final answer');
  }
}
