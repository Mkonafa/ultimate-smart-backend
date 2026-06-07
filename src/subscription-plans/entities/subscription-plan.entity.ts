import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'decimal' })
  defaultCost: number;

  @Column()
  durationDays: number;

  @Column({ nullable: true })
  features: string; // JSON or simple string describing the plan

  @CreateDateColumn()
  createdAt: Date;
}
