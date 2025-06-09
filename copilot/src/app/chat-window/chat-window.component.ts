import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, inject, signal, ViewChild, WritableSignal } from '@angular/core';
import { ChatInputComponent } from '../chat-input/chat-input.component';
import { CopilotBackendService, StreamedChatResponse } from '../../services/copilot-backend.service';


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

    const messageChat: ChatMessage = {
      content: message,
      timestamp: new Date().toISOString(),
      role: 'user',
    };

    void this.messageAi(messageChat);
  }

  async messageAi(messageChat: ChatMessage): Promise<void> {
    this.streamAiResponse(messageChat.content);
  }


  streamAiResponse(messageContent: string): void {
    this.isLoading.set(true); // Set loading signal
    const assistantMessageId: string | null = null; // ID of the assistant message being built

    this.chatService.streamMessages(messageContent).subscribe({
      next: (chunk: StreamedChatResponse) => {
        // console.log('Received chunk:', chunk); // Optional: for debugging

        if (chunk.error) {
          console.error('Streaming error from backend:', chunk.error);
          const errorMsg: ChatMessage = {
            content: `**Error:** ${chunk.error}`,
            timestamp: chunk.metadata?.timestamp || new Date().toISOString(),
            role: 'assistant',
          };
          // Add or replace the last message with the error
          this.messages.update(currentMessages => {
            return [...currentMessages, errorMsg];
          });
          this.isLoading.set(false); // Stop loading on error
          this.shouldScrollToBottom = true;
          return; // Stop processing this stream
        }

        // Process valid content chunk
        if (!assistantMessageId) {
          // First valid chunk, create the assistant message object
          const newAssistantMessage: ChatMessage = {
            content: chunk.content || '',
            timestamp: chunk.metadata?.timestamp || new Date().toISOString(),
            role: 'assistant',
          };

          this.messages.update(currentMessages => [...currentMessages, newAssistantMessage]);
        } else if (chunk.content) {
          // Subsequent chunk, update the existing assistant message immutably
          this.messages.update(currentMessages => {
            const lastMessage = currentMessages[currentMessages.length - 1];
            // Ensure we are updating the correct message
            if (lastMessage) {
              // Create a *new* message object with updated content
              const updatedLastMessage: ChatMessage = {
                ...lastMessage,
                content: lastMessage.content + chunk.content,
              };
              // Return a new array with the last message replaced
              return [...currentMessages.slice(0, -1), updatedLastMessage];
            }
            // If last message ID doesn't match, return original (shouldn't happen in normal flow)
            return currentMessages;
          });
        }
        this.shouldScrollToBottom = true; // Scroll as content arrives

        // If the stream is marked as complete in this chunk's metadata
        if (chunk.metadata?.isComplete) {
          this.isLoading.set(false);
          console.log('Stream finished via metadata flag.');
          // Optionally update final metadata
          this.messages.update(currentMessages => {
            const lastMessage = currentMessages[currentMessages.length - 1];
            if (lastMessage) {
              const updatedLastMessage = { ...lastMessage, metadata: chunk.metadata };
              return [...currentMessages.slice(0, -1), updatedLastMessage];
            }
            return currentMessages;
          });
        }
      },
      error: (error) => {
        console.error('Stream subscription error:', error);
        const errorMsg: ChatMessage = {
          content: `**Error:** ${error.message || 'Failed to connect to stream.'}`,
          timestamp: new Date().toISOString(),
          role: 'assistant',
        };
        // Add or replace the last message with the error
        this.messages.update(currentMessages => {
          return [...currentMessages, errorMsg];
        });
        this.isLoading.set(false); // Stop loading on error
        this.shouldScrollToBottom = true;
        // No need to clear subscription ref, takeUntilDestroyed handles it
      },
      complete: () => {
        console.log('Stream subscription completed.');
        // Ensure loading is off, even if the last chunk didn't have isComplete flag
        this.isLoading.set(false);
        this.shouldScrollToBottom = true; // Scroll one last time
        // No need to clear subscription ref
      }
    });
  }

}
