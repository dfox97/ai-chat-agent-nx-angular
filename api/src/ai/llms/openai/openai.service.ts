import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ApiMessage, fromOpenAI, LLMBase } from '../types/types';

@Injectable()
export class OpenAIChatService extends LLMBase {
  private readonly openai: OpenAI;
  protected conversationHistory: ApiMessage[] = []; // want to use string for content to streamline between openai and anthropic

  constructor(private configService: ConfigService) {
    super();

    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  public async sendMessage(message: string): Promise<string> {
    try {
      this.conversationHistory.push({
        role: 'user',
        content: message,
      });

      const response = fromOpenAI(
        await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: this.conversationHistory,
          max_tokens: 1024,
          temperature: 0.1,
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
      console.error('OpenAI API error:', error);
      throw new Error(
        `Error communicating with OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
