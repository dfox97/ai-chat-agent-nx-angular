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

const AgentActionSchema = z.object({
  tool: z.string(),
  params: z.record(z.any()),
});

const AgentResponseSchema = z
  .object({
    thought: z.string(),
    action: AgentActionSchema.optional(),
    finalAnswer: z.string(),
  })
  .refine(
    (data) => {
      // If there's an action, finalAnswer should be null/undefined
      // If no action, finalAnswer must be a non-empty string
      return data.action
        ? !data.finalAnswer
        : typeof data.finalAnswer === 'string' && data.finalAnswer.length > 0;
    },
    {
      message:
        'Response must have either an action OR a non-empty finalAnswer, but not both',
    },
  );

type AgentResponse = z.infer<typeof AgentResponseSchema>;

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

      // Parse the JSON string from the content
      const parsed = JSON.parse(content) as unknown;
      const data = AgentResponseSchema.parse(parsed);
      console.log('Parsed agent response:', data);

      return data;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to parse JSON from response content');
      }
      throw new Error(`Failed to parse agent response: ${error}`);
    }
  }

  async process(query: string, maxIterations = 5): Promise<string> {
    let iterations = 0;
    let currentQuery = query;

    while (iterations < maxIterations) {
      const prompt = this.generatePrompt(currentQuery);
      const responseStr = await this.anthropicService.sendMessage(prompt);
      const response = this.parseResponse(responseStr);

      // If we have a final answer, return it
      if (!response.action) {
        return response.finalAnswer;
      }

      if (response.action) {
        const tool = this.tools.get(response.action.tool);
        if (!tool) {
          throw new Error(`Tool ${response.action.tool} not found`);
        }

        // Execute tool with proper typing
        const result: unknown = await tool.execute(response.action.params);
        const validatedResult: unknown = tool.resultSchema.parse(result);

        const resultStr =
          typeof validatedResult === 'string'
            ? validatedResult
            : JSON.stringify(validatedResult);

        currentQuery = `Previous action: ${response.action.tool}\nResult: ${resultStr}\nOriginal query: ${query}`;
      }

      iterations++;
    }

    throw new Error('Max iterations reached without final answer');
  }
}
