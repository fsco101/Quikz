export interface Question {
  questionText: string;
  options: string[];
  correctIndex?: number;
  explanation?: string;
}
export interface Quiz {
  moduleId?: string;
  _id: string;
  title: string;
  timeLimitMinutes: number;
  timePerQuestionSeconds?: number;
  questionCount?: number;
  passingPercentage: number;
  questions: Question[];
}
export interface Attempt {
  id: string;
  startedAt: string;
  expiresAt: string;
  serverNow: string;
  currentQuestionIndex?: number;
  questionExpiresAt?: string;
  timePerQuestionSeconds?: number;
  answers: number[];
  blurCount: number;
}
export interface Submission {
  _id: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passingPercentage: number;
  passed: boolean;
  blurCount: number;
  retryAfter?: string;
}
