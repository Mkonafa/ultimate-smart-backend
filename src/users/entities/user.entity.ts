import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CENTER_ADMIN = 'CENTER_ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  email: string;

  @Column({ unique: true, nullable: true })
  phone: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  googleId?: string;

  @Column({ default: 'email' })
  provider: string; // 'email', 'nationalId', 'code'

  @Column({
    type: 'varchar',
    default: UserRole.STUDENT,
  })
  role: string;

  // --- Auth Codes & Security ---
  @Column({ unique: true, nullable: true })
  nationalId: string; // Used for Student login

  @Column({ unique: true, nullable: true })
  adminCode: string; // Used for Center Admin login

  @Column({ unique: true, nullable: true })
  teacherCode: string; // Used for Teacher login

  @Column({ nullable: true })
  deviceId: string; // For Device Binding (ربط الجهاز)
  // -----------------------------

  // --- Student Full Profile Fields ---
  @Column({ nullable: true })
  fullName: string;

  @Column({ unique: true, nullable: true })
  studentCode: string; // The generated code for QR (not necessarily login anymore, but can be)

  @Column({ unique: true, nullable: true })
  parentCode: string; // The generated code for parent login

  @Column({ nullable: true })
  educationLevel: string; // e.g., 'primary', 'middle', 'high', 'university'

  @Column({ nullable: true })
  parentPhone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ default: false })
  isQrEnabled: boolean; // Setting to toggle QR vs Manual per student
  // -----------------------------------

  @Column({ nullable: true })
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.users, { nullable: true })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ nullable: true })
  parentId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: User;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  fcmToken?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
