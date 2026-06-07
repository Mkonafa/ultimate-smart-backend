import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { Course } from './entities/course.entity';
import { CourseEnrollment } from './entities/course_enrollment.entity';
import { CourseMaterial } from './entities/course_material.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Course, CourseEnrollment, CourseMaterial])],
  providers: [CoursesService],
  controllers: [CoursesController],
  exports: [CoursesService],
})
export class CoursesModule {}
