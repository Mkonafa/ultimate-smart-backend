import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exam } from './entities/exam.entity';
import { ExamResult } from './entities/exam-result.entity';
import { ExamQuestion } from './entities/exam_question.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam)
    private examRepo: Repository<Exam>,
    @InjectRepository(ExamResult)
    private examResultRepo: Repository<ExamResult>,
    @InjectRepository(ExamQuestion)
    private examQuestionRepo: Repository<ExamQuestion>,
  ) {}

  async createExam(tenantId: string, courseId: string, name: string, maxScore: number, date: string): Promise<Exam> {
    const exam = this.examRepo.create({
      tenantId,
      courseId,
      name,
      maxScore,
      date,
    });
    return this.examRepo.save(exam);
  }

  async submitResults(
    tenantId: string,
    examId: string,
    results: { studentId: string; score: number; remarks?: string }[],
  ): Promise<any> {
    const exam = await this.examRepo.findOne({ where: { id: examId, tenantId } });
    if (!exam) {
      throw new NotFoundException('الامتحان غير موجود');
    }

    const savedResults: ExamResult[] = [];
    for (const record of results) {
      let result = await this.examResultRepo.findOne({
        where: { examId, studentId: record.studentId, tenantId },
      });

      if (result) {
        result.score = record.score;
        result.remarks = record.remarks;
      } else {
        result = this.examResultRepo.create({
          tenantId,
          examId,
          studentId: record.studentId,
          score: record.score,
          remarks: record.remarks,
        });
      }
      savedResults.push(await this.examResultRepo.save(result));
    }

    return { success: true, count: savedResults.length };
  }

  async findStudentGrades(studentId: string): Promise<any[]> {
    const results = await this.examResultRepo.find({
      where: { studentId },
      relations: {
        exam: {
          course: {
            subject: true,
          },
        },
      },
      order: {
        exam: {
          date: 'DESC',
        },
      },
    });

    return results.map((r) => ({
      id: r.id,
      examId: r.examId,
      examName: r.exam?.name ?? 'امتحان',
      maxScore: r.exam?.maxScore ?? 100,
      score: r.score,
      remarks: r.remarks,
      date: r.exam?.date ?? '',
      courseName: r.exam?.course?.name ?? 'كورس غير معروف',
      subjectName: r.exam?.course?.subject?.name ?? 'مادة غير معروف',
    }));
  }

  async findCourseExams(tenantId: string, courseId: string): Promise<Exam[]> {
    return this.examRepo.find({
      where: { tenantId, courseId },
      relations: {
        results: {
          student: true,
        },
      },
      order: { date: 'DESC' },
    });
  }

  // --- Electronic Exams Methods ---

  async addQuestions(examId: string, questionsData: any[]): Promise<ExamQuestion[]> {
    const questions = questionsData.map(q => this.examQuestionRepo.create({
      examId,
      type: q.type,
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      points: q.points || 1,
    }));
    return this.examQuestionRepo.save(questions);
  }

  async getExamWithQuestions(examId: string, tenantId: string): Promise<any> {
    const exam = await this.examRepo.findOne({
      where: { id: examId, tenantId },
    });
    if (!exam) throw new NotFoundException('الامتحان غير موجود');

    const questions = await this.examQuestionRepo.find({ where: { examId } });
    return { ...exam, questions };
  }

  async autoGradeExam(
    tenantId: string,
    examId: string,
    studentId: string,
    studentAnswers: { questionId: string; answer: string }[]
  ): Promise<ExamResult> {
    const exam = await this.examRepo.findOne({ where: { id: examId, tenantId } });
    if (!exam) throw new NotFoundException('الامتحان غير موجود');

    const questions = await this.examQuestionRepo.find({ where: { examId } });
    
    let totalScore = 0;
    let maxPossibleScore = 0;
    const gradedAnswers: { questionId: string; answer: string; isCorrect: boolean }[] = [];

    for (const q of questions) {
      maxPossibleScore += q.points;
      const studentAns = studentAnswers.find(sa => sa.questionId === q.id);
      
      let isCorrect = false;
      if (studentAns && studentAns.answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
        isCorrect = true;
        totalScore += q.points;
      }

      gradedAnswers.push({
        questionId: q.id,
        answer: studentAns?.answer || '',
        isCorrect,
      });
    }

    // Convert score to be out of Exam's maxScore
    const finalScore = (totalScore / maxPossibleScore) * exam.maxScore;

    let result = await this.examResultRepo.findOne({ where: { examId, studentId, tenantId } });
    if (result) {
      result.score = finalScore;
      result.studentAnswers = gradedAnswers;
    } else {
      result = this.examResultRepo.create({
        tenantId,
        examId,
        studentId,
        score: finalScore,
        studentAnswers: gradedAnswers,
      });
    }

    return this.examResultRepo.save(result);
  }

  // --------------------------------

  async findStudentParent(studentId: string): Promise<User | null> {
    const userRepo = this.examRepo.manager.getRepository(User);
    return userRepo.findOne({ where: { id: studentId } });
  }
}
