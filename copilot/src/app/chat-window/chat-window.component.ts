import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ChatInputComponent } from '../chat-input/chat-input.component';
import { CopilotBackendService } from '../../services/copilot-backend.service';
import { firstValueFrom } from 'rxjs';


interface ChatMessage {
  content: string;
  timestamp: string;
  role: 'user' | 'assistant';
}

export interface ChatResponse {
  response: string;
  metadata: ChatMetadata;
}

interface ChatMetadata {
  timestamp: string;
  model: string;
  query: string;
  conversationId: string;
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
  private readonly chatService = inject(CopilotBackendService);

  messages: ChatMessage[] = [];
  isFirstMessage = true;

  handleNewMessage(message: string) {
    this.isFirstMessage = false;
    // Update the message input query signal
    this.messageInputQuery.set(message);

    const messageChat: ChatMessage = {
      content: message,
      timestamp: new Date().toISOString(),
      role: 'user',
    };

    void this.messageAi(messageChat);
  }

  async messageAi(messageChat: ChatMessage): Promise<void> {
    const result = await firstValueFrom(this.chatService.sendMessage(messageChat.content));

    const assistanceMessage: ChatMessage = {
      content: result.response,
      timestamp: result.metadata.timestamp,
      role: 'assistant',
    };

    this.messages = [...this.messages, messageChat, assistanceMessage];
  }


}
