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

export interface ModuleItem {
  _id: string;
  subjectId: string;
  title: string;
  orderIndex: number;
  summary: string;
  contentType: 'text' | 'file' | 'presentation';
  textContent?: string;
  fileName?: string;
  fileUrl?: string;
  isLocked?: boolean;
  isCompleted?: boolean;
  createdAt: string;
}

export interface CurriculumProgress {
  totalModules: number;
  completedCount: number;
}
