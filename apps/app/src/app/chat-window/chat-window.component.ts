import { AfterViewInit, Component, computed, ElementRef, inject, linkedSignal, signal, viewChild } from '@angular/core';
import { ChatInputComponent } from '../chat-input/chat-input.component';
import { DatePipe } from '@angular/common';
import { WelcomeMessage } from './welcome-message/welcome-message';
import { ChatStoreService } from './chat-store.service';

@Component({
  selector: 'app-chat-window',
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.scss',
  standalone: true,
  imports: [ChatInputComponent, DatePipe, WelcomeMessage],
})
export class ChatWindowComponent implements AfterViewInit {
  private readonly messageContainer = viewChild.required<ElementRef>('messageContainer');

  readonly #chatStoreService = inject(ChatStoreService);

  public readonly messages = computed(() => this.#chatStoreService.messages());
  public readonly isFirstMessage = computed(() => this.#chatStoreService.isFirstMessage());

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  clearConversation(): Promise<void> {
    return this.#chatStoreService.clearCurrentConversation();
  }

  public handleNewMessage(message: string): Promise<void> {
    return this.#chatStoreService.sendMessage(message);
  }

  private scrollToBottom(): void {
    // A small delay to ensure the DOM has updated before scrolling
    setTimeout(() => {
      const messageContainer = this.messageContainer();
      if (messageContainer) {
        messageContainer.nativeElement.scrollTop = messageContainer.nativeElement.scrollHeight;
      }
    }, 0);
  }
}
