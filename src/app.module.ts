import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { AnthropicChatService } from './ai/anthropic-chat.service';
import { AIAgentService } from './ai/ai-agent.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AIAgentService, AnthropicChatService],
})
export class AppModule { }
