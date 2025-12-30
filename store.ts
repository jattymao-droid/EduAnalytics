import { User, Student, Exam, GradeRecord, UserRole, School, Semester, GradeLevel, SchoolClass, Invitation } from './types.ts';

const STORAGE_KEY = 'edu_analytics_local_db';

interface LocalDB {
  schools: School[];
  users: User[];
  semesters: Semester[];
  gradeLevels: GradeLevel[];
  classes: SchoolClass[];
  students: Student[];
  exams: Exam[];
  gradeRecords: GradeRecord[];
  invitations: Invitation[];
}

const defaultDB: LocalDB = {
  schools: [],
  users: [
    { id: 'u_admin', username: 'admin', password: 'password', role: UserRole.ADMIN }
  ],
  semesters: [],
  gradeLevels: [],
  classes: [],
  students: [],
  exams: [],
  gradeRecords: [],
  invitations: []
};

const getDB = (): LocalDB => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return defaultDB;
  try {
    return JSON.parse(data);
  } catch (e) {
    return defaultDB;
  }
};

const saveDB = (db: LocalDB) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

export const db = {
  // Global & Auth
  getSchools: async () => getDB().schools,
  saveSchools: async (data: School[]) => {
    const d = getDB();
    d.schools = data;
    saveDB(d);
  },
  
  getUsers: async () => getDB().users,
  saveUsers: async (data: User[]) => {
    const d = getDB();
    d.users = data;
    saveDB(d);
  },

  login: async (username: string, password: string) => {
    const dbData = getDB();
    const user = dbData.users.find(u => u.username === username && u.password === password);
    if (!user) throw new Error('用户名或密码错误');
    return user;
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem('edu_current_user');
    return stored ? JSON.parse(stored) : null;
  },
  
  setCurrentUser: (user: User | null) => {
    if (user) localStorage.setItem('edu_current_user', JSON.stringify(user));
    else localStorage.removeItem('edu_current_user');
  },

  // Scoped by School
  getSemesters: async (schoolId: string) => getDB().semesters.filter(s => s.schoolId === schoolId),
  saveSemesters: async (data: Semester[], schoolId: string) => {
    const d = getDB();
    d.semesters = [...d.semesters.filter(s => s.schoolId !== schoolId), ...data];
    saveDB(d);
  },
  
  getGradeLevels: async (schoolId: string) => getDB().gradeLevels.filter(g => g.schoolId === schoolId),
  saveGradeLevels: async (data: GradeLevel[], schoolId: string) => {
    const d = getDB();
    d.gradeLevels = [...d.gradeLevels.filter(g => g.schoolId !== schoolId), ...data];
    saveDB(d);
  },
  
  getClasses: async (schoolId: string) => getDB().classes.filter(c => c.schoolId === schoolId),
  saveClasses: async (data: SchoolClass[], schoolId: string) => {
    const d = getDB();
    d.classes = [...d.classes.filter(c => c.schoolId !== schoolId), ...data];
    saveDB(d);
  },
  
  getStudents: async (schoolId?: string) => {
    const d = getDB();
    return schoolId ? d.students.filter(s => s.schoolId === schoolId) : d.students;
  },
  saveStudents: async (data: Student[], schoolId: string) => {
    const d = getDB();
    d.students = [...d.students.filter(s => s.schoolId !== schoolId), ...data];
    saveDB(d);
  },

  getExams: async (schoolId: string) => getDB().exams.filter(e => e.schoolId === schoolId),
  saveExams: async (data: Exam[], schoolId: string) => {
    const d = getDB();
    d.exams = [...d.exams.filter(e => e.schoolId !== schoolId), ...data];
    saveDB(d);
  },

  getGrades: async (schoolId: string) => getDB().gradeRecords.filter(g => g.schoolId === schoolId),
  saveGrades: async (data: GradeRecord[], schoolId: string) => {
    const d = getDB();
    d.gradeRecords = [...d.gradeRecords.filter(g => g.schoolId !== schoolId), ...data];
    saveDB(d);
  },

  // Invitation management
  getInvitations: async () => getDB().invitations,
  saveInvitations: async (data: Invitation[], schoolId: string) => {
    const d = getDB();
    d.invitations = [...d.invitations.filter(i => i.schoolId !== schoolId), ...data];
    saveDB(d);
  },
  getInvitationByCode: async (code: string) => getDB().invitations.find(i => i.code === code) || null,

  init: async () => {
    console.log("EduAnalytics: Mock Local Storage DB ready.");
  }
};