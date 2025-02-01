/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { ChatCompletionMessage, FunctionParameters } from 'openai/resources';
import { z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';

export type ChatMessage = ChatCompletionMessage;

export type OpenAIFunction = {
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
};

export interface BaseTool<T extends z.ZodObject<any>> {
  name: string;
  description: string;
  parameters: T;
  execute: (params: z.infer<T>) => Promise<any>;
}

export type OpenAITool = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
};

function toolSchema(tool: BaseTool<any>): FunctionParameters {
  if (tool.parameters instanceof z.ZodVoid) {
    return {
      type: 'object',
      properties: {},
      required: [],
    };
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const schema = zodToJsonSchema(tool.parameters, {
    target: 'openApi3',
  });

  // Remove $schema property to save tokens
  delete schema.$schema;

  return schema;
}

@Injectable()
export class AgentService {
  private tools: Map<string, BaseTool<any>> = new Map();

  registerTool<T extends z.ZodObject<any>>(tool: BaseTool<T>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name ${tool.name} already exists`);
    }
    this.tools.set(tool.name, tool);
  }

  getTools(): BaseTool<any>[] {
    return Array.from(this.tools.values());
  }

  getOpenAiTools(): OpenAITool[] {
    return this.getTools().map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: toolSchema(tool),
      },
    }));
  }

  async executeTool(name: string, params: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    const validatedParams = tool?.parameters.safeParse(params);
    if (!validatedParams.success) {
      throw new Error(`Invalid parameters: ${validatedParams.error.message}`);
    }

    return await tool.execute(validatedParams.data);
  }
}
