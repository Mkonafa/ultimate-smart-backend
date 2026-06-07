import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { Tenant } from './tenants/entities/tenant.entity';
import { User, UserRole } from './users/entities/user.entity';
import { Subject } from './subjects/entities/subject.entity';
import { Course } from './courses/entities/course.entity';
import { Group } from './groups/entities/group.entity';
import { CourseEnrollment } from './courses/entities/course_enrollment.entity';
import { Attendance } from './attendance/entities/attendance.entity';
import { Exam } from './exams/entities/exam.entity';
import { ExamResult } from './exams/entities/exam-result.entity';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  const tenantRepo = dataSource.getRepository(Tenant);
  const userRepo = dataSource.getRepository(User);

  // 1. Create a Super Admin
  const hashedPass = await bcrypt.hash('123456', 10);
  let superAdmin = await userRepo.findOne({ where: { email: 'super@admin.com' } });
  if (!superAdmin) {
    superAdmin = userRepo.create({
      email: 'super@admin.com',
      password: hashedPass,
      role: UserRole.SUPER_ADMIN,
    });
    await userRepo.save(superAdmin);
    console.log('✅ Super Admin created: super@admin.com / 123456');
  }

  // 2. Create a Tenant (Center)
  let center = await tenantRepo.findOne({ where: { domain: 'center1.com' } });
  if (!center) {
    center = tenantRepo.create({
      name: 'أكاديمية النجاح',
      domain: 'center1.com',
    });
    await tenantRepo.save(center);
    console.log('✅ Center created: أكاديمية النجاح');
  }

  // 3. Create a Center Admin
  let centerAdmin = await userRepo.findOne({ where: { email: 'admin@center1.com' } });
  if (!centerAdmin) {
    centerAdmin = userRepo.create({
      email: 'admin@center1.com',
      password: hashedPass,
      role: UserRole.CENTER_ADMIN,
      tenant: center,
      tenantId: center.id,
    });
    await userRepo.save(centerAdmin);
    console.log('✅ Center Admin created: admin@center1.com / 123456');
  }

  // 4. Create a Teacher
  let teacher = await userRepo.findOne({ where: { email: 'teacher@center1.com' } });
  if (!teacher) {
    teacher = userRepo.create({
      email: 'teacher@center1.com',
      password: hashedPass,
      role: UserRole.TEACHER,
      tenant: center,
      tenantId: center.id,
      fullName: 'أ. أحمد علي',
    });
    await userRepo.save(teacher);
    console.log('✅ Teacher created: teacher@center1.com / 123456');
  }

  // 4.5. Create a Parent
  let parentUser = await userRepo.findOne({ where: { email: 'parent@center1.com' } });
  if (!parentUser) {
    parentUser = userRepo.create({
      email: 'parent@center1.com',
      password: hashedPass,
      role: UserRole.PARENT,
      tenant: center,
      tenantId: center.id,
      fullName: 'محمود كنافة (ولي أمر)',
      phone: '01098765432',
    });
    await userRepo.save(parentUser);
    console.log('✅ Parent created: parent@center1.com / 123456');
  }

  // 5. Create a Student
  let student = await userRepo.findOne({ where: { email: 'student@center1.com' } });
  if (!student) {
    student = userRepo.create({
      email: 'student@center1.com',
      password: hashedPass,
      role: UserRole.STUDENT,
      tenant: center,
      tenantId: center.id,
      fullName: 'أحمد محمود كنافة',
      studentCode: '100100',
      educationLevel: 'high',
      parentPhone: '01098765432',
      address: 'القاهرة، مصر',
      parentId: parentUser.id,
    });
    await userRepo.save(student);
    console.log('✅ Student created: student@center1.com / 123456 (Code: 100100)');
  } else if (!student.parentId && parentUser) {
    student.parentId = parentUser.id;
    await userRepo.save(student);
    console.log('✅ Student linked to Parent');
  }

  // 6. Create Subjects
  const subjectRepo = dataSource.getRepository(Subject);
  let mathSubject = await subjectRepo.findOne({ where: { name: 'الرياضيات', tenantId: center.id } });
  if (!mathSubject) {
    mathSubject = subjectRepo.create({
      name: 'الرياضيات',
      description: 'منهج الرياضيات للمرحلة الثانوية',
      tenantId: center.id,
    });
    await subjectRepo.save(mathSubject);
    console.log('✅ Subject created: الرياضيات');
  }

  let physicsSubject = await subjectRepo.findOne({ where: { name: 'الفيزياء', tenantId: center.id } });
  if (!physicsSubject) {
    physicsSubject = subjectRepo.create({
      name: 'الفيزياء',
      description: 'منهج الفيزياء للمرحلة الثانوية',
      tenantId: center.id,
    });
    await subjectRepo.save(physicsSubject);
    console.log('✅ Subject created: الفيزياء');
  }

  // 7. Create Courses
  const courseRepo = dataSource.getRepository(Course);
  let mathCourse = await courseRepo.findOne({ where: { name: 'رياضيات - الصف الأول الثانوي', tenantId: center.id } });
  if (!mathCourse) {
    mathCourse = courseRepo.create({
      name: 'رياضيات - الصف الأول الثانوي',
      tenantId: center.id,
      subjectId: mathSubject.id,
      teacherId: teacher.id,
      price: 150,
    });
    await courseRepo.save(mathCourse);
    console.log('✅ Course created: رياضيات - الصف الأول الثانوي');
  }

  let physicsCourse = await courseRepo.findOne({ where: { name: 'فيزياء - الصف الأول الثانوي', tenantId: center.id } });
  if (!physicsCourse) {
    physicsCourse = courseRepo.create({
      name: 'فيزياء - الصف الأول الثانوي',
      tenantId: center.id,
      subjectId: physicsSubject.id,
      teacherId: teacher.id,
      price: 150,
    });
    await courseRepo.save(physicsCourse);
    console.log('✅ Course created: فيزياء - الصف الأول الثانوي');
  }

  // 8. Create Groups
  const groupRepo = dataSource.getRepository(Group);
  let mathGroup = await groupRepo.findOne({ where: { name: 'مجموعة أ - رياضيات', tenantId: center.id } });
  if (!mathGroup) {
    mathGroup = groupRepo.create({
      name: 'مجموعة أ - رياضيات',
      tenantId: center.id,
      courseId: mathCourse.id,
    });
    await groupRepo.save(mathGroup);
    console.log('✅ Group created: مجموعة أ - رياضيات');
  }

  let physicsGroup = await groupRepo.findOne({ where: { name: 'مجموعة ب - فيزياء', tenantId: center.id } });
  if (!physicsGroup) {
    physicsGroup = groupRepo.create({
      name: 'مجموعة ب - فيزياء',
      tenantId: center.id,
      courseId: physicsCourse.id,
    });
    await groupRepo.save(physicsGroup);
    console.log('✅ Group created: مجموعة ب - فيزياء');
  }

  // 9. Create Enrollments
  const enrollmentRepo = dataSource.getRepository(CourseEnrollment);
  let mathEnrollment = await enrollmentRepo.findOne({ where: { studentId: student.id, courseId: mathCourse.id } });
  if (!mathEnrollment) {
    mathEnrollment = enrollmentRepo.create({
      studentId: student.id,
      courseId: mathCourse.id,
      status: 'ACTIVE',
      remainingTrialSessions: 0,
      activationDate: new Date(),
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
    await enrollmentRepo.save(mathEnrollment);
    console.log('✅ Enrollment created: student in math');
  }

  let physicsEnrollment = await enrollmentRepo.findOne({ where: { studentId: student.id, courseId: physicsCourse.id } });
  if (!physicsEnrollment) {
    physicsEnrollment = enrollmentRepo.create({
      studentId: student.id,
      courseId: physicsCourse.id,
      status: 'TRIAL',
      remainingTrialSessions: 2,
    });
    await enrollmentRepo.save(physicsEnrollment);
    console.log('✅ Enrollment created: student in physics (trial)');
  }

  // 10. Create Attendance Records
  const attendanceRepo = dataSource.getRepository(Attendance);
  const mathAttendanceCount = await attendanceRepo.count({ where: { studentId: student.id, groupId: mathGroup.id } });
  if (mathAttendanceCount === 0) {
    const dates = ['2026-06-01', '2026-05-28', '2026-05-25'];
    const statuses = ['PRESENT', 'PRESENT', 'ABSENT'];
    for (let i = 0; i < dates.length; i++) {
      await attendanceRepo.save(
        attendanceRepo.create({
          tenantId: center.id,
          groupId: mathGroup.id,
          studentId: student.id,
          date: dates[i],
          status: statuses[i],
        }),
      );
    }
    console.log('✅ Attendance records created for math');
  }

  const physicsAttendanceCount = await attendanceRepo.count({ where: { studentId: student.id, groupId: physicsGroup.id } });
  if (physicsAttendanceCount === 0) {
    await attendanceRepo.save(
      attendanceRepo.create({
        tenantId: center.id,
        groupId: physicsGroup.id,
        studentId: student.id,
        date: '2026-06-03',
        status: 'PRESENT',
      }),
    );
    console.log('✅ Attendance records created for physics');
  }

  // 11. Create Exams and Exam Results
  const examRepo = dataSource.getRepository(Exam);
  const examResultRepo = dataSource.getRepository(ExamResult);

  const mathExamCount = await examRepo.count({ where: { tenantId: center.id, courseId: mathCourse.id } });
  if (mathExamCount === 0) {
    const exam1 = await examRepo.save(
      examRepo.create({
        name: 'اختبار شهر مايو - رياضيات',
        maxScore: 100,
        date: '2026-05-20',
        courseId: mathCourse.id,
        tenantId: center.id,
      })
    );
    await examResultRepo.save(
      examResultRepo.create({
        examId: exam1.id,
        studentId: student.id,
        score: 92,
        remarks: 'أداء ممتاز ورائع! استمر في هذا المستوى المتفوق.',
        tenantId: center.id,
      })
    );

    const exam2 = await examRepo.save(
      examRepo.create({
        name: 'اختبار قصير 1 - رياضيات',
        maxScore: 20,
        date: '2026-05-10',
        courseId: mathCourse.id,
        tenantId: center.id,
      })
    );
    await examResultRepo.save(
      examResultRepo.create({
        examId: exam2.id,
        studentId: student.id,
        score: 19,
        remarks: 'إجابة ممتازة.',
        tenantId: center.id,
      })
    );
    console.log('✅ Exams and results created for math');
  }

  const physicsExamCount = await examRepo.count({ where: { tenantId: center.id, courseId: physicsCourse.id } });
  if (physicsExamCount === 0) {
    const exam1 = await examRepo.save(
      examRepo.create({
        name: 'اختبار شهر مايو - فيزياء',
        maxScore: 100,
        date: '2026-05-22',
        courseId: physicsCourse.id,
        tenantId: center.id,
      })
    );
    await examResultRepo.save(
      examResultRepo.create({
        examId: exam1.id,
        studentId: student.id,
        score: 78,
        remarks: 'جيد جدًا، ولكن يحتاج إلى زيادة التركيز في مسائل الديناميكا.',
        tenantId: center.id,
      })
    );
    console.log('✅ Exams and results created for physics');
  }

  await app.close();
  console.log('🎉 Seeding completed successfully!');
}

bootstrap();
