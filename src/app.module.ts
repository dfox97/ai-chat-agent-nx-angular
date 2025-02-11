import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { AIAgentService } from './ai/ai-agent.service';
import { LLMFactoryService } from './ai/llms/llm-factory.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    LLMFactoryService,
    {
      provide: AIAgentService,
      useFactory: (llmFactory: LLMFactoryService) => {
        return new AIAgentService(llmFactory);
      },
      inject: [LLMFactoryService],
    },
  ],
  exports: [AIAgentService],
})
export class AppModule { }
