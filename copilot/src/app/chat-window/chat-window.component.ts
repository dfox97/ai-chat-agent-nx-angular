import { CommonModule } from '@angular/common';
import { Component, inject, effect, signal, resource, linkedSignal, ResourceRef, computed } from '@angular/core';
import { ChatInputComponent } from '../chat-input/chat-input.component';
import { ChatResponse, CopilotBackendService } from '../../services/copilot-backend.service';
import { rxResource } from '@angular/core/rxjs-interop';


interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, ChatInputComponent],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.scss',
})
export class ChatWindowComponent {
  readonly messageInputQuery = signal<string>('');
  readonly conversationId = signal<string | undefined>(undefined);


  private readonly chatService = inject(CopilotBackendService);

  public readonly usersMessageDto = computed(() => {
    return {
      id: crypto.randomUUID(),
      content: this.messageInputQuery(),
      role: 'user',
      timestamp: new Date()
    }
  });

  // look at this https://github.com/alenkvakic/angular-chatgpt/blob/main/src/app/app.component.ts
  readonly aiResponse: ResourceRef<ChatResponse | undefined> = rxResource({
    request: () => ({
      message: this.messageInputQuery(),
      conversationId: this.conversationId(),
    }),
    loader: ({ request }) => this.chatService.sendMessage(request.message, request.conversationId),
  });


  messageHistory = linkedSignal({
    source: () => this.aiResponse.value(),
    computation: (value) => [value],
  });


  messages: ChatMessage[] = [];
  isFirstMessage = true;

  handleNewMessage(message: string) {
    this.isFirstMessage = false;
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      content: message,
      role: 'user',
      timestamp: new Date()
    };
    this.messages = [...this.messages, newMessage];
  }
}
