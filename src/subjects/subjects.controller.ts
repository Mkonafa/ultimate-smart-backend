import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN')
  @Post()
  create(@Body() data: any, @Request() req) {
    const tenantId = req.user.tenantId; // User's tenant
    return this.subjectsService.create(data, tenantId);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN', 'TEACHER', 'STUDENT')
  @Get()
  findAll(@Request() req) {
    const tenantId = req.user.tenantId;
    return this.subjectsService.findAllByTenant(tenantId);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.subjectsService.remove(id, tenantId);
  }
}

