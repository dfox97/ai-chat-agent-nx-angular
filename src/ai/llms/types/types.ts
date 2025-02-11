export interface LLMService {
  sendMessage(message: string): Promise<string>;
  clearConversation(): void;
  getConversationHistory(): Message[];
}

export enum LLMProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  LOCAL = 'local',
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMConfig {
  apiKey?: string;
  modelName?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}
//model names...
