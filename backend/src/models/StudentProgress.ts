import mongoose, { Document, Schema } from 'mongoose';

export interface IStudentProgress extends Document {
  studentId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  completedModuleIds: mongoose.Types.ObjectId[];
  updatedAt: Date;
}

const StudentProgressSchema = new Schema<IStudentProgress>({
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subjectId: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  completedModuleIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Module'
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure uniqueness per student & subject
StudentProgressSchema.index({ studentId: 1, subjectId: 1 }, { unique: true });

export const StudentProgress = mongoose.model<IStudentProgress>('StudentProgress', StudentProgressSchema);
