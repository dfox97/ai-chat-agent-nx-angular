import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LLMService, LLMConfig, Message } from '../types/types';

@Injectable()
export class OpenAIChatService implements LLMService {
  private openai: OpenAI;
  private conversationHistory: Message[] = [];
  private config: LLMConfig;

  constructor(
    private configService: ConfigService,
    config: LLMConfig = {},
  ) {
    this.config = {
      apiKey: config.apiKey || this.configService.get<string>('OPENAI_API_KEY'),
      modelName: config.modelName || 'gpt-4',
      maxTokens: config.maxTokens || 1024,
      temperature: config.temperature || 0.1,
    };

    this.openai = new OpenAI(this.config);
  }

  public clearConversation() {
    this.conversationHistory = [];
  }

  public getConversationHistory(): Message[] {
    return [...this.conversationHistory];
  }

  async *streamMessages(message: string): AsyncGenerator<string> {
    return null;
  }

  async sendMessage(message: string): Promise<string> {
    try {
      this.conversationHistory.push({
        role: 'user',
        content: message,
      });

      const response = await this.openai.chat.completions.create({
        model: this.config.modelName!,
        messages: this.conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      const assistantMessage =
        response.choices[0].message?.content?.trim() || '';

      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(
        `Error communicating with OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
