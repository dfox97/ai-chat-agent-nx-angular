import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  role!: string;

  @Column('text')
  content!: string;

  @Column()
  conversationId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
