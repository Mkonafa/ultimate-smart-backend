import { Injectable } from '@nestjs/common';
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

  async findStudentParent(studentId: string): Promise<User | null> {
    const userRepo = this.attendanceRepo.manager.getRepository(User);
    return userRepo.findOne({ where: { id: studentId } });
  }
}
