import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnthropicChatService } from './anthropic/anthropic.service';
import { OpenAIChatService } from './openai/openai.service';
import { LLMProvider, LLMConfig, LLMService } from './types/types';

@Injectable()
export class LLMFactoryService {
  constructor(private configService: ConfigService) { }

  createLLMService(provider: LLMProvider, config?: LLMConfig): LLMService {
    switch (provider) {
      case LLMProvider.ANTHROPIC:
        return new AnthropicChatService(this.configService);
      case LLMProvider.OPENAI:
        return new OpenAIChatService(this.configService, config);
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
}
