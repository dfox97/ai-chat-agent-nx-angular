import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class MessageService {
  private readonly logger = new Logger('MessageService');
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) { }

  async createMessage(
    role: string,
    content: string,
    conversationId = randomUUID().toString(),
  ): Promise<Message> {
    const message = new Message();
    message.role = role;
    message.content = content;
    message.conversationId = conversationId;

    try {
      return this.messageRepository.save(message);
    } catch (error) {
      this.logger.error('Failed: Error saving message:', error);
      return message; // Return the message even if save fails
    }
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    return this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }
}
