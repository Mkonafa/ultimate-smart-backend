import { Controller, Get, Post, Body, UseGuards, Request, Param, ForbiddenException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles('STUDENT')
  @Get('my-attendance')
  findMyAttendance(@Request() req) {
    const studentId = req.user.userId || req.user.sub;
    return this.attendanceService.findStudentAttendance(studentId);
  }

  @Roles('PARENT')
  @Get('student/:studentId')
  async findStudentAttendanceForParent(@Param('studentId') studentId: string, @Request() req) {
    const parentId = req.user.userId || req.user.sub;
    const student = await this.attendanceService.findStudentParent(studentId);
    if (!student || student.parentId !== parentId) {
      throw new ForbiddenException('غير مصرح لك بالوصول لبيانات هذا الطالب');
    }
    return this.attendanceService.findStudentAttendance(studentId);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN', 'TEACHER')
  @Post('submit')
  submitAttendance(@Body() body: { courseId: string; date: string; records: { studentId: string; status: string }[] }, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.attendanceService.submitAttendance(body.courseId, body.date, body.records, tenantId);
  }
}
