import mongoose, { Document, Schema } from 'mongoose';

export interface ISubject extends Document {
  name: string;
  code: string;
  term: string;
  yearLevel: string;
  facultyId: mongoose.Types.ObjectId;
  facultyName: string;
  description?: string;
  createdAt: Date;
}

const SubjectSchema = new Schema<ISubject>({
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Subject code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  term: {
    type: String,
    required: [true, 'Term / Semester is required'],
    trim: true
  },
  yearLevel: {
    type: String,
    required: [true, 'Year level is required'],
    trim: true
  },
  facultyId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  facultyName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Subject = mongoose.model<ISubject>('Subject', SubjectSchema);
