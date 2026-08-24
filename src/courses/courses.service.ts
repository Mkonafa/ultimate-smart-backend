import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Course } from './entities/course.entity';
import { User } from '../users/entities/user.entity';

import { CourseMaterial } from './entities/course_material.entity';
import { CourseEnrollment, EnrollmentStatus } from './entities/course_enrollment.entity';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private coursesRepo: Repository<Course>,
    @InjectRepository(CourseEnrollment)
    private enrollmentRepo: Repository<CourseEnrollment>,
    @InjectRepository(CourseMaterial)
    private materialRepo: Repository<CourseMaterial>,
    private dataSource: DataSource,
  ) {}

  async create(data: Partial<Course>, tenantId: string): Promise<Course> {
    const course = this.coursesRepo.create({ ...data, tenantId });
    return this.coursesRepo.save(course);
  }

  async findAllByTenant(tenantId: string): Promise<Course[]> {
    return this.coursesRepo.find({ 
      where: { tenantId }, 
      relations: { subject: true, teacher: true }, // Fetch relationships
      order: { createdAt: 'DESC' } 
    });
  }

  async update(id: string, data: Partial<Course>, tenantId: string): Promise<Course> {
    const course = await this.coursesRepo.findOne({ where: { id, tenantId } });
    if (!course) throw new NotFoundException('Course not found or access denied');
    Object.assign(course, data);
    return this.coursesRepo.save(course);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const course = await this.coursesRepo.findOne({ where: { id, tenantId } });
    if (!course) throw new NotFoundException('Course not found or access denied');

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.query(`PRAGMA foreign_keys = OFF;`).catch(() => {});
      await queryRunner.query(`DELETE FROM "course_enrollments" WHERE "courseId" = ? OR "course_id" = ?`, [id, id]).catch(() => {});
      await queryRunner.query(`DELETE FROM "course_materials" WHERE "courseId" = ? OR "course_id" = ?`, [id, id]).catch(() => {});
      await queryRunner.query(`DELETE FROM "exam_results" WHERE "examId" IN (SELECT "id" FROM "exams" WHERE "courseId" = ? OR "course_id" = ?)`, [id, id]).catch(() => {});
      await queryRunner.query(`DELETE FROM "exams" WHERE "courseId" = ? OR "course_id" = ?`, [id, id]).catch(() => {});
      await queryRunner.query(`DELETE FROM "attendance" WHERE "courseId" = ? OR "course_id" = ?`, [id, id]).catch(() => {});
      await queryRunner.query(`DELETE FROM "groups" WHERE "courseId" = ? OR "course_id" = ?`, [id, id]).catch(() => {});
      await queryRunner.query(`DELETE FROM "courses" WHERE "id" = ?`, [id]);
    } catch (e) {
      console.log('Cascade remove course error:', e);
      await this.coursesRepo.delete(id);
    } finally {
      await queryRunner.query(`PRAGMA foreign_keys = ON;`).catch(() => {});
      await queryRunner.release();
    }
  }

  async removeAll(tenantId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.query(`PRAGMA foreign_keys = OFF;`).catch(() => {});
      const courses = await this.coursesRepo.find({ where: { tenantId } });
      for (const c of courses) {
        await queryRunner.query(`DELETE FROM "course_enrollments" WHERE "courseId" = ? OR "course_id" = ?`, [c.id, c.id]).catch(() => {});
        await queryRunner.query(`DELETE FROM "course_materials" WHERE "courseId" = ? OR "course_id" = ?`, [c.id, c.id]).catch(() => {});
        await queryRunner.query(`DELETE FROM "exam_results" WHERE "examId" IN (SELECT "id" FROM "exams" WHERE "courseId" = ? OR "course_id" = ?)`, [c.id, c.id]).catch(() => {});
        await queryRunner.query(`DELETE FROM "exams" WHERE "courseId" = ? OR "course_id" = ?`, [c.id, c.id]).catch(() => {});
        await queryRunner.query(`DELETE FROM "attendance" WHERE "courseId" = ? OR "course_id" = ?`, [c.id, c.id]).catch(() => {});
        await queryRunner.query(`DELETE FROM "groups" WHERE "courseId" = ? OR "course_id" = ?`, [c.id, c.id]).catch(() => {});
      }
      await queryRunner.query(`DELETE FROM "courses" WHERE "tenantId" = ?`, [tenantId]);
    } catch (e) {
      console.log('Cascade removeAll courses error:', e);
    } finally {
      await queryRunner.query(`PRAGMA foreign_keys = ON;`).catch(() => {});
      await queryRunner.release();
    }
  }

  async enrollStudent(courseId: string, studentId: string): Promise<CourseEnrollment> {
    const existing = await this.enrollmentRepo.findOne({ where: { courseId, studentId } });
    if (existing) {
      return existing; // Already enrolled
    }

    const enrollment = this.enrollmentRepo.create({
      courseId,
      studentId,
      status: EnrollmentStatus.TRIAL,
      remainingTrialSessions: 3, // Default trial sessions
    });
    return this.enrollmentRepo.save(enrollment);
  }

  async activateEnrollment(enrollmentId: string, days: number): Promise<CourseEnrollment> {
    const enrollment = await this.enrollmentRepo.findOne({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);

    enrollment.status = EnrollmentStatus.ACTIVE;
    enrollment.activationDate = new Date();
    enrollment.expirationDate = expirationDate;
    
    return this.enrollmentRepo.save(enrollment);
  }

  async addMaterial(courseId: string, data: Partial<CourseMaterial>): Promise<CourseMaterial> {
    const course = await this.coursesRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    const material = this.materialRepo.create({ ...data, courseId });
    return this.materialRepo.save(material);
  }

  async getMaterials(courseId: string): Promise<CourseMaterial[]> {
    return this.materialRepo.find({ where: { courseId }, order: { createdAt: 'DESC' } });
  }

  async findStudentEnrollments(studentId: string): Promise<CourseEnrollment[]> {
    return this.enrollmentRepo.find({
      where: { studentId },
      relations: {
        course: {
          teacher: true,
          subject: true,
        },
      },
    });
  }

  async findEnrolledStudents(courseId: string, tenantId: string): Promise<User[]> {
    const enrollments = await this.enrollmentRepo.find({
      where: { courseId, course: { tenantId } },
      relations: { student: true },
    });
    return enrollments.map((e) => e.student);
  }

  async findAllEnrollmentsByTenant(tenantId: string): Promise<CourseEnrollment[]> {
    return this.enrollmentRepo.find({
      where: { course: { tenantId } },
      relations: { student: true, course: true },
      order: { createdAt: 'DESC' },
    });
  }
}

