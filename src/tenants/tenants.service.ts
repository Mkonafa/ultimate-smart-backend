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
      await this.tenantsRepository
        .createQueryBuilder()
        .update(Tenant)
        .set({ name: 'مركز علم' })
        .where('name LIKE :oldName', { oldName: '%النجاح%' })
        .execute();
    } catch (e) {
      console.log('Tenant name auto-update skipped:', e);
    }
  }

  async create(createTenantDto: any): Promise<Tenant> {
    const tenant = this.tenantsRepository.create(createTenantDto as Partial<Tenant>);
    return this.tenantsRepository.save(tenant);
  }

  async findByCode(code: string): Promise<Tenant | null> {
    if (!code) {
      const all = await this.tenantsRepository.find({ order: { createdAt: 'ASC' } });
      return all.length > 0 ? all[0] : null;
    }
    const found = await this.tenantsRepository.findOne({ where: { code } });
    if (found) return found;
    const all = await this.tenantsRepository.find({ order: { createdAt: 'ASC' } });
    return all.length > 0 ? all[0] : null;
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