import { Controller, Get, Post, Body, UseGuards, Request, Query, Param, ForbiddenException } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Roles('STUDENT')
  @Get('my-grades')
  findMyGrades(@Request() req) {
    const studentId = req.user.userId || req.user.sub;
    return this.examsService.findStudentGrades(studentId);
  }

  @Roles('PARENT')
  @Get('student/:studentId')
  async findStudentGradesForParent(@Param('studentId') studentId: string, @Request() req) {
    const parentId = req.user.userId || req.user.sub;
    const student = await this.examsService.findStudentParent(studentId);
    if (!student || student.parentId !== parentId) {
      throw new ForbiddenException('غير مصرح لك بالوصول لبيانات هذا الطالب');
    }
    return this.examsService.findStudentGrades(studentId);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN', 'TEACHER')
  @Post('create')
  createExam(
    @Body() body: { courseId: string; name: string; maxScore: number; date: string },
    @Request() req
  ) {
    const tenantId = req.user.tenantId;
    return this.examsService.createExam(tenantId, body.courseId, body.name, body.maxScore, body.date);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN', 'TEACHER')
  @Post('submit-results')
  submitResults(
    @Body() body: { examId: string; results: { studentId: string; score: number; remarks?: string }[] },
    @Request() req
  ) {
    const tenantId = req.user.tenantId;
    return this.examsService.submitResults(tenantId, body.examId, body.results);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN', 'TEACHER')
  @Get('course')
  findCourseExams(@Query('courseId') courseId: string, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.examsService.findCourseExams(tenantId, courseId);
  }

  // --- Electronic Exams Endpoints ---

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN', 'TEACHER')
  @Post(':examId/questions')
  addQuestions(
    @Param('examId') examId: string,
    @Body('questions') questions: any[],
  ) {
    return this.examsService.addQuestions(examId, questions);
  }

  @Roles('SUPER_ADMIN', 'CENTER_ADMIN', 'TEACHER', 'STUDENT')
  @Get(':examId')
  getExamWithQuestions(@Param('examId') examId: string, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.examsService.getExamWithQuestions(examId, tenantId);
  }

  @Roles('STUDENT')
  @Post(':examId/submit')
  submitElectronicExam(
    @Param('examId') examId: string,
    @Body('answers') answers: { questionId: string; answer: string }[],
    @Request() req
  ) {
    const tenantId = req.user.tenantId;
    const studentId = req.user.userId || req.user.sub;
    return this.examsService.autoGradeExam(tenantId, examId, studentId, answers);
  }
}
