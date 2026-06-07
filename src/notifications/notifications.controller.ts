import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN')
  @Post('global')
  sendGlobalNotification(
    @Body() body: { title: string; body: string },
    @Request() req
  ) {
    const tenantId = req.user.tenantId;
    return this.notificationsService.sendGlobalNotification(tenantId, body.title, body.body);
  }

  @Get('my')
  getMyNotifications(@Request() req) {
    const tenantId = req.user.tenantId;
    return this.notificationsService.getMyNotifications(tenantId, req.user);
  }

  @Post(':id/read')
  markAsRead(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.notificationsService.markAsRead(id, tenantId);
  }
}
