import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN')
  @Post()
  create(@Body() data: any, @Request() req) {
    const tenantId = req.user.tenantId; // User's tenant
    return this.coursesService.create(data, tenantId);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN', 'TEACHER', 'STUDENT')
  @Get()
  findAll(@Request() req) {
    const tenantId = req.user.tenantId;
    return this.coursesService.findAllByTenant(tenantId);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.coursesService.remove(id, tenantId);
  }

  @Roles('STUDENT', 'CENTER_ADMIN')
  @Post(':id/enroll')
  enrollStudent(@Param('id') id: string, @Request() req) {
    // If student, use their id. If admin, expect studentId in body (omitted here for simplicity, assuming student enrolls themselves)
    const studentId = req.user.sub;
    return this.coursesService.enrollStudent(id, studentId);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN')
  @Post('enrollment/:id/activate')
  activateEnrollment(@Param('id') id: string, @Body('days') days: number) {
    return this.coursesService.activateEnrollment(id, days || 30);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN', 'TEACHER')
  @Post(':id/materials')
  addMaterial(@Param('id') id: string, @Body() data: any) {
    // Note: Teacher check logic for tenant settings should go here or in a guard
    return this.coursesService.addMaterial(id, data);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN', 'TEACHER', 'STUDENT')
  @Get(':id/materials')
  getMaterials(@Param('id') id: string) {
    return this.coursesService.getMaterials(id);
  }

  @Roles('STUDENT')
  @Get('my-courses')
  findMyCourses(@Request() req) {
    const studentId = req.user.userId || req.user.sub;
    return this.coursesService.findStudentEnrollments(studentId);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN', 'TEACHER')
  @Get(':id/students')
  findEnrolledStudents(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.coursesService.findEnrolledStudents(id, tenantId);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN')
  @Get('enrollments/all')
  findAllEnrollments(@Request() req) {
    const tenantId = req.user.tenantId;
    return this.coursesService.findAllEnrollmentsByTenant(tenantId);
  }
}

