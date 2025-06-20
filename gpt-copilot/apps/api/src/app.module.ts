import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { Message } from './entity/message.entity';
import { MessageService } from './entity/message.service';
import { AgentPromptService } from './ai/ai-agent-prompt.service';
import { AIAgentService } from './ai/ai-agent.service';
import { LLMFactoryService } from './ai/llms/llm-factory.service';
import { LLMResponseParser } from './ai/llms/llm-response-parser.service';
import { AppController } from './app.controller';

const dbPath = join(process.cwd(), 'db', 'copilot.sqlite');
console.log('Attempting to connect to SQLite database at:', dbPath);

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
    LLMResponseParser,
    AgentPromptService,
    MessageService,
    {
      provide: AIAgentService,
      useFactory: (
        llmFactory: LLMFactoryService,
        llmParser: LLMResponseParser,
        promptService: AgentPromptService,
      ) => {
        return new AIAgentService(llmFactory, llmParser, promptService);
      },
      inject: [LLMFactoryService, LLMResponseParser, AgentPromptService],
    },
  ],
  exports: [AIAgentService, MessageService],
})
export class AppModule { }
