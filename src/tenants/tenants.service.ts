import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantsService implements OnModuleInit {
  constructor(
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
  ) {}

  async onModuleInit() {
    try {
      let defaultTenant = await this.tenantsRepository.findOne({ where: { code: 'C001' } });
      if (!defaultTenant) {
        defaultTenant = await this.tenantsRepository.save(this.tenantsRepository.create({
          name: 'مركز علم التعليمي',
          code: 'C001',
          domain: 'center1.com',
          isActive: true,
        }));
        console.log('✅ Default Tenant created: مركز علم التعليمي (C001)');
      }
    } catch (e) {
      console.log('Tenant init check skipped:', e);
    }
  }

  async create(createTenantDto: any): Promise<Tenant> {
    const tenant = this.tenantsRepository.create(createTenantDto as Partial<Tenant>);
    return this.tenantsRepository.save(tenant);
  }

  async getOrCreateDefaultTenant(): Promise<Tenant> {
    const all = await this.tenantsRepository.find({ order: { createdAt: 'ASC' } });
    if (all.length > 0) return all[0];
    return this.tenantsRepository.save(this.tenantsRepository.create({
      name: 'مركز علم التعليمي',
      code: 'C001',
      domain: 'center1.com',
      isActive: true,
    }));
  }

  async findByCode(code?: string): Promise<Tenant> {
    if (code) {
      const found = await this.tenantsRepository.findOne({ where: { code } });
      if (found) return found;
    }
    return this.getOrCreateDefaultTenant();
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
    let tenant: Tenant | null = null;
    if (id === 'me' || id === 'current') {
      const all = await this.tenantsRepository.find();
      tenant = all[0];
    } else {
      tenant = await this.tenantsRepository.findOne({ where: { id } });
    }

    if (!tenant) {
      // If no tenant found, pick or create default
      const all = await this.tenantsRepository.find();
      if (all.length > 0) tenant = all[0];
      else {
        tenant = this.tenantsRepository.create({ name: 'مركز علم التعليمي' });
      }
    }

    Object.assign(tenant, settings);
    return this.tenantsRepository.save(tenant);
  }
}