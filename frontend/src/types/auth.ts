export type UserRole = 'faculty' | 'student';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
  surname: string;
  yearLevel?: string;
  section?: string;
  termsAccepted: boolean;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  fullName: string;
  surname: string;
  yearLevel?: string;
  section?: string;
  termsAccepted: boolean;
}

export interface LoginPayload {
  loginIdentifier: string;
  password: string;
}
