import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { Group } from '../groups/entities/group.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepo: Repository<Attendance>,
  ) {}

  async findStudentAttendance(studentId: string): Promise<Attendance[]> {
    return this.attendanceRepo.find({
      where: { studentId },
      relations: {
        group: {
          course: {
            subject: true,
          },
        },
      },
      order: { date: 'DESC' },
    });
  }

  async submitAttendance(courseId: string, date: string, records: { studentId: string; status: string }[], tenantId: string): Promise<any> {
    const groupRepo = this.attendanceRepo.manager.getRepository(Group);
    let group = await groupRepo.findOne({ where: { courseId, tenantId } });
    if (!group) {
      group = groupRepo.create({
        name: 'المجموعة العامة',
        courseId,
        tenantId,
      });
      await groupRepo.save(group);
    }

    const savedRecords: Attendance[] = [];
    for (const record of records) {
      let attendance = await this.attendanceRepo.findOne({
        where: { studentId: record.studentId, groupId: group.id, date }
      });
      
      if (attendance) {
        attendance.status = record.status;
      } else {
        attendance = this.attendanceRepo.create({
          tenantId,
          groupId: group.id,
          studentId: record.studentId,
          date,
          status: record.status,
        });
      }
      savedRecords.push(await this.attendanceRepo.save(attendance));
    }
    return { success: true, count: savedRecords.length };
  }

  async scanQrAttendance(code: string, tenantId: string): Promise<any> {
    const userRepo = this.attendanceRepo.manager.getRepository(User);
    const student = await userRepo.findOne({
      where: [
        { studentCode: code, tenantId },
        { nationalId: code, tenantId },
        { id: code, tenantId },
      ],
    });

    if (!student) {
      throw new NotFoundException('الطالب غير مسجل بالمركز أو الكود غير صحيح.');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    let attendance = await this.attendanceRepo.findOne({
      where: { studentId: student.id, date: todayStr }
    });

    if (!attendance) {
      attendance = this.attendanceRepo.create({
        tenantId,
        studentId: student.id,
        date: todayStr,
        status: 'PRESENT',
      });
      await this.attendanceRepo.save(attendance);
    }

    return {
      success: true,
      timestamp: timeStr,
      student: {
        id: student.id,
        fullName: student.fullName,
        studentCode: student.studentCode,
        parentPhone: student.parentPhone,
        phone: student.phone,
        educationLevel: student.educationLevel,
        birthDate: student.birthDate,
      },
      notifications: {
        parent: `🔔 تم تسجيل دخول الطالب (${student.fullName}) إلى المركز بنجاح في تمام ${timeStr}.`,
        teacher: `🎓 انضم الطالب (${student.fullName}) إلى القاعة.`,
        admin: `✅ حضور معتمد: ${student.fullName} - الكود: ${student.studentCode}`,
      }
    };
  }

  async findStudentParent(studentId: string): Promise<User | null> {
    const userRepo = this.attendanceRepo.manager.getRepository(User);
    return userRepo.findOne({ where: { id: studentId } });
  }
}
