import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, inject, OnInit, PLATFORM_ID, signal, ViewChild, WritableSignal } from '@angular/core';
import z from 'zod';
import { CopilotBackendService } from '../../services/copilot-backend.service';
import { ChatInputComponent } from '../chat-input/chat-input.component';
import { response } from 'express';
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



interface ChatMessageI {
  content: string;
  timestamp: Date;
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
export class ChatWindowComponent implements AfterViewChecked, OnInit {
  readonly messageInputQuery = signal<string>('');
  private readonly chatService = inject(CopilotBackendService);
  private readonly platformId = inject(PLATFORM_ID);

  // --- State managed by Signals ---
  messages: WritableSignal<ChatMessageI[]> = signal([]);
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
    // Use setTimeout to ensure scrolling happens after the view is fully updated
    setTimeout(() => {
      if (this.messageContainer?.nativeElement) {
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
      }
    }, 0);
  }

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      console.log('getting conversationId from localStorage');
      const convoId = localStorage.getItem('conversationId');
      if (!convoId) return;
      this.chatService.getConversationHistory(convoId).subscribe((data) => {
        if (data.length) {
          this.isFirstMessage = false;
        }

        console.log('testing data', data)

        //modify data.content so that the data is parsed to thought, finalAnswer, action
        data = data.map((msg) => {
          const parsedContent = JSON.parse(msg.content);
          return {
            ...msg,
            content: parsedContent.finalAnswer || parsedContent.thought || 'No content',
          }
        });


        this.messages.set(data)
      });
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
        timestamp: new Date(),
      }]
    });

    const assistantMessage: ChatMessageI = {
      content: 'thinking...',
      timestamp: new Date(),
      role: 'assistant',
    };


    // 3. Push assistant placeholder immediately
    this.messages.update((val) => [...val, assistantMessage]);
    // Send message and handle streaming response
    this.chatService.sendMessage(message).subscribe({
      next: (response) => {
        const updatedMessage: ChatMessageI = {
          ...assistantMessage,
          content: response.response.finalAnswer || 'No response received'
        };

        // Replace the placeholder message
        this.updateMessages(updatedMessage);
      },
      error: (error) => {
        console.error('Error sending message:', error);
        const updatedMessage: ChatMessageI = {
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

  updateMessages(updatedMessage: ChatMessageI) {
    this.messages.update((msgs) => msgs.map(msg =>
      msg.timestamp === updatedMessage.timestamp && msg.role === 'assistant'
        ? updatedMessage
        : msg
    ));
  }

}
