import mongoose, { Schema, Types } from "mongoose";
interface IQuizAttempt {
  studentId: Types.ObjectId;
  quizId: Types.ObjectId;
  sessionToken: string;
  active: boolean;
  finalizing: boolean;
  finalizingAt?: Date;
  startedAt: Date;
  expiresAt: Date;
  questionOrder: number[];
  optionOrders?: number[][];
  answers: number[];
  blurCount: number;
}
const QuizAttemptSchema = new Schema<IQuizAttempt>({
  studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
  sessionToken: { type: String, required: true },
  active: { type: Boolean, default: true },
  finalizing: { type: Boolean, default: false },
  finalizingAt: Date,
  startedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  questionOrder: { type: [Number], required: true },
  // Indexed by original question, mapping displayed letters to original options.
  // Missing on attempts started before choice randomization was introduced.
  optionOrders: { type: [[Number]], default: undefined },
  answers: { type: [Number], default: [] },
  blurCount: { type: Number, default: 0 },
});
QuizAttemptSchema.index(
  { studentId: 1 },
  { unique: true, partialFilterExpression: { active: true } },
);
export const QuizAttempt = mongoose.model("QuizAttempt", QuizAttemptSchema);
