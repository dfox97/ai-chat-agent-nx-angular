import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) { }

  async createMessage(
    role: string,
    content: string,
    conversationId?: string,
  ): Promise<Message> {
    const message = new Message();
    message.role = role;
    message.content = content;
    message.conversationId = conversationId || '';
    return this.messageRepository.save(message);
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    return this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  async getAllConversations(): Promise<string[]> {
    const conversations = await this.messageRepository
      .createQueryBuilder('message')
      .select('message.conversationId')
      .distinct(true)
      .getRawMany();

    return conversations.map((c) => c.conversationId);
  }
}
