import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, DeleteDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true, unique: true })
  domain: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 'center' })
  entityType: string; // 'school', 'center', 'teacher'

  @Column('simple-array', { nullable: true })
  phones: string[];

  @Column({ nullable: true })
  subscriptionPlanName: string;

  @Column({ nullable: true, type: 'decimal' })
  subscriptionCost: number;

  @Column({ nullable: true })
  subscriptionDurationDays: number;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  whatsappLink: string;

  @Column({ nullable: true })
  facebookLink: string;

  @Column({ nullable: true })
  adminSuspensionReason: string;

  @Column({ nullable: true })
  publicMaintenanceMessage: string;

  @Column({ nullable: true })
  subscriptionStartDate: Date;

  @Column({ nullable: true })
  subscriptionEndDate: Date;

  @Column({ default: false })
  isTrial: boolean;

  // --- Features Toggles ---
  @Column({ default: true })
  canTeacherCreateCourse: boolean;

  @Column({ default: true })
  canTeacherUploadMaterial: boolean;
  
  // --- Global Modules (Super Admin Controlled) ---
  @Column({ default: false })
  hasParentPortal: boolean;

  @Column({ default: false })
  hasExamsModule: boolean;

  @Column({ default: false })
  hasFinancialModule: boolean;

  @Column({ default: false })
  hasChatModule: boolean;
  // ------------------------

  // --- Device Binding Feature ---
  @Column({ default: false })
  hasDeviceBindingFeature: boolean; // Super Admin configures this

  @Column({ default: false })
  isDeviceBindingEnabled: boolean; // Center Admin toggles this
  // ------------------------

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
