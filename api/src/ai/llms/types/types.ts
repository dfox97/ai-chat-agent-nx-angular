export * from './base-response-types';
export * from './anthropic-response-types';
export * from './openai-response-types';

export interface LLMService {
  sendMessage(message: string): Promise<string>;
  setConversationHistory(messages: ApiMessage[]): void;
  clearConversation(): void;
}

export interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  conversationId?: string;
  createdAt?: Date;
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
