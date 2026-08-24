import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CENTER_ADMIN = 'CENTER_ADMIN',
  ADMIN_ASSISTANT = 'ADMIN_ASSISTANT',
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

  @Column({ nullable: true })
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
  @Column({ nullable: true })
  nationalId: string; // Used for Student login

  @Column({ nullable: true })
  adminCode: string; // Used for Center Admin login

  @Column({ nullable: true })
  teacherCode: string; // Used for Teacher login

  @Column({ nullable: true })
  deviceId: string; // For Device Binding (ربط الجهاز)
  // -----------------------------

  // --- Student Full Profile Fields ---
  @Column({ nullable: true })
  fullName: string;

  @Column({ nullable: true })
  studentCode: string; // The generated code for QR (not necessarily login anymore, but can be)

  @Column({ nullable: true })
  parentCode: string; // The generated code for parent login

  @Column({ nullable: true })
  educationLevel: string; // e.g., 'primary', 'middle', 'high', 'university'

  @Column({ nullable: true })
  parentPhone: string;

  @Column({ nullable: true })
  fatherPhone: string;

  @Column({ nullable: true })
  motherPhone: string;

  @Column({ nullable: true })
  fatherName: string;

  @Column({ nullable: true })
  motherName: string;

  @Column({ nullable: true })
  fatherNationalId: string;

  @Column({ nullable: true })
  motherNationalId: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  birthDate: string; // تاريخ الميلاد المستخلص من الرقم القومي

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

  @Column({ default: false })
  isRestricted: boolean; // تقييد دور/نشاط الحساب مستقبلاً

  // --- Admin Assistant Fields ---
  @Column({ nullable: true })
  assistantRoleTitle: string; // مسمى الدور المنوط للمساعد

  @Column({ nullable: true })
  specialty: string; // اختصاص ودور المساعد

  @Column({ nullable: true, type: 'decimal' })
  monthlySalary: number; // المبلغ الشهري للمساعد

  // --- Teacher Pricing & Admin Percentage Fields ---
  @Column('simple-array', { nullable: true })
  teachingStages: string[]; // المراحل التعليمية المسندة للمدرس (مثلاً: ابتدائي، إعدادي، ثانوي)

  @Column('simple-array', { nullable: true })
  teachingSubjects: string[]; // المواد التعليمية المسندة للمدرس في المراحل

  @Column({ nullable: true, type: 'decimal' })
  adminRevenueSharePercentage: number; // نسبة الإدارة في قيمة المادة للمدرس

  @Column({ nullable: true, type: 'decimal' })
  subjectPrice: number; // سعر المادة التعليمية لكل مدرس

  @Column({ nullable: true })
  fcmToken?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
