import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Subject } from './entities/subject.entity';
import { Course } from '../courses/entities/course.entity';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private subjectsRepo: Repository<Subject>,
    @InjectRepository(Course)
    private coursesRepo: Repository<Course>,
    private dataSource: DataSource,
  ) {}

  async create(data: Partial<Subject>, tenantId: string): Promise<Subject> {
    const subject = this.subjectsRepo.create({ ...data, tenantId });
    return this.subjectsRepo.save(subject);
  }

  async findAllByTenant(tenantId: string): Promise<Subject[]> {
    return this.subjectsRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async bulkCreate(data: { name: string; educationLevel: string; gradeLevels: string[]; description?: string }, tenantId: string): Promise<Subject[]> {
    const subjectsToCreate: Subject[] = [];
    for (const grade of data.gradeLevels) {
      const existing = await this.subjectsRepo.findOne({
        where: { name: data.name, educationLevel: data.educationLevel, gradeLevel: grade, tenantId },
      });
      if (!existing) {
        const sub = this.subjectsRepo.create({
          name: data.name,
          educationLevel: data.educationLevel,
          gradeLevel: grade,
          description: data.description,
          tenantId,
        });
        subjectsToCreate.push(sub);
      }
    }
    if (subjectsToCreate.length > 0) {
      return this.subjectsRepo.save(subjectsToCreate);
    }
    return [];
  }

  async update(id: string, data: Partial<Subject>, tenantId: string): Promise<Subject> {
    const subject = await this.subjectsRepo.findOne({ where: { id, tenantId } });
    if (!subject) throw new NotFoundException('Subject not found or access denied');
    Object.assign(subject, data);
    return this.subjectsRepo.save(subject);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const subject = await this.subjectsRepo.findOne({ where: { id, tenantId } });
    if (!subject) throw new NotFoundException('Subject not found or access denied');

    const queryRunner = this.dataSource.createQueryRunner();
    try {
      const linkedCourses = await this.coursesRepo.find({ where: { subjectId: id } });
      for (const c of linkedCourses) {
        await queryRunner.query(`DELETE FROM "course_enrollments" WHERE "courseId" = ?`, [c.id]);
        await queryRunner.query(`DELETE FROM "course_materials" WHERE "courseId" = ?`, [c.id]);
        await queryRunner.query(`DELETE FROM "exams" WHERE "courseId" = ?`, [c.id]);
        await queryRunner.query(`DELETE FROM "attendance" WHERE "courseId" = ?`, [c.id]);
        await queryRunner.query(`DELETE FROM "groups" WHERE "courseId" = ?`, [c.id]);
      }
      await queryRunner.query(`DELETE FROM "courses" WHERE "subjectId" = ?`, [id]);
    } catch (e) {
      console.log('FK subject cleanup notice:', e);
    } finally {
      await queryRunner.release();
    }

    await this.subjectsRepo.delete(id);
  }
}

