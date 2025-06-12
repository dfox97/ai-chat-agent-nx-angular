import { inject, Injectable } from "@angular/core";
import { CopilotBackendService } from "../../services/copilot-backend.service";
import { EMPTY, firstValueFrom, map, Observable } from "rxjs";
import z from "zod";

export interface ChatMessageI {
  content: string;
  timestamp: Date;
  role: 'user' | 'assistant';
}
// make common file
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

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly chatAPIService = inject(CopilotBackendService);


  public loadChatHistory(convoId: string | null): Observable<ChatMessageI[]> {
    console.log('logging conversation ID:', convoId);
    if (!convoId) return EMPTY;
    return this.chatAPIService.getConversationHistory(convoId).pipe(
      map((data) =>
        data.map((msg) => {
          const parsed = JSON.parse(msg.content);
          return {
            ...msg,
            content: parsed.finalAnswer || 'No content',
          };
        })
      )
    )
  }


  public sendMessage(message: string): Promise<ChatResponse> {
    return firstValueFrom(this.chatAPIService.sendMessage(message));
  }




}






