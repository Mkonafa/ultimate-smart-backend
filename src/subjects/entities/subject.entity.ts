import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g., 'أحياء', 'فيزياء'

  @Column({ nullable: true })
  educationLevel: string; // e.g., 'primary', 'middle', 'high', 'university'

  @Column({ nullable: true })
  gradeLevel: string; // e.g., 'الصف الأول الثانوي'

  @Column({ nullable: true })
  description: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
