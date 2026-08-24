import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
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
  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() data: any, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.usersService.updateUser(id, tenantId, data);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN')
  @Put(':id/toggle-restriction')
  async toggleRestriction(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.usersService.toggleRestriction(id, tenantId);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN')
  @Put(':id/toggle-active')
  async toggleActive(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.usersService.toggleActive(id, tenantId);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN')
  @Put(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body('newPassword') newPassword: string, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.usersService.resetPassword(id, tenantId, newPassword || '123456');
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN')
  @Put(':id/update-code')
  async updateCode(@Param('id') id: string, @Body('newCode') newCode: string, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.usersService.updateUserCode(id, tenantId, newCode);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN')
  @Delete('bulk')
  async bulkRemove(@Body('ids') ids: string[], @Request() req) {
    const tenantId = req.user.tenantId;
    return this.usersService.bulkRemove(ids || [], tenantId);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN')
  @Delete(':id')
  async removeUser(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.usersService.remove(id, tenantId);
  }
}
