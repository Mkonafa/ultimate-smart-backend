import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum NotificationType {
  GLOBAL = 'GLOBAL', // To all users in the tenant
  COURSE = 'COURSE', // To users enrolled in a specific course
  INDIVIDUAL = 'INDIVIDUAL', // To a specific user
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  body: string;

  @Column({
    type: 'varchar',
    default: NotificationType.GLOBAL,
  })
  type: string;

  @Column({ nullable: true })
  targetCourseId?: string;

  @Column({ nullable: true })
  targetUserId?: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
