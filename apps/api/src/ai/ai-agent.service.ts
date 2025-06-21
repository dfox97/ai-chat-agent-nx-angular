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
  private tools: Map<string, Tool<any, any>> = new Map(); // Using 'any' due to current map limitations with generics
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
    this.tools.set(tool.name, tool);
    this.logger.debug(`Tool registered: ${tool.name}`);
  }

  getTools(): Array<Tool<any, any>> {
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
      const { response, nextQuery, isComplete } = await this.executeAgentStep(
        currentQuery,
        query,
      );

      if (isComplete || !nextQuery) {
        return response;
      }

      currentQuery = nextQuery;
      iterations++;
    }

    this.logger.error(
      `Max iterations (${maxIterations}) reached without final answer for query: "${query}"`,
    );
    throw new Error('Max iterations reached without final answer');
  }

  private async executeAgentStep(
    currentQuery: string,
    originalQuery: string,
  ): Promise<{
    response: AgentInteraction;
    nextQuery: string | null;
    isComplete: boolean;
  }> {
    this.logger.debug(`Generating prompt for query: ${currentQuery}`);
    const prompt = this.promptService.generatePrompt(
      this.getTools(),
      currentQuery,
    );
    const responseStr = await this.llmService.sendMessage(prompt);
    this.logger.debug(`LLM raw response: ${responseStr}`);
    const response = this.llmParser.parseLLMResponse(responseStr);

    if (!response.action) {
      this.logger.debug(
        `No action needed. Returning final answer: ${response.finalAnswer}`,
      );
      return {
        response: { ...response, action: null } satisfies AgentInteraction,
        nextQuery: null,
        isComplete: true,
      };
    }

    this.logger.debug(
      `Action identified: ${JSON.stringify(response.action)}`,
    );
    const tool = this.tools.get(response.action.tool);
    if (!tool) {
      this.logger.error(`Tool ${response.action.tool} not found`);
      throw new Error(`Tool ${response.action.tool} not found`);
    }

    const result = await tool.execute(response.action.params);
    const validatedResult: unknown = tool.resultSchema.parse(result);
    this.logger.debug(
      `Tool "${response.action.tool}" executed. Raw result: ${JSON.stringify(result)}, Validated result: ${JSON.stringify(validatedResult)}`,
    );

    const responseWithResult: AgentInteraction = {
      ...response,
      action: {
        ...response.action,
        result: validatedResult,
      },
    };

    if (response.finalAnswer && response.finalAnswer !== '') {
      this.logger.debug(
        `Final answer found after tool execution: ${response.finalAnswer}`,
      );
      return { response: responseWithResult, nextQuery: null, isComplete: true };
    }

    const resultStr =
      typeof validatedResult === 'string'
        ? validatedResult
        : JSON.stringify(validatedResult);

    const nextQuery = `Previous thought: ${response.thought}\nTool used: ${response.action.tool}\nResult: ${resultStr}\nOriginal query: ${originalQuery}`;
    this.logger.debug(`Updating current query for next iteration: ${nextQuery}`);

    return { response: responseWithResult, nextQuery, isComplete: false };
  }
}
