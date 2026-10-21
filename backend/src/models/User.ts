import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  role: 'faculty' | 'student';
  fullName: string;
  surname: string;
  yearLevel?: string;
  section?: string;
  termsAccepted: boolean;
  termsAcceptedAt: Date;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required']
  },
  role: {
    type: String,
    enum: ['faculty', 'student'],
    default: 'student',
    required: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  surname: {
    type: String,
    required: [true, 'Surname is required'],
    trim: true
  },
  yearLevel: {
    type: String,
    default: '1st Year'
  },
  section: {
    type: String,
    default: 'Section A'
  },
  termsAccepted: {
    type: Boolean,
    required: [true, 'Acceptance of Terms and Academic Honor Code is mandatory'],
    validate: {
      validator: (v: boolean) => v === true,
      message: 'You must accept the Terms and Conditions before proceeding'
    }
  },
  termsAcceptedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const User = mongoose.model<IUser>('User', UserSchema);
