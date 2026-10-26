export interface Subject {
  _id: string;
  name: string;
  code: string;
  term: string;
  yearLevel: string;
  facultyId: string;
  facultyName: string;
  description?: string;
  createdAt: string;
}

export interface CourseOverview {
  subjectId: string;
  totalModules: number;
  completedCount?: number;
  readyQuizCount?: number;
  missingQuizCount?: number;
  status: "empty" | "completed" | "in-progress" | "not-started" | "needs-quizzes" | "ready";
  nextModule: { id: string; title: string } | null;
}

export interface ModuleItem {
  _id: string;
  subjectId: string;
  canEdit?: boolean;
  __v?: number;
  createdBy?: string;
  title: string;
  orderIndex: number;
  summary: string;
  contentType: "text" | "file" | "presentation";
  textContent?: string;
  fileName?: string;
  fileUrl?: string;
  quizId?: {
    _id: string;
    createdBy?: string;
    title: string;
    timeLimitMinutes: number;
    timePerQuestionSeconds?: number;
    questionCount?: number;
    passingPercentage: number;
  };
  isLocked?: boolean;
  isCompleted?: boolean;
  createdAt: string;
}

export interface CurriculumProgress {
  totalModules: number;
  completedCount: number;
}
