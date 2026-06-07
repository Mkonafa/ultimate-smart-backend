import { Controller, Get, Param, Post, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Roles('STUDENT')
  @Get('my-chat')
  async getMyChat(@Request() req) {
    const studentId = req.user.userId || req.user.sub;
    const tenantId = req.user.tenantId;
    return this.chatService.getOrCreateStudentChat(studentId, tenantId);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN', 'TEACHER')
  @Get('admin')
  async getAdminChats(@Request() req) {
    const tenantId = req.user.tenantId;
    return this.chatService.getChats(tenantId);
  }

  @Get(':id/messages')
  getMessages(@Param('id') id: string) {
    return this.chatService.getMessages(id);
  }
}
