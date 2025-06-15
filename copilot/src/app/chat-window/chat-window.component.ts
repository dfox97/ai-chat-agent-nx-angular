import { Component, computed, inject, linkedSignal } from '@angular/core';
import { ChatInputComponent } from '../chat-input/chat-input.component';
import { LocalStorageService } from '../../services/localstorage.service';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ChatMessageI, ChatService } from './chat.service';


@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, ChatInputComponent],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.scss',
})
export class ChatWindowComponent {
  readonly localStorageService = inject(LocalStorageService);
  readonly chatService = inject(ChatService);

  readonly #convoId = this.localStorageService.getItem('conversationId');

  readonly #convoHistory = toSignal(this.chatService.loadChatHistory(this.#convoId));

  public readonly isFirstMessage = computed(() => !this.#convoHistory()?.length)

  public readonly messages = linkedSignal(() => this.#convoHistory() || []);

  async handleNewMessage(message: string) {
    this.messages.update((val) => {
      return [...val, {
        content: message,
        role: 'user',
        timestamp: new Date(),
      }]
    });

    const assistantMessage: ChatMessageI = {
      content: 'thinking...',
      timestamp: new Date(),
      role: 'assistant',
    };

    this.messages.update((val) => [...val, assistantMessage]);

    try {
      console.log('Sending message to chat service:', message);
      const response = await this.chatService.sendMessage(message, this.#convoId);

      const updatedMessage: ChatMessageI = {
        ...assistantMessage,
        content: response.response.finalAnswer || 'No response received'
      };

      console.log('Received response from chat service:', updatedMessage.content);

      // Replace the placeholder message
      this.updateMessages(updatedMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      const updatedMessage: ChatMessageI = {
        ...assistantMessage,
        content: 'Error: Failed to get response'
      };
      this.updateMessages(updatedMessage);
    }
  }

  updateMessages(updatedMessage: ChatMessageI) {
    this.messages.update((msgs) => msgs.map(msg =>
      msg.timestamp === updatedMessage.timestamp && msg.role === 'assistant'
        ? updatedMessage
        : msg
    ));
  }

}
