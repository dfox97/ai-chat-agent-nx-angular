import { AfterViewInit, Component, computed, ElementRef, inject, linkedSignal, ViewChild } from '@angular/core';
import { ChatInputComponent } from '../chat-input/chat-input.component';
import { LocalStorageService } from '../../services/localstorage.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ChatService } from './chat.service';
import { ChatMessageI } from '@gpt-copilot/shared';


@Component({
  selector: 'app-chat-window',
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.scss',
  standalone: true,
  imports: [ChatInputComponent, DatePipe],
})
export class ChatWindowComponent implements AfterViewInit {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  readonly localStorageService = inject(LocalStorageService);
  readonly chatService = inject(ChatService);

  readonly #convoId = this.localStorageService.getItem('conversationId');

  readonly #convoHistory = toSignal(this.chatService.loadChatHistory(this.#convoId));

  public readonly isFirstMessage = computed(() => !this.messages()?.length)

  public readonly messages = linkedSignal(() => this.#convoHistory() || []);

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  async handleNewMessage(message: string) {
    this.messages.update((val) => {
      return [...val, {
        content: message,
        role: 'user',
        timestamp: new Date(),
      }]
    });

    this.scrollToBottom(); // Scroll after user message is added
    const assistantMessage: ChatMessageI = {
      content: 'thinking...',
      timestamp: new Date(),
      role: 'assistant',
    };

    this.messages.update((val) => [...val, assistantMessage]);

    try {
      const response = await this.chatService.sendMessage(message, this.#convoId);

      const updatedMessage: ChatMessageI = {
        ...assistantMessage,
        content: response.response.finalAnswer || 'No response received'
      };

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

  private scrollToBottom(): void {
    // A small delay to ensure the DOM has updated before scrolling
    setTimeout(() => {
      if (this.messageContainer) {
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
      }
    }, 0);
  }
}
