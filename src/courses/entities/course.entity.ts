import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Subject } from '../../subjects/entities/subject.entity';
import { User } from '../../users/entities/user.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g., 'Math Grade 10 - Semester 1'

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ nullable: true })
  subjectId: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @Column({ nullable: true })
  teacherId: string; // The teacher responsible for this course

  @ManyToOne(() => User)
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @Column({ type: 'decimal', default: 0 })
  price: number;

  @Column({ nullable: true })
  gradeLevel: string; // e.g., 'الصف الأول الثانوي'

  @Column({ nullable: true })
  educationLevel: string; // e.g., 'primary', 'middle', 'high', 'university'

  @Column({ type: 'int', default: 8 })
  sessionsCount: number; // عدد الحصص بالدورة/الشهر

  @Column({ nullable: true })
  scheduleTiming: string; // توقيت ومواعيد الحصص (e.g., الأحد والأربعاء من 04:00 م إلى 06:00 م)

  @Column({ nullable: true, type: 'decimal' })
  adminRevenueSharePercentage: number; // نسبة الإدارة المخصصة في هذا الكورس/المادة العلمية

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
