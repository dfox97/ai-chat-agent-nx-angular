import { Injectable, Logger } from '@nestjs/common';
import { AgentPromptService } from './ai-agent-prompt.service';
import { Tool, AgentInteraction } from './ai-agent-types';
import { LLMFactoryService } from './llms/llm-factory.service';
import { LLMResponseParser } from './llms/llm-response-parser.service';
import { LLMProvider } from './llms/types/base-response-types';
import { LLMBase, ApiMessage } from './llms/types/types';

@Injectable()
export class AIAgentService {
  private readonly logger = new Logger(AIAgentService.name);
  private tools: Map<string, Tool<unknown, unknown>> = new Map();
  private llmService: LLMBase;

  constructor(
    private llmFactory: LLMFactoryService,
    private llmParser: LLMResponseParser,
    private promptService: AgentPromptService,
    provider: LLMProvider = LLMProvider.ANTHROPIC,
  ) {
    this.llmService = this.llmFactory.createLLMService(provider);
  }

  registerTool<TParams, TResult>(toolDefinition: Tool<TParams, TResult>) {
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
    this.tools.set(tool.name, tool as any);
    this.logger.debug(`Tool registered: ${tool.name}`);
  }

  getTools(): Array<Tool<unknown, unknown>> {
    return Array.from(this.tools.values());
  }

  setConversationHistory(messages: ApiMessage[]): void {
    this.llmService.setConversationHistory(messages);
  }

  async process(query: string, maxIterations = 5): Promise<AgentInteraction> {
    let iterations = 0;
    let currentQuery = query;
    this.logger.log(
      `Starting process for query: "${query}" with max iterations: ${maxIterations}`,
    );

    while (iterations < maxIterations) {
      this.logger.debug(`Iteration ${iterations + 1}/${maxIterations}`);
      const prompt = this.promptService.generatePrompt(
        this.getTools(),
        currentQuery,
      );
      const responseStr = await this.llmService.sendMessage(prompt);
      this.logger.debug(`LLM raw response: ${responseStr}`);
      const response = this.llmParser.parseLLMResponse(responseStr);

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
