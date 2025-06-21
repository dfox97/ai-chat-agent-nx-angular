import { inject, Injectable } from "@angular/core";
import { EMPTY, firstValueFrom, map, Observable } from "rxjs";
import { ChatMessage, ChatResponse } from "@gpt-copilot/shared";
import { CopilotBackendService } from "../../services/copilot-backend.service";


@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly chatAPIService = inject(CopilotBackendService);


  public loadChatHistory(convoId: string | null): Observable<ChatMessage[]> {
    if (!convoId) return EMPTY;

    return this.chatAPIService.getConversationHistory(convoId).pipe(
      map((data) =>
        data.map((msg) => {
          return {
            ...msg,
            content: (msg.role === 'assistant') ? JSON.parse(msg.content).finalAnswer : msg.content,
          };
        })
      )
    )
  }

  public clearConversationHistory(convoId: string): Promise<{ message: string }> {
    return firstValueFrom(this.chatAPIService.clearConversationHistory(convoId));
  }


  public sendMessage(message: string, convoId: string | null): Promise<ChatResponse> {
    return firstValueFrom(this.chatAPIService.sendMessage(message, convoId));
  }
}






