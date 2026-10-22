import mongoose, { Document, Schema } from 'mongoose';

export interface IModule extends Document {
  subjectId: mongoose.Types.ObjectId;
  title: string;
  orderIndex: number;
  summary: string;
  contentType: 'text' | 'file' | 'presentation';
  textContent?: string;
  fileName?: string;
  fileUrl?: string;
  quizId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ModuleSchema = new Schema<IModule>({
  subjectId: {
    type: Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Topic / Module title is required'],
    trim: true
  },
  orderIndex: {
    type: Number,
    required: true,
    min: 1
  },
  summary: {
    type: String,
    required: [true, 'Topic summary is required'],
    trim: true
  },
  contentType: {
    type: String,
    enum: ['text', 'file', 'presentation'],
    default: 'text',
    required: true
  },
  textContent: {
    type: String,
    default: ''
  },
  fileName: {
    type: String
  },
  fileUrl: {
    type: String
  },
  quizId: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

ModuleSchema.index({ subjectId: 1, orderIndex: 1 });
export const Module = mongoose.model<IModule>('Module', ModuleSchema);
