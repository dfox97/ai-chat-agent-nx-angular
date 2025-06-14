import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { generateAgentPrompt } from './agent-prompt';
import { LLMFactoryService } from './llms/llm-factory.service';
import {
  LLMService,
  LLMProvider,
  LLMConfig,
  Message,
} from './llms/types/types';

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
  private readonly logger = new Logger(AIAgentService.name);
  private tools: Map<string, Tool<unknown, unknown>> = new Map();
  private llmService: LLMService;

  constructor(
    private llmFactory: LLMFactoryService,
    provider: LLMProvider = LLMProvider.ANTHROPIC,
    config?: LLMConfig,
  ) {
    this.llmService = this.llmFactory.createLLMService(provider, config);
  }

  registerTool<TParams, TResult>(
    toolDefinition: ToolDefinition<TParams, TResult>,
  ) {
    const tool: Tool<TParams, TResult> = {
      name: toolDefinition.name,
      description: toolDefinition.description,
      paramsSchema: toolDefinition.paramsSchema,
      resultSchema: toolDefinition.resultSchema,
      execute: async (params: TParams) => {
        this.logger.debug(
          `Executing tool: ${toolDefinition.name} with params: ${JSON.stringify(params)}`,
        );
        const validatedParams = toolDefinition.paramsSchema.parse(params);
        const result = await toolDefinition.execute(validatedParams);
        const parsedResult = toolDefinition.resultSchema.parse(result);
        this.logger.debug(
          `Tool: ${toolDefinition.name} executed, result: ${JSON.stringify(parsedResult)}`,
        );
        return parsedResult;
      },
    };
    this.tools.set(tool.name, tool);
    this.logger.debug(`Tool registered: ${tool.name}`);
  }

  getTools(): Array<Tool<unknown, unknown>> {
    return Array.from(this.tools.values());
  }

  getConversationHistory(): Message[] {
    return this.llmService.getConversationHistory();
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
    const jsonStartIndex = response.indexOf('{');
    const jsonEndIndex = response.lastIndexOf('}');

    if (
      jsonStartIndex !== -1 &&
      jsonEndIndex !== -1 &&
      jsonEndIndex > jsonStartIndex
    ) {
      const jsonString = response.substring(jsonStartIndex, jsonEndIndex + 1);
      this.logger.debug(`Extracted JSON string: ${jsonString}`);

      try {
        // Try to parse the extracted JSON string
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parsed: AgentResponse = JSON.parse(jsonString);
        this.logger.debug(`Attempting to parse response: ${jsonString}`);

        // Validate against our schema
        const validatedResponse = AgentResponseSchema.parse({
          thought: parsed.thought,
          action: parsed?.action ?? null,
          finalAnswer: parsed.finalAnswer.trim(),
        });
        this.logger.debug(
          `Successfully parsed and validated response: ${JSON.stringify(validatedResponse)}`,
        );
        return validatedResponse;
      } catch (error) {
        this.logger.error(
          `Response parsing error for extracted JSON: ${error}`,
          error,
        );
        // If parsing extracted JSON fails, fall back to direct response with original full response
        return {
          thought: 'Direct response (JSON extraction failed)',
          action: null,
          finalAnswer: response.trim(),
        };
      }
    } else {
      this.logger.debug(
        'No valid JSON object found in the response. Treating as direct response.',
      );
      // If no JSON object is found, treat the entire response as a direct response
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
    this.logger.log(
      `Starting process for query: "${query}" with max iterations: ${maxIterations}`,
    );

    while (iterations < maxIterations) {
      this.logger.debug(`Iteration ${iterations + 1}/${maxIterations}`);
      const prompt = this.generatePrompt(currentQuery);
      const responseStr = await this.llmService.sendMessage(prompt);
      this.logger.debug(`LLM raw response: ${responseStr}`);
      const response = this.parseResponse(responseStr);

      // If there's no action needed, return the final answer
      if (!response.action) {
        this.logger.debug(
          `No action needed. Returning final answer: ${response.finalAnswer}`,
        );
        return response as AgentInteraction;
      }

      // If there is an action, execute it
      this.logger.debug(
        `Action identified: ${JSON.stringify(response.action)}`,
      );
      const tool = this.tools.get(response.action.tool);
      if (!tool) {
        this.logger.error(`Tool ${response.action.tool} not found`);
        throw new Error(`Tool ${response.action.tool} not found`);
      }

      // Execute tool with proper typing
      const result = await tool.execute(response.action.params);
      const validatedResult: unknown = tool.resultSchema.parse(result);
      this.logger.debug(
        `Tool "${response.action.tool}" executed. Raw result: ${JSON.stringify(result)}, Validated result: ${JSON.stringify(validatedResult)}`,
      );

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
        this.logger.debug(
          `Final answer found after tool execution: ${response.finalAnswer}`,
        );
        return responseWithResult;
      }

      // Otherwise, update query with tool result for next iteration
      const resultStr =
        typeof validatedResult === 'string'
          ? validatedResult
          : JSON.stringify(validatedResult);

      currentQuery = `Previous thought: ${response.thought}\nTool used: ${response.action.tool}\nResult: ${resultStr}\nOriginal query: ${query}`;
      this.logger.debug(
        `Updating current query for next iteration: ${currentQuery}`,
      );
      iterations++;
    }

    this.logger.error(
      `Max iterations (${maxIterations}) reached without final answer for query: "${query}"`,
    );
    throw new Error('Max iterations reached without final answer');
  }
}
