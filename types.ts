
export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
  PARENT = 'parent',
}

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL: string;
  linkedStudentIds?: string[]; // For parents (multiple children) and students (single)
  assignedClassIds?: string[]; // For teachers
}

export interface Student {
  id: string;
  name:string;
  rollNumber: string;
  classId: string;
  photoURL: string;
  notes?: string;
  parentId?: string;
  faceDescriptor?: number[];
}

export interface Class {
  id: string;
  name: string;
  teacherId: string;
  teacherName?: string; // Optional field for enriched data
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'Late';
  timestamp: Date;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: 'absence' | 'event' | 'general';
  timestamp: Date;
  isRead: boolean;
}

export interface Announcement {
  id: string;
  message: string;
  audience: string;
  timestamp: Date;
  sentBy: string;
}
