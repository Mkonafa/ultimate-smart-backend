import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}

  @SubscribeMessage('joinChat')
  async handleJoinChat(@MessageBody() payload: { chatId: string }, @ConnectedSocket() client: Socket) {
    client.join(payload.chatId);
    return { event: 'joined', data: payload.chatId };
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(@MessageBody() payload: { chatId: string, senderId: string, senderName: string, content: string }, @ConnectedSocket() client: Socket) {
    const savedMsg = await this.chatService.saveMessage(payload.chatId, payload.senderId, payload.senderName, payload.content);
    
    // Broadcast to everyone in the chat room
    this.server.to(payload.chatId).emit('newMessage', savedMsg);
    
    // Also notify admins globally if they are listening
    this.server.emit('adminNewMessageAlert', savedMsg);
    
    return savedMsg;
  }

  @SubscribeMessage('markRead')
  async handleMarkRead(@MessageBody() payload: { chatId: string, userId: string, isAdmin: boolean }) {
    await this.chatService.markAsRead(payload.chatId, payload.userId, payload.isAdmin);
    this.server.to(payload.chatId).emit('messagesRead', { chatId: payload.chatId });
  }
}
