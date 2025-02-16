import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Get,
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
