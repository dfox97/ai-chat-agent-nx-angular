import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnthropicChatService } from './anthropic/anthropic.service';
import { OpenAIChatService } from './openai/openai.service';
import { LLMProvider, LLMBase } from './types/types';

@Injectable()
export class LLMFactoryService {
  constructor(private configService: ConfigService) { }

  createLLMService(provider: LLMProvider): LLMBase {
    switch (provider) {
      case LLMProvider.ANTHROPIC:
        return new AnthropicChatService(this.configService);
      case LLMProvider.OPENAI:
        return new OpenAIChatService(this.configService);
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
}
