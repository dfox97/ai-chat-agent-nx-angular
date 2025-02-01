import { Controller, Post, Body } from '@nestjs/common';
import { AnthropicChatService } from './openai/chat.service';

@Controller()
export class AppController {
  constructor(private readonly anthropicService: AnthropicChatService) { }

  @Post('chat')
  async chat(@Body() body: { message: string }) {
    return this.anthropicService.sendMessage(body.message);
  }
}
