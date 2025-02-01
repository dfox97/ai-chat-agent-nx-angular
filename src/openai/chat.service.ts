import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export type ChatMessage = OpenAI.Chat.ChatCompletionMessage;
export type ChatResponse = OpenAI.Chat.ChatCompletionMessage;
export type ToolCallFunction = OpenAI.Chat.ChatCompletionMessageToolCall;

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async sendMessage(messages: ChatMessage[]): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
      });

      return response.choices[0]?.message?.content ?? 'No response from OpenAI';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Error communicating with OpenAI');
    }
  }
}

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

// async sendMessageStream(message: string): Promise<ReadableStream> {
//   try {
//     const stream = await this.anthropic.messages.create({
//       max_tokens: 1024,
//       messages: [{ role: 'user', content: message }],
//       model: 'claude-3-sonnet-20240229',
//       stream: true,
//     });
//
//     return stream;
//   } catch (error) {
//     console.error('Anthropic API error:', error);
//     throw new Error(
//       `Error communicating with Anthropic: ${error instanceof Error ? error.message : 'Unknown error'}`,
//     );
//   }
// }
}
