
export enum UserRole {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  PARENT = 'PARENT'
}

export interface School {
  id: string;
  name: string;
  logo?: string; // base64 string
  motto?: string; // 校训
  address?: string;
  phone?: string;
  website?: string;
}

export interface Invitation {
  id: string;
  schoolId: string;
  gradeId: string;
  code: string;
  createdAt: string;
}

export interface Semester {
  id: string;
  schoolId: string;
  name: string; // e.g., "2023-2024学年第一学期"
  isCurrent: boolean;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  schoolId?: string;
  childIds?: string[];
  // 教师详细信息
  realName?: string;
  gender?: 'MALE' | 'FEMALE';
  subjects?: string[]; // 任教学科
}

export interface GradeLevel {
  id: string;
  schoolId: string;
  name: string;
}

export interface SchoolClass {
  id: string;
  schoolId: string;
  gradeId: string;
  name: string;
  classTeacherId?: string; // 班主任ID
  subjectTeachers?: Record<string, string>; // 学科名 -> 教师ID 的映射
}

export interface Student {
  id: string;
  schoolId: string;
  name: string;
  gradeId: string;
  classId: string;
  studentNo: string;
}

export interface Exam {
  id: string;
  schoolId: string;
  semesterId: string;
  name: string;
  date: string;
}

export interface SubjectGrade {
  subject: string;
  score: number;
  fullScore: number;
}

export interface GradeRecord {
  id: string;
  studentId: string;
  examId: string;
  schoolId: string;
  grades: SubjectGrade[];
}

export interface AIAnalysisReport {
  overallAssessment: string;
  strengths: string[];
  weaknesses: string[];
  trendAnalysis: string;
  suggestions: string[];
}

// 定义常用学科常量
export const DEFAULT_SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '体育', '美术', '音乐'];
