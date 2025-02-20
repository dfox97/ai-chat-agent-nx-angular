import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AIAgentService } from './ai/ai-agent.service';
import { LLMFactoryService } from './ai/llms/llm-factory.service';
import { AppController } from './app.controller';
import { Message } from './entity/message.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageService } from './entity/message.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: join(process.cwd(), 'db', 'copilot.sqlite'),
      entities: [Message],
      synchronize: true, // Be careful with this in production
    }),
    TypeOrmModule.forFeature([Message]),
  ],
  controllers: [AppController],
  providers: [
    LLMFactoryService,
    MessageService,
    {
      provide: AIAgentService,
      useFactory: (llmFactory: LLMFactoryService) => {
        return new AIAgentService(llmFactory);
      },
      inject: [LLMFactoryService],
    },
  ],
  exports: [AIAgentService, MessageService],
})
export class AppModule { }
