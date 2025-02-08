import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface LLMStructuredResponse {
  thought: string;
  action?: {
    tool: string;
    params: Record<string, any>;
  };
  finalAnswer: string | null;
}

export interface LLMResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  model: string;
  content: Array<{
    type: 'text';
    text: string;
  }>;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AnthropicChatService {
  public anthropic: Anthropic;
  private conversationHistory: Message[] = [];

  constructor(private configService: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  public clearConversation() {
    this.conversationHistory = [];
  }

  public getConversationHistory(): Message[] {
    return [...this.conversationHistory];
  }
  // Should add streaming here.
  // Add TypeORM and redis for chat history

  async sendMessage(message: string): Promise<string> {
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: message,
      });

      const response = (await this.anthropic.messages.create({
        max_tokens: 1024,
        messages: this.conversationHistory,
        model: 'claude-3-haiku-20240307',
      })) as LLMResponse;

      console.log('Anthropic response: send message', response.content[0].text);
      const textContent = response.content[0].text;
      const structuredResponse: LLMStructuredResponse = JSON.parse(textContent);
      console.log(
        'Anthropic response: structured response',
        structuredResponse,
      );

      // Add assistant's response to history
      this.conversationHistory.push({
        role: 'assistant',

        content: JSON.stringify(response),
      });

      // Clean and parse the response text

      return JSON.stringify(response);
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error(
        `Error communicating with Anthropic: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
