import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AnthropicChatService {
  public anthropic: Anthropic;

  constructor(private configService: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async sendMessage(message: string): Promise<string> {
    try {
      const response = await this.anthropic.messages.create({
        max_tokens: 1024,
        messages: [{ role: 'user', content: message }],
        model: 'claude-3-sonnet-20240229',
      });

      return JSON.stringify(response);
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error(
        `Error communicating with Anthropic: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
