import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Get,
  Sse,
  Query,
} from '@nestjs/common';
import { AIAgentService } from './ai/ai-agent.service';
import {
  PdfTool,
  PirateTool,
  ResearchPdfTool,
  SearchTool,
  WikiTool,
} from './ai/tools';
import { MessageService } from './entity/message.service';
import { Message } from './entity/message.entity';
import { from, Observable } from 'rxjs';

export interface StreamedChatResponse {
  content?: string; // Content chunk (optional, might be empty on completion signal)
  error?: string; // Error message (optional)
  metadata: {
    timestamp: string;
    model?: string; // Optional, might not be in every chunk
    conversationId: string;
    isComplete: boolean; // Flag to indicate the end of the stream
  };
}
@Controller()
export class AppController {
  constructor(
    private readonly aiAgent: AIAgentService,
    private readonly messageService: MessageService,
  ) {
    this.aiAgent.registerTool(WikiTool);
    this.aiAgent.registerTool(PirateTool);
    this.aiAgent.registerTool(PdfTool);
    this.aiAgent.registerTool(ResearchPdfTool);
    this.aiAgent.registerTool(SearchTool);
  }

  // curl -X POST http://localhost:3000/chat \
  // -H "Content-Type: application/json" \
  // -d '{"message": "Tell me about pirates in history"}'
  @Post('chat')
  async chat(@Body() body: { message: string }) {
    try {
      const result = await this.aiAgent.process(body.message);

      const userMessage = await this.messageService.createMessage(
        'user',
        body.message,
        '1',
      );

      await this.messageService.createMessage(
        'assistant',
        typeof result === 'string' ? result : JSON.stringify(result),
        userMessage.conversationId,
      );
      // Handle the string response from process method
      return {
        response: JSON.stringify(result),
        metadata: {
          timestamp: new Date().toISOString(),
          model: 'claude-3-haiku',
          query: body.message,
          conversationId: userMessage.conversationId,
        },
      };
    } catch (error) {
      console.error('Chat processing error:', error);
      throw new HttpException(
        `Failed to process message: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Sse('stream')
  streamChat(
    @Query('message') message: string,
  ): Observable<StreamedChatResponse> {
    return from(this.generateStream(message));
  }

  @Get('chat/history')
  getChatHistory() {
    const history = this.aiAgent.getConversationHistory();
    return {
      history,
      metadata: {
        timestamp: new Date().toISOString(),
        messageCount: history.length,
      },
    };
  }

  private async *generateStream(
    message: string,
  ): AsyncGenerator<StreamedChatResponse> {
    let userMessage: Message | null = null;
    let fullResponse = '';
    const conversationId = '1'; // TODO: Replace with real conversation logic

    try {
      // Save User Message
      userMessage = await this.messageService.createMessage(
        'user',
        message,
        conversationId,
      );

      // Get message stream from AI Agent
      const messageStream = await this.aiAgent.streamProcess(message);

      // Stream chunks
      for await (const chunk of messageStream) {
        fullResponse += chunk;

        yield {
          content: chunk,
          metadata: {
            timestamp: new Date().toISOString(),
            model: 'claude-3-haiku',
            conversationId: userMessage.conversationId,
            isComplete: false,
          },
        };
      }

      // Save assistant response
      if (fullResponse && userMessage) {
        await this.messageService.createMessage(
          'assistant',
          fullResponse,
          userMessage.conversationId,
        );
      }

      // Final message: mark as complete
      yield {
        content: '',
        metadata: {
          timestamp: new Date().toISOString(),
          model: 'claude-3-haiku',
          conversationId: userMessage?.conversationId || conversationId,
          isComplete: true,
        },
      };
    } catch (error) {
      console.error('Error in stream processing:', error);
    }
  }
}
