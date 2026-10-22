import mongoose, { Document, Schema } from "mongoose";

export interface IQuestion {
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface IQuiz extends Document {
  title: string;
  subjectId: mongoose.Types.ObjectId;
  moduleId?: mongoose.Types.ObjectId;
  timeLimitMinutes: number;
  passingPercentage: number;
  questions: IQuestion[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  questionText: {
    type: String,
    required: [true, "Question text is required"],
    trim: true,
  },
  options: {
    type: [String],
    required: [true, "Four options are required"],
    validate: {
      validator: (v: string[]) =>
        Array.isArray(v) &&
        v.length === 4 &&
        v.every((o) => o.trim()) &&
        new Set(v.map((o) => o.trim().toLowerCase())).size === 4,
      message: "A question must provide four distinct nonempty options",
    },
  },
  correctIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
    validate: Number.isInteger,
  },
  explanation: {
    type: String,
    default: "",
  },
});

const QuizSchema = new Schema<IQuiz>({
  title: {
    type: String,
    required: [true, "Quiz title is required"],
    trim: true,
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
  timeLimitMinutes: {
    type: Number,
    required: true,
    min: [10, "Minimum quiz time limit is 10 minutes"],
    max: [20, "Maximum quiz time limit is 20 minutes"],
    default: 15,
  },
  passingPercentage: {
    type: Number,
    required: true,
    default: 75,
    enum: [75],
  },
  questions: {
    type: [QuestionSchema],
    required: true,
    validate: {
      validator: (q: IQuestion[]) =>
        Array.isArray(q) && q.length >= 4 && q.length <= 100,
      message: "Quiz must contain 4 to 100 questions",
    },
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Quiz = mongoose.model<IQuiz>("Quiz", QuizSchema);
