import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { AnthropicChatService } from './openai/chat.service';
import { AgentService } from './openai/ai-agent.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AgentService, AnthropicChatService],
})
export class AppModule { }
