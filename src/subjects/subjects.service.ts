import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from './entities/subject.entity';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private subjectsRepo: Repository<Subject>,
  ) {}

  async create(data: Partial<Subject>, tenantId: string): Promise<Subject> {
    const subject = this.subjectsRepo.create({ ...data, tenantId });
    return this.subjectsRepo.save(subject);
  }

  async findAllByTenant(tenantId: string): Promise<Subject[]> {
    return this.subjectsRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const subject = await this.subjectsRepo.findOne({ where: { id, tenantId } });
    if (!subject) throw new NotFoundException('Subject not found or access denied');
    await this.subjectsRepo.delete(id);
  }
}

