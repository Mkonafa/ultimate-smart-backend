import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  create(@Body() createTenantDto: any) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @Put(':id/toggle-status')
  toggleStatus(@Param('id') id: string) {
    return this.tenantsService.toggleStatus(id);
  }

  @Put(':id/suspend')
  suspendCenter(@Param('id') id: string, @Body() body: { adminReason: string; publicMessage: string }) {
    return this.tenantsService.suspendCenter(id, body.adminReason, body.publicMessage);
  }

  @Put(':id/activate')
  activateCenter(@Param('id') id: string) {
    return this.tenantsService.activateCenter(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }

  @Put(':id/settings')
  updateSettings(@Param('id') id: string, @Body() settings: any) {
    return this.tenantsService.updateSettings(id, settings);
  }
}
