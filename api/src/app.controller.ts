import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Get,
  Param,
  Logger,
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

export interface StreamedChatResponse {
  response: string; // Content chunk (optional, might be empty on completion signal)
  metadata: {
    timestamp: string;
    model?: string;
    conversationId: string;
  };
}
@Controller()
export class AppController {
  private readonly logger = new Logger('AppController');

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

  @Post('chat')
  async chat(
    @Body() body: { message: string; conversationId?: string },
  ): Promise<StreamedChatResponse> {
    try {
      if (body.conversationId) {
        const history = await this.messageService.getConversationMessages(
          body.conversationId,
        );

        this.aiAgent.setConversationHistory(history as any);
      }

      const result = await this.aiAgent.process(body.message);

      this.logger.log('Successfully processed message:', body.message);
      const userMessage = await this.messageService.createMessage(
        'user',
        body.message,
        body?.conversationId,
      );

      await this.messageService.createMessage(
        'assistant',
        typeof result === 'string' ? result : JSON.stringify(result),
        userMessage.conversationId,
      );

      this.logger.log('conversaton saved:', userMessage.conversationId);

      // Handle the string response from process method
      return {
        response: JSON.stringify(result),
        metadata: {
          timestamp: new Date().toISOString(),
          model: 'claude-3-haiku',
          conversationId: userMessage.conversationId,
        },
      };
    } catch (error) {
      this.logger.error('Failed: Chat processing error:', error);
      throw new HttpException(
        `Failed to process message: ${error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('chat/message/:conversationId')
  getChatHistory(
    @Param('conversationId') conversationId: string,
  ): Promise<Message[]> {
    this.logger.log(`Fetching messages for conversation:`, conversationId);
    return this.messageService.getConversationMessages(conversationId);
  }
}
