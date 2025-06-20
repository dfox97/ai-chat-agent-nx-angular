import { Injectable } from "@nestjs/common";
import { generateAgentPrompt } from "./agent-prompt";
import { Tool } from "./ai-agent-types";

@Injectable()
export class AgentPromptService {
  /**
   * Generates a conversational prompt for the AI agent, including tool descriptions.
   * @param tools An array of registered tools.
   * @param userQuery The current user query or follow-up instruction.
   * @returns The complete prompt string for the LLM.
   */
  generatePrompt(
    tools: Array<Tool<unknown, unknown>>,
    userQuery: string,
  ): string {
    const toolDescriptions = tools
      .map((tool) => {
        const paramsInfo =
          tool.paramsSchema.description || 'No parameter description available';
        return `${tool.name}: ${tool.description}\nParameters: ${paramsInfo}`;
      })
      .join('\n\n');

    return generateAgentPrompt(toolDescriptions, userQuery);
  }
}
