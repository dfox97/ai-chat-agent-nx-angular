import { Injectable, inject, signal, linkedSignal, computed } from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { LocalStorageService } from "../../services/localstorage.service";
import { ChatService } from "./chat.service";
import { ChatMessage } from "@gpt-copilot/shared";

@Injectable({
  providedIn: 'root',
})
export class ChatStoreService {
  private readonly localStorageService = inject(LocalStorageService);
  private readonly chatService = inject(ChatService);

  readonly #convoId = signal(this.localStorageService.getItem('conversationId'));

  readonly #convoHistoryRef = rxResource({
    params: () => this.#convoId(),
    stream: ({ params: id }) => {
      return this.chatService.loadChatHistory(id);
    }
  });

  public readonly messages = linkedSignal(() => this.#convoHistoryRef.value() || []);
  public readonly isFirstMessage = computed(() => !this.messages().length);

  public reloadConversationHistory() {
    this.#convoHistoryRef.reload();
  }

  public async sendMessage(content: string): Promise<void> {
    const userMessage: ChatMessage = {
      content: content,
      role: 'user',
      timestamp: new Date(),
    };

    // Add user message immediately
    this.messages.update((val) => [...val, userMessage]);

    const assistantThinkingMessage: ChatMessage = {
      content: 'thinking...',
      timestamp: new Date(), // Use a new timestamp for the thinking message
      role: 'assistant',
    };

    // Add thinking message
    this.messages.update((val) => [...val, assistantThinkingMessage]);

    try {
      const response = await this.chatService.sendMessage(content, this.#convoId());

      const updatedAssistantMessage: ChatMessage = {
        ...assistantThinkingMessage,
        content: response.response.finalAnswer || 'No response received'
      };

      this.updateMessageInStore(updatedAssistantMessage);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorAssistantMessage: ChatMessage = {
        ...assistantThinkingMessage,
        content: 'Error: Failed to get response'
      };
      this.updateMessageInStore(errorAssistantMessage);
    }
  }

  async clearCurrentConversation() {
    const currentConvoId = this.#convoId();
    if (!currentConvoId) return;

    await this.chatService.clearConversationHistory(currentConvoId);
    this.#convoHistoryRef.reload();
  }

  private updateMessageInStore(updatedMessage: ChatMessage) {
    this.messages.update((msgs) => msgs.map(msg =>
      msg.timestamp === updatedMessage.timestamp && msg.role === 'assistant'
        ? updatedMessage
        : msg
    ));
  }
}





