
import { User, Student, Exam, GradeRecord, UserRole, School, Semester, GradeLevel, SchoolClass, Invitation } from './types';

const STORAGE_KEYS = {
  SCHOOLS: 'edu_schools',
  SEMESTERS: 'edu_semesters',
  GRADES: 'edu_grade_levels',
  CLASSES: 'edu_school_classes',
  USERS: 'edu_users',
  STUDENTS: 'edu_students',
  EXAMS: 'edu_exams',
  GRADES_DATA: 'edu_grades_records',
  CURRENT_USER: 'edu_current_user',
  INVITATIONS: 'edu_invitations'
};

const get = <T>(key: string): T[] => JSON.parse(localStorage.getItem(key) || '[]');
const set = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

export const db = {
  // Global
  getSchools: () => get<School>(STORAGE_KEYS.SCHOOLS),
  saveSchools: (data: School[]) => set(STORAGE_KEYS.SCHOOLS, data),
  
  getUsers: () => get<User>(STORAGE_KEYS.USERS),
  saveUsers: (data: User[]) => set(STORAGE_KEYS.USERS, data),

  getCurrentUser: (): User | null => JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null'),
  setCurrentUser: (user: User | null) => localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user)),

  getInvitations: () => get<Invitation>(STORAGE_KEYS.INVITATIONS),
  saveInvitations: (data: Invitation[], schoolId: string) => {
    const others = get<Invitation>(STORAGE_KEYS.INVITATIONS).filter(i => i.schoolId !== schoolId);
    set(STORAGE_KEYS.INVITATIONS, [...others, ...data]);
  },
  getInvitationByCode: (code: string) => get<Invitation>(STORAGE_KEYS.INVITATIONS).find(i => i.code === code),

  // Scoped by School
  getSemesters: (schoolId: string) => get<Semester>(STORAGE_KEYS.SEMESTERS).filter(s => s.schoolId === schoolId),
  saveSemesters: (data: Semester[], schoolId: string) => {
    const all = get<Semester>(STORAGE_KEYS.SEMESTERS).filter(s => s.schoolId !== schoolId);
    set(STORAGE_KEYS.SEMESTERS, [...all, ...data]);
  },

  getGradeLevels: (schoolId: string) => get<GradeLevel>(STORAGE_KEYS.GRADES).filter(g => g.schoolId === schoolId),
  saveGradeLevels: (data: GradeLevel[], schoolId: string) => {
    const all = get<GradeLevel>(STORAGE_KEYS.GRADES).filter(g => g.schoolId !== schoolId);
    set(STORAGE_KEYS.GRADES, [...all, ...data]);
  },

  getClasses: (schoolId: string) => get<SchoolClass>(STORAGE_KEYS.CLASSES).filter(c => c.schoolId === schoolId),
  saveClasses: (data: SchoolClass[], schoolId: string) => {
    const all = get<SchoolClass>(STORAGE_KEYS.CLASSES).filter(c => c.schoolId !== schoolId);
    set(STORAGE_KEYS.CLASSES, [...all, ...data]);
  },

  getStudents: (schoolId?: string) => {
    const all = get<Student>(STORAGE_KEYS.STUDENTS);
    return schoolId ? all.filter(s => s.schoolId === schoolId) : all;
  },
  saveStudents: (data: Student[], schoolId: string) => {
    const otherSchools = get<Student>(STORAGE_KEYS.STUDENTS).filter(s => s.schoolId !== schoolId);
    set(STORAGE_KEYS.STUDENTS, [...otherSchools, ...data]);
  },

  getExams: (schoolId: string) => get<Exam>(STORAGE_KEYS.EXAMS).filter(e => e.schoolId === schoolId),
  saveExams: (data: Exam[], schoolId: string) => {
    const others = get<Exam>(STORAGE_KEYS.EXAMS).filter(e => e.schoolId !== schoolId);
    set(STORAGE_KEYS.EXAMS, [...others, ...data]);
  },

  getGrades: (schoolId: string) => get<GradeRecord>(STORAGE_KEYS.GRADES_DATA).filter(g => g.schoolId === schoolId),
  saveGrades: (data: GradeRecord[], schoolId: string) => {
    const actualOthers = get<GradeRecord>(STORAGE_KEYS.GRADES_DATA).filter(g => g.schoolId !== schoolId);
    set(STORAGE_KEYS.GRADES_DATA, [...actualOthers, ...data]);
  },

  deleteExam: (examId: string, schoolId: string) => {
    const exams = get<Exam>(STORAGE_KEYS.EXAMS).filter(e => e.id !== examId);
    set(STORAGE_KEYS.EXAMS, exams);
    const grades = get<GradeRecord>(STORAGE_KEYS.GRADES_DATA).filter(g => g.examId !== examId);
    set(STORAGE_KEYS.GRADES_DATA, grades);
  },

  init: () => {
    if (get(STORAGE_KEYS.USERS).length === 0) {
      const schoolId = 'sch_demo';
      set(STORAGE_KEYS.SCHOOLS, [{ id: schoolId, name: '第一实验中学', motto: '勤学慎思，敦品励行' }]);
      set(STORAGE_KEYS.SEMESTERS, [{ id: 'sem_1', schoolId, name: '2023-2024学年第二学期', isCurrent: true }]);
      set(STORAGE_KEYS.GRADES, [{ id: 'gl_1', schoolId, name: '初三' }]);
      set(STORAGE_KEYS.CLASSES, [{ id: 'cl_1', schoolId, gradeId: 'gl_1', name: '1班' }]);
      set(STORAGE_KEYS.USERS, [
        { id: 'u_admin', username: 'admin', password: 'password', role: UserRole.ADMIN, schoolId },
        { id: 'u_teacher', username: 'teacher', password: 'password', role: UserRole.TEACHER, schoolId }
      ]);
      set(STORAGE_KEYS.STUDENTS, [
        { id: 's1', schoolId, name: '张三', gradeId: 'gl_1', classId: 'cl_1', studentNo: '2024001' },
        { id: 's2', schoolId, name: '李四', gradeId: 'gl_1', classId: 'cl_1', studentNo: '2024002' }
      ]);
    }
  }
};
