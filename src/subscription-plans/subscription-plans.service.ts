import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPlan } from './entities/subscription-plan.entity';

@Injectable()
export class SubscriptionPlansService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private repo: Repository<SubscriptionPlan>,
  ) {}

  create(data: any): Promise<SubscriptionPlan> {
    const plan = this.repo.create(data as Partial<SubscriptionPlan>);
    return this.repo.save(plan);
  }

  findAll(): Promise<SubscriptionPlan[]> {
    return this.repo.find({ order: { defaultCost: 'ASC' } });
  }

  remove(id: string): Promise<import('typeorm').DeleteResult> {
    return this.repo.delete(id);
  }
}
