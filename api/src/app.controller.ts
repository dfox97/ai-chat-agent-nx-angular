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
import { Observable } from 'rxjs';

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

      const assistantMessage = await this.messageService.createMessage(
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
  async *streamChat(
    @Query('message') message: string,
  ): AsyncGenerator<MessageEvent> {
    let userMessage;
    let fullResponse = '';
    // TODO: Determine actual conversation ID (e.g., from request, session, or create new)
    const conversationId = '1'; // Placeholder

    try {
      // 1. Save User Message
      userMessage = await this.messageService.createMessage(
        'user',
        message,
        conversationId,
      );

      // 2. Get message stream from AI Agent
      const messageStream = this.aiAgent.streamProcess(message);

      // 3. Process the stream and yield chunks
      for await (const chunk of messageStream) {
        // console.log('Received chunk:', chunk); // Optional: server-side logging
        fullResponse += chunk;

        // Yield chunk to client as MessageEvent
        yield {
          data: JSON.stringify({
            content: chunk,
            metadata: {
              timestamp: new Date().toISOString(),
              model: 'claude-3-haiku', // TODO: Get model from config/agent
              conversationId: userMessage.conversationId,
              isComplete: false,
            },
          }),
        } as MessageEvent;
      }

      // 4. Save the complete assistant message
      if (fullResponse && userMessage) {
        await this.messageService.createMessage(
          'assistant',
          fullResponse,
          userMessage.conversationId,
        );
      }

      // 5. Signal completion
      yield {
        data: JSON.stringify({
          content: '',
          metadata: {
            timestamp: new Date().toISOString(),
            model: 'claude-3-haiku', // TODO: Get model from config/agent
            conversationId: userMessage?.conversationId || conversationId, // Use saved ID if available
            isComplete: true,
          },
        }),
      } as MessageEvent;
    } catch (error) {
      console.error('Error in stream processing:', error);
      // Yield error information to the client
      yield {
        data: JSON.stringify({
          error: `An error occurred during streaming: ${error instanceof Error ? error.message : 'Unknown error'}`,
          metadata: {
            timestamp: new Date().toISOString(),
            conversationId: userMessage?.conversationId || conversationId, // Use saved ID if available
            isComplete: true, // Signal completion even on error
          },
        }),
      } as MessageEvent;
      // The stream automatically closes when the generator finishes or throws an error.
    }
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
}
