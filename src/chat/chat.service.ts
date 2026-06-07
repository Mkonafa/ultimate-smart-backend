import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from './entities/chat.entity';
import { Message } from './entities/message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private chatRepo: Repository<Chat>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
  ) {}

  async createChat(tenantId: string): Promise<Chat> {
    const chat = this.chatRepo.create({ tenantId });
    return this.chatRepo.save(chat);
  }

  async getOrCreateStudentChat(studentId: string, tenantId: string): Promise<Chat> {
    let chat = await this.chatRepo.findOne({
      where: { studentId, tenantId },
    });
    if (!chat) {
      chat = this.chatRepo.create({ studentId, tenantId });
      await this.chatRepo.save(chat);
    }
    return chat;
  }

  async getChats(tenantId?: string): Promise<Chat[]> {
    const where = tenantId ? { tenantId } : {};
    return this.chatRepo.find({
      where,
      relations: { student: true },
      order: { updatedAt: 'DESC' },
    });
  }

  async getMessages(chatId: string): Promise<Message[]> {
    return this.messageRepo.find({ where: { chatId }, order: { createdAt: 'ASC' } });
  }

  async saveMessage(chatId: string, senderId: string, senderName: string, content: string): Promise<Message> {
    const chat = await this.chatRepo.findOne({ where: { id: chatId } });
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    
    const message = this.messageRepo.create({
      chatId,
      senderId,
      senderName,
      content,
    });
    
    const savedMsg = await this.messageRepo.save(message);
    
    // Update chat unread counts and updatedAt timestamp
    if (chat.studentId && senderId === chat.studentId) {
      chat.unreadAdminCount += 1;
    } else {
      chat.unreadTenantCount += 1;
    }
    
    chat.updatedAt = new Date();
    await this.chatRepo.save(chat);
    
    return savedMsg;
  }

  async markAsRead(chatId: string, userId: string, isAdmin: boolean): Promise<void> {
    const chat = await this.chatRepo.findOne({ where: { id: chatId } });
    if (!chat) return;

    if (isAdmin) {
      chat.unreadAdminCount = 0;
    } else {
      chat.unreadTenantCount = 0;
    }
    await this.chatRepo.save(chat);
    
    // Mark messages as read
    await this.messageRepo.update(
      { chatId, isRead: false },
      { isRead: true }
    );
  }
}