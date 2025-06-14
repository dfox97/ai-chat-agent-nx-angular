import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiMessage } from '../types/types';

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

@Injectable()
export class AnthropicChatService {
  public anthropic: Anthropic;
  private conversationHistory: ApiMessage[] = [];

  constructor(private configService: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  public clearConversation() {
    this.conversationHistory = [];
  }

  public setConversationHistory(messages: ApiMessage[]) {
    this.conversationHistory = messages;
  }

  async sendMessage(message: string): Promise<string> {
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        content: message,
      });

      // Get response from Anthropic
      const response = (await this.anthropic.messages.create({
        max_tokens: 1024,
        messages: this.conversationHistory,
        model: 'claude-3-5-haiku-latest',
      })) as LLMResponse; // Fixes same annying type complaints

      // Extract the actual text response
      const assistantApiMessage = response.content[0].text.trim(); // Big object with response final answer can be large
      console.log('Anthropic response text:', assistantApiMessage);

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
