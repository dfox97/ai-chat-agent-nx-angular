import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Message } from '../types/types';

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
  async *streamMessages(message: string): AsyncGenerator<string> {
    try {
      // Add user message to history
      this.conversationHistory.push({ role: 'user', content: message });

      // Ensure history doesn't grow too large
      const maxHistory = 10;
      if (this.conversationHistory.length > maxHistory) {
        this.conversationHistory = this.conversationHistory.slice(-maxHistory);
      }

      // Get stream from Anthropic
      const stream = this.anthropic.messages.stream({
        messages: this.conversationHistory,
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
      });

      let fullResponse = '';

      // Process the stream
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta?.type === 'text_delta'
        ) {
          const textChunk = chunk.delta.text ?? '';
          fullResponse += textChunk;
          yield textChunk; // Yield only valid text
        }
      }

      // Add assistant's full response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: fullResponse,
      });
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error(
        `Error communicating with Anthropic: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
  // Add TypeORM and redis for chat history

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
      const assistantMessage = response.content[0].text.trim(); // Big object with response final answer can be large
      console.log('Anthropic response text:', assistantMessage);

      // Add assistant's response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      // Return the actual text response
      return assistantMessage;
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error(
        `Error communicating with Anthropic: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
