import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async remove(id: string, tenantId: string): Promise<void> {
    const course = await this.coursesRepo.findOne({ where: { id, tenantId } });
    if (!course) throw new NotFoundException('Course not found or access denied');
    await this.coursesRepo.delete(id);
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

