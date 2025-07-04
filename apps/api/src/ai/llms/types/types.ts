export * from './base-response-types';
export * from './anthropic-response-types';
export * from './openai-response-types';

export abstract class LLMBase {
  protected conversationHistory: ApiMessage[] = [];

  abstract sendMessage(message: string): Promise<string>;

  setConversationHistory(messages: ApiMessage[]): void {
    this.conversationHistory = messages;
  }
}

export type ApiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export interface LLMConfig {
  apiKey?: string;
  modelName?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}
