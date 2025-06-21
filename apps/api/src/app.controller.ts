import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Get,
  Param,
  Logger,
  Delete,
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
import { ApiMessage } from './ai/llms/types/types';
import { ChatResponse } from '@gpt-copilot/shared';

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
  ): Promise<ChatResponse> {
    try {
      if (body.conversationId) {
        const history = await this.messageService.getConversationMessages(
          body.conversationId,
        );

        const apiMessages: ApiMessage[] = history.map((msg) => ({
          content: msg.content,
          role: msg.role as 'user' | 'assistant',
        }));

        this.aiAgent.setConversationHistory(apiMessages);
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
        response: result,
        metadata: {
          query: body.message,
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
  @Delete('chat/:conversationId') // Use Delete decorator for deleting resources
  async clearConversation(
    @Param('conversationId') conversationId: string,
  ): Promise<{ message: string }> {
    try {
      await this.messageService.deleteConversationMessages(conversationId);
      this.logger.log(`Conversation ${conversationId} cleared.`);
      return { message: `Conversation ${conversationId} cleared successfully.` };
    } catch (error) {
      this.logger.error(
        `Failed to clear conversation ${conversationId}:`,
        error,
      );
      throw new HttpException(
        `Failed to clear conversation: ${error}`,
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
