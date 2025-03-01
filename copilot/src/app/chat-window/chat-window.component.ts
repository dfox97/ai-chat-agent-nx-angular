import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatInputComponent } from '../chat-input/chat-input.component';

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
    // this.aiService.sendMessage(message).subscribe(response => {...});
  }
}
