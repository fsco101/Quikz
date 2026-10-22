import mongoose, { Document, Schema } from "mongoose";

export interface IQuizSubmission extends Document {
  attemptId?: mongoose.Types.ObjectId;
  retryAfter?: Date;
  quizId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  studentName: string;
  studentSurname: string;
  studentYearLevel: string;
  studentSection: string;
  subjectId: mongoose.Types.ObjectId;
  moduleId?: mongoose.Types.ObjectId;
  score: number;
  totalQuestions: number;
  percentage: number;
  passingPercentage: number;
  passed: boolean;
  answers: {
    questionIndex: number;
    selectedOption: number;
    isCorrect: boolean;
  }[];
  blurCount: number;
  timeSpentSeconds: number;
  submittedAt: Date;
}

const QuizSubmissionSchema = new Schema<IQuizSubmission>({
  attemptId: { type: Schema.Types.ObjectId, ref: "QuizAttempt" },
  retryAfter: Date,
  quizId: {
    type: Schema.Types.ObjectId,
    ref: "Quiz",
    required: true,
  },
  studentId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  studentName: {
    type: String,
    required: true,
  },
  studentSurname: {
    type: String,
    required: true,
  },
  studentYearLevel: {
    type: String,
    default: "1st Year",
  },
  studentSection: {
    type: String,
    default: "Section A",
  },
  subjectId: {
    type: Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  moduleId: {
    type: Schema.Types.ObjectId,
    ref: "Module",
  },
  score: {
    type: Number,
    required: true,
  },
  totalQuestions: {
    type: Number,
    required: true,
  },
  percentage: {
    type: Number,
    required: true,
  },
  passingPercentage: { type: Number, default: 75, min: 1, max: 100 },
  passed: {
    type: Boolean,
    required: true,
  },
  answers: [
    {
      questionIndex: { type: Number, required: true },
      selectedOption: { type: Number, required: true },
      isCorrect: { type: Boolean, required: true },
    },
  ],
  blurCount: {
    type: Number,
    default: 0,
  },
  timeSpentSeconds: {
    type: Number,
    default: 0,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for fast analytics and student gradebook queries
QuizSubmissionSchema.index({ studentId: 1, subjectId: 1 });
QuizSubmissionSchema.index({ studentId: 1, submittedAt: -1 });
QuizSubmissionSchema.index({ attemptId: 1 }, { unique: true, sparse: true });
QuizSubmissionSchema.index({
  subjectId: 1,
  studentYearLevel: 1,
  studentSection: 1,
});

export const QuizSubmission = mongoose.model<IQuizSubmission>(
  "QuizSubmission",
  QuizSubmissionSchema,
);
