import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN')
  @Post()
  async create(@Body() data: any, @Request() req) {
    const tenantId = req.user.tenantId; // Ensure the created user is bound to this tenant
    // Role could be passed from frontend (e.g., 'TEACHER', 'STUDENT')
    const role = data.role || 'STUDENT';
    return this.usersService.create({ ...data, tenantId, role });
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN')
  @Get()
  async findAll(@Request() req) {
    const tenantId = req.user.tenantId;
    return this.usersService.findAllByTenant(tenantId);
  }

  @Get('profile')
  getProfile(@Request() req) {
    return this.usersService.findById(req.user.sub || req.user.userId);
  }

  @Post('fcm-token')
  updateFcmToken(@Body('token') token: string, @Request() req) {
    return this.usersService.updateFcmToken(req.user.sub || req.user.userId, token);
  }

  @Roles('PARENT')
  @Get('my-children')
  async getMyChildren(@Request() req) {
    const parentId = req.user.userId || req.user.sub;
    return this.usersService.findChildrenOfParent(parentId);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN')
  @Put(':id/toggle-qr')
  async toggleQr(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.usersService.toggleQr(id, tenantId);
  }
}
