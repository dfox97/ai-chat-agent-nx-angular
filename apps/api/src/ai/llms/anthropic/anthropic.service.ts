import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiMessage, fromAnthropic, LLMBase } from '../types/types';

@Injectable()
export class AnthropicChatService extends LLMBase {
  private readonly anthropic: Anthropic;
  protected override conversationHistory: ApiMessage[] = [];

  constructor(private configService: ConfigService) {
    super();
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  public async sendMessage(message: string): Promise<string> {
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: message,
      });

      console.debug('Conversation history:', this.conversationHistory);

      // Get response from Anthropic
      const response = fromAnthropic(
        await this.anthropic.messages.create({
          max_tokens: 1024,
          messages: this.conversationHistory,
          model: this.configService.get<string>('ANTHROPIC_MODEL', 'claude-3-5-haiku-latest'),
        }),
      );

      // Extract the actual text response
      const assistantApiMessage = response.content?.trim() ?? '';

      // Add assistant's response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantApiMessage,
      });

      // Return the actual text response
      return assistantApiMessage;
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error(
        `Error communicating with Anthropic: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
