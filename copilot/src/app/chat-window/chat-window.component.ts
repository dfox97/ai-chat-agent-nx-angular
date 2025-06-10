import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, inject, signal, ViewChild, WritableSignal } from '@angular/core';
import { ChatInputComponent } from '../chat-input/chat-input.component';
import { CopilotBackendService } from '../../services/copilot-backend.service';
import z from 'zod';
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



interface ChatMessage {
  content: string;
  timestamp: string;
  role: 'user' | 'assistant';
}

export interface ChatResponse {
  response: AgentResponse;
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
export class ChatWindowComponent implements AfterViewChecked {
  readonly messageInputQuery = signal<string>('');
  private readonly chatService = inject(CopilotBackendService);

  // --- State managed by Signals ---
  messages: WritableSignal<ChatMessage[]> = signal([]);
  isLoading: WritableSignal<boolean> = signal(false);
  // ---------------------------------

  isFirstMessage = true; // Can remain a regular property

  // For auto-scrolling
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  private shouldScrollToBottom = false;

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false; // Reset after scrolling
    }
  }

  private scrollToBottom(): void {
    try {
      // Use setTimeout to ensure scrolling happens after the view is fully updated
      setTimeout(() => {
        if (this.messageContainer?.nativeElement) {
          this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
        }
      }, 0);
    } catch (err) {
      console.error("Error scrolling to bottom:", err);
    }
  }


  handleNewMessage(message: string) {
    this.isFirstMessage = false;
    // Update the message input query signal
    this.messageInputQuery.set(message);

    this.messages.update((val) => {
      return [...val, {
        content: message,
        role: 'user',
        timestamp: new Date().toISOString(),
      }]
    });

    const assistantMessage: ChatMessage = {
      content: 'thinking...',
      timestamp: new Date().toISOString(),
      role: 'assistant',
    };


    // 3. Push assistant placeholder immediately
    this.messages.update((val) => [...val, assistantMessage]);
    // Send message and handle streaming response
    this.chatService.sendMessage(message).subscribe({
      next: (response) => {
        const updatedMessage: ChatMessage = {
          ...assistantMessage,
          content: response.response.finalAnswer || 'No response received'
        };

        // Replace the placeholder message
        this.updateMessages(updatedMessage);
      },
      error: (error) => {
        console.error('Error sending message:', error);
        const updatedMessage: ChatMessage = {
          ...assistantMessage,
          content: 'Error: Failed to get response'
        };
        this.updateMessages(updatedMessage);
      },
      complete: () => {
        console.log('Stream subscription completed');
      }
    });
  }

  updateMessages(updatedMessage: ChatMessage) {
    this.messages.update((msgs) => msgs.map(msg =>
      msg.timestamp === updatedMessage.timestamp && msg.role === 'assistant'
        ? updatedMessage
        : msg
    ));
  }

}
