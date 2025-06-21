import z from "zod";

export interface ChatMessage {
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  response: AgentResponse;
  metadata: ChatMetadata;
}


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
export type AgentResponse = z.infer<typeof AgentResponseSchema>;

export interface ChatMetadata {
  timestamp: string;
  model: string;
  query: string;
  conversationId: string;
}

export interface ChatResponse {
  response: AgentResponse;
  metadata: ChatMetadata;
}
