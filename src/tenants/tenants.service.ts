import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
  ) {}

  async create(createTenantDto: any): Promise<Tenant> {
    const tenant = this.tenantsRepository.create(createTenantDto as Partial<Tenant>);
    return this.tenantsRepository.save(tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantsRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant #${id} not found`);
    }
    return tenant;
  }

  async toggleStatus(id: string): Promise<Tenant> {
    const tenant = await this.findOne(id);
    tenant.isActive = !tenant.isActive;
    return this.tenantsRepository.save(tenant);
  }

  async suspendCenter(id: string, adminReason: string, publicMessage: string): Promise<Tenant> {
    const tenant = await this.findOne(id);
    tenant.isActive = false;
    tenant.adminSuspensionReason = adminReason;
    tenant.publicMaintenanceMessage = publicMessage;
    return this.tenantsRepository.save(tenant);
  }

  async activateCenter(id: string): Promise<Tenant> {
    const tenant = await this.findOne(id);
    tenant.isActive = true;
    tenant.adminSuspensionReason = '';
    tenant.publicMaintenanceMessage = '';
    return this.tenantsRepository.save(tenant);
  }

  async remove(id: string): Promise<void> {
    const tenant = await this.findOne(id);
    await this.tenantsRepository.softRemove(tenant); // Use softRemove since we have DeleteDateColumn
  }

  async updateSettings(id: string, settings: Partial<Tenant>): Promise<Tenant> {
    const tenant = await this.findOne(id);
    if (settings.canTeacherCreateCourse !== undefined) {
      tenant.canTeacherCreateCourse = settings.canTeacherCreateCourse;
    }
    if (settings.canTeacherUploadMaterial !== undefined) {
      tenant.canTeacherUploadMaterial = settings.canTeacherUploadMaterial;
    }
    return this.tenantsRepository.save(tenant);
  }
}