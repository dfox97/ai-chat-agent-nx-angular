import { z } from 'zod';

// Generic type for tool parameters and return values
export interface Tool<TParams, TResult> {
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

// Type for the action before execution (from LLM response)
type AgentAction = z.infer<typeof AgentActionSchema>;

// Schema for the complete agent interaction
export const AgentResponseSchema = z.object({
  thought: z.string().describe('Reasoning about the response or tool usage'),

  // Optional tool action if needed
  action: AgentActionSchema.nullable().describe(
    'Tool to use, or null if no tool needed',
  ),

  finalAnswer: z.string().describe('Complete response to the user'),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;

// Extended action type that includes the tool execution result
type AgentActionWithResult = AgentAction & { result: unknown };

// Extended agent response type that includes the tool execution result
export interface AgentInteraction extends Omit<AgentResponse, 'action'> {
  action: AgentActionWithResult | null;
}
