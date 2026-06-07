import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Exam } from './exam.entity';

export enum QuestionType {
  MCQ = 'MCQ',
  TRUE_FALSE = 'TRUE_FALSE',
}

@Entity('exam_questions')
export class ExamQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  examId: string;

  @ManyToOne(() => Exam, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'examId' })
  exam: Exam;

  @Column({
    type: 'varchar',
    default: QuestionType.MCQ,
  })
  type: string;

  @Column()
  text: string;

  @Column('simple-json', { nullable: true })
  options: string[]; // e.g. ["Option A", "Option B", "Option C", "Option D"] for MCQ

  @Column()
  correctAnswer: string; // The exact text of the correct option, or "true"/"false"

  @Column({ type: 'integer', default: 1 })
  points: number;
}
