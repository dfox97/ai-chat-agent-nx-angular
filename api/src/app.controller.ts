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
          model: 'claude-2',
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
  streamChat(@Query('message') message: string): Observable<any> {
    return new Observable(async (subscriber) => {
      await (async () => {
        const userMessage = await this.messageService.createMessage(
          'user',
          message,
          '1',
        );
        let fullResponse = '';

        // Get message stream (Assuming `streamProcess` returns an AsyncGenerator)
        const messageStream = this.aiAgent.streamProcess(message);

        // Process the streaming response
        for await (const chunk of messageStream) {
          console.log('Received chunk:', chunk);
          fullResponse += chunk;

          subscriber.next({
            data: {
              content: chunk,
              metadata: {
                timestamp: new Date().toISOString(),
                model: 'claude-3-haiku',
                conversationId: userMessage.conversationId,
                isComplete: false,
              },
            },
          });
        }

        // Save the complete assistant message
        await this.messageService.createMessage(
          'assistant',
          fullResponse,
          userMessage.conversationId,
        );

        // Signal completion
        subscriber.next({
          data: {
            content: '',
            metadata: {
              timestamp: new Date().toISOString(),
              model: 'claude-3-haiku',
              conversationId: userMessage.conversationId,
              isComplete: true,
            },
          },
        });

        subscriber.complete();
      })();
    });
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
