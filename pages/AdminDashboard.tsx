
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../store';
import { User, School, Semester, GradeLevel, SchoolClass, Student, UserRole, Exam, GradeRecord, Invitation, DEFAULT_SUBJECTS } from '../types';
import GradeImport from './GradeImport';
import GradeChart from '../components/GradeChart';

interface AdminDashboardProps {
  user: User;
  onSchoolUpdate?: (school: School) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onSchoolUpdate }) => {
  const [school, setSchool] = useState<School | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [grades, setGrades] = useState<GradeLevel[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [activeTab, setActiveTab] = useState<'info' | 'semesters' | 'grades' | 'students' | 'teachers' | 'exams' | 'invites'>('info');

  // Modal states
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isStudentDetailModalOpen, setIsStudentDetailModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isClassDetailModalOpen, setIsClassDetailModalOpen] = useState(false);
  const [isSchoolEditModalOpen, setIsSchoolEditModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  
  // Form states
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState({ name: '', studentNo: '', gradeId: '', classId: '' });
  
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);
  const [teacherForm, setTeacherForm] = useState({ 
    username: '', 
    password: '', 
    realName: '', 
    gender: 'MALE' as 'MALE' | 'FEMALE', 
    subjects: [] as string[] 
  });

  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [semesterForm, setSemesterForm] = useState({ name: '' });

  const [editingGrade, setEditingGrade] = useState<GradeLevel | null>(null);
  const [gradeForm, setGradeForm] = useState({ name: '' });

  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [classForm, setClassForm] = useState({ name: '', gradeId: '', classTeacherId: '', subjectTeachers: {} as Record<string, string> });

  const [examForm, setExamForm] = useState({ name: '', semesterId: '', date: new Date().toISOString().split('T')[0] });
  const [viewingExamId, setViewingExamId] = useState<string | null>(null);

  const [inviteForm, setInviteForm] = useState({ gradeId: '', code: '' });

  const [schoolForm, setSchoolForm] = useState<Partial<School>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parent Management states
  const [parentSearchUsername, setParentSearchUsername] = useState('');
  const [isSearchingParent, setIsSearchingParent] = useState(false);

  // Filter states
  const [studentSearch, setStudentSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [examSearch, setExamSearch] = useState('');
  const [scoreSearch, setScoreSearch] = useState('');
  const [filterGradeId, setFilterGradeId] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [filterSemesterId, setFilterSemesterId] = useState('');

  const schoolId = user.schoolId!;

  useEffect(() => {
    refreshData();
  }, [schoolId]);

  const refreshData = () => {
    const schools = db.getSchools();
    const currentSchool = schools.find(s => s.id === schoolId) || null;
    setSchool(currentSchool);
    if (currentSchool) setSchoolForm(currentSchool);

    setSemesters(db.getSemesters(schoolId));
    setGrades(db.getGradeLevels(schoolId));
    setClasses(db.getClasses(schoolId));
    setStudents(db.getStudents(schoolId));
    const users = db.getUsers();
    setAllUsers(users);
    setTeachers(users.filter(u => u.role === UserRole.TEACHER && u.schoolId === schoolId));
    setExams(db.getExams(schoolId));
    setGradeRecords(db.getGrades(schoolId));
    setInvitations(db.getInvitations().filter(i => i.schoolId === schoolId));
    
    if (!filterSemesterId) {
      const current = db.getSemesters(schoolId).find(s => s.isCurrent);
      if (current) setFilterSemesterId(current.id);
    }
  };

  // --- Parent Binding Actions ---
  const handleLinkParent = () => {
    if (!parentSearchUsername.trim() || !viewingStudent) return;
    
    const parent = allUsers.find(u => 
      u.role === UserRole.PARENT && 
      (u.username === parentSearchUsername || u.id === parentSearchUsername)
    );

    if (!parent) {
      alert('未找到对应的家长账号，请确认用户名或ID是否正确。');
      return;
    }

    if (parent.childIds?.includes(viewingStudent.id)) {
      alert('该家长账号已关联此学生。');
      return;
    }

    const updatedUsers = allUsers.map(u => {
      if (u.id === parent.id) {
        return { ...u, childIds: [...(u.childIds || []), viewingStudent.id] };
      }
      return u;
    });

    db.saveUsers(updatedUsers);
    setParentSearchUsername('');
    setIsSearchingParent(false);
    refreshData();
  };

  const handleUnlinkParent = (parentId: string) => {
    if (!viewingStudent || !window.confirm('确定要解除该家长与学生的关联吗？')) return;

    const updatedUsers = allUsers.map(u => {
      if (u.id === parentId) {
        return { ...u, childIds: (u.childIds || []).filter(id => id !== viewingStudent.id) };
      }
      return u;
    });

    db.saveUsers(updatedUsers);
    refreshData();
  };

  // --- Invitation Actions ---
  const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setInviteForm(prev => ({ ...prev, code }));
  };

  const openAddInvite = () => {
    setInviteForm({ gradeId: grades[0]?.id || '', code: '' });
    generateInviteCode();
    setIsInviteModalOpen(true);
  };

  const saveInvite = () => {
    if (!inviteForm.gradeId || !inviteForm.code) return alert('请选择年级并生成代码');
    const newInvite: Invitation = {
      id: 'inv_' + Date.now(),
      schoolId,
      gradeId: inviteForm.gradeId,
      code: inviteForm.code,
      createdAt: new Date().toISOString()
    };
    db.saveInvitations([...invitations, newInvite], schoolId);
    setIsInviteModalOpen(false);
    refreshData();
  };

  const deleteInvite = (id: string) => {
    if (window.confirm('确定要作废该邀请码吗？')) {
      db.saveInvitations(invitations.filter(i => i.id !== id), schoolId);
      refreshData();
    }
  };

  const copyInviteLink = (code: string) => {
    const url = `${window.location.origin}${window.location.pathname}?invite=${code}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('邀请链接已复制到剪贴板');
    });
  };

  // --- School Actions ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSchoolForm(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const saveSchoolInfo = () => {
    if (!schoolForm.name?.trim()) return alert('学校名称不能为空');
    const schools = db.getSchools();
    const updated = schools.map(s => s.id === schoolId ? { ...s, ...schoolForm } as School : s);
    db.saveSchools(updated);
    setIsSchoolEditModalOpen(false);
    refreshData();
    if (onSchoolUpdate && schoolForm.name) {
      onSchoolUpdate({ ...school, ...schoolForm } as School);
    }
  };

  // --- Semester Actions ---
  const saveSemester = () => {
    if (!semesterForm.name.trim()) return alert('请输入名称');
    const updated = [...semesters];
    if (editingSemester) {
      const idx = updated.findIndex(s => s.id === editingSemester.id);
      updated[idx] = { ...editingSemester, name: semesterForm.name };
    } else {
      updated.push({ id: 'sem_' + Date.now(), schoolId, name: semesterForm.name, isCurrent: semesters.length === 0 });
    }
    db.saveSemesters(updated, schoolId);
    setIsSemesterModalOpen(false);
    refreshData();
  };

  const handleSetCurrentSemester = (id: string) => {
    db.saveSemesters(semesters.map(s => ({ ...s, isCurrent: s.id === id })), schoolId);
    refreshData();
  };

  const handleDeleteSemester = (id: string) => {
    if (exams.some(e => e.semesterId === id)) return alert('该学期已有考试记录，无法删除。');
    if (window.confirm('确定要删除吗？')) {
      db.saveSemesters(semesters.filter(s => s.id !== id), schoolId);
      refreshData();
    }
  };

  // --- Grade Actions ---
  const saveGrade = () => {
    if (!gradeForm.name.trim()) return alert('请输入名称');
    const updated = [...grades];
    if (editingGrade) {
      const idx = updated.findIndex(g => g.id === editingGrade.id);
      updated[idx] = { ...editingGrade, name: gradeForm.name };
    } else {
      updated.push({ id: 'gl_' + Date.now(), schoolId, name: gradeForm.name });
    }
    db.saveGradeLevels(updated, schoolId);
    setIsGradeModalOpen(false);
    refreshData();
  };

  const handleDeleteGrade = (gradeId: string) => {
    if (classes.some(c => c.gradeId === gradeId)) return alert('请先删除该年级下的所有班级');
    if (window.confirm('确定删除该年级吗？')) {
      db.saveGradeLevels(grades.filter(g => g.id !== gradeId), schoolId);
      refreshData();
    }
  };

  // --- Class Actions ---
  const saveClass = () => {
    if (!classForm.name.trim()) return alert('请输入名称');
    const updated = [...classes];
    if (editingClass) {
      const idx = updated.findIndex(c => c.id === editingClass.id);
      updated[idx] = { ...editingClass, ...classForm };
    } else {
      updated.push({ id: 'cl_' + Date.now(), schoolId, ...classForm });
    }
    db.saveClasses(updated, schoolId);
    setIsClassModalOpen(false);
    setIsClassDetailModalOpen(false);
    refreshData();
  };

  const handleDeleteClass = (classId: string) => {
    if (students.some(s => s.classId === classId)) return alert('该班级仍有学生，无法删除');
    if (window.confirm('确定删除该班级吗？')) {
      db.saveClasses(classes.filter(c => c.id !== classId), schoolId);
      refreshData();
    }
  };

  const openClassDetail = (c: SchoolClass) => {
    setEditingClass(c);
    setClassForm({ 
      name: c.name, 
      gradeId: c.gradeId, 
      classTeacherId: c.classTeacherId || '', 
      subjectTeachers: c.subjectTeachers || {} 
    });
    setIsClassDetailModalOpen(true);
  };

  // --- Teacher Actions ---
  const openAddTeacher = () => {
    setEditingTeacher(null);
    setTeacherForm({ username: '', password: '', realName: '', gender: 'MALE', subjects: [] });
    setIsTeacherModalOpen(true);
  };

  const openEditTeacher = (t: User) => {
    setEditingTeacher(t);
    setTeacherForm({ 
      username: t.username, 
      password: t.password || '', 
      realName: t.realName || '', 
      gender: t.gender || 'MALE', 
      subjects: t.subjects || [] 
    });
    setIsTeacherModalOpen(true);
  };

  const saveTeacher = () => {
    if (!teacherForm.username || !teacherForm.password || !teacherForm.realName) return alert('信息不完整');
    const all = db.getUsers();
    if (editingTeacher) {
      db.saveUsers(all.map(u => u.id === editingTeacher.id ? { ...u, ...teacherForm } : u));
    } else {
      if (all.some(u => u.username === teacherForm.username)) return alert('账号已存在');
      db.saveUsers([...all, { id: 'u_' + Date.now(), ...teacherForm, role: UserRole.TEACHER, schoolId }]);
    }
    setIsTeacherModalOpen(false);
    refreshData();
  };

  const deleteTeacher = (id: string) => {
    if (window.confirm('注销该教师账号？')) {
      db.saveUsers(db.getUsers().filter(u => u.id !== id));
      refreshData();
    }
  };

  // --- Student Actions ---
  const openAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({ 
      name: '', 
      studentNo: '', 
      gradeId: grades[0]?.id || '', 
      classId: classes.find(c => c.gradeId === grades[0]?.id)?.id || '' 
    });
    setIsStudentModalOpen(true);
  };

  const openEditStudent = (s: Student) => {
    setEditingStudent(s);
    setStudentForm({ 
      name: s.name, 
      studentNo: s.studentNo, 
      gradeId: s.gradeId, 
      classId: s.classId 
    });
    setIsStudentModalOpen(true);
  };

  const openStudentDetail = (s: Student) => {
    setViewingStudent(s);
    setParentSearchUsername('');
    setIsSearchingParent(false);
    setIsStudentDetailModalOpen(true);
  };

  const saveStudent = () => {
    if (!studentForm.name || !studentForm.studentNo || !studentForm.gradeId || !studentForm.classId) return alert('信息不完整');
    const updated = [...students];
    if (editingStudent) {
      const idx = updated.findIndex(s => s.id === editingStudent.id);
      if (idx !== -1) updated[idx] = { ...editingStudent, ...studentForm };
    } else {
      if (updated.some(s => s.studentNo === studentForm.studentNo)) return alert('学号已存在');
      updated.push({ id: 'stu_' + Date.now(), schoolId, ...studentForm });
    }
    db.saveStudents(updated, schoolId);
    setIsStudentModalOpen(false);
    refreshData();
  };

  const deleteStudent = (id: string) => {
    if (window.confirm('确定要删除该学生吗？')) {
      db.saveStudents(students.filter(s => s.id !== id), schoolId);
      refreshData();
    }
  };

  // --- Exam Actions ---
  const openAddExam = () => {
    setExamForm({ 
      name: '', 
      semesterId: semesters.find(s => s.isCurrent)?.id || semesters[0]?.id || '', 
      date: new Date().toISOString().split('T')[0] 
    });
    setIsExamModalOpen(true);
  };

  const saveExam = () => {
    if (!examForm.name || !examForm.semesterId) return alert('信息不完整');
    const newExam: Exam = { id: 'exam_' + Date.now(), schoolId, ...examForm };
    db.saveExams([...exams, newExam], schoolId);
    setIsExamModalOpen(false);
    refreshData();
  };

  const handleDeleteExam = (examId: string) => {
    if (window.confirm('警告：此操作将永久删除该场考试的所有成绩记录！确定要继续吗？')) {
      db.deleteExam(examId, schoolId);
      setViewingExamId(null);
      refreshData();
    }
  };

  // --- Memoized Helpers ---
  const filteredStudents = useMemo(() => students.filter(s => {
    const match = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.studentNo.includes(studentSearch);
    const gMatch = filterGradeId ? s.gradeId === filterGradeId : true;
    const cMatch = filterClassId ? s.classId === filterClassId : true;
    return match && gMatch && cMatch;
  }), [students, studentSearch, filterGradeId, filterClassId]);

  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      const semMatch = !filterSemesterId || e.semesterId === filterSemesterId;
      const searchMatch = !examSearch || e.name.toLowerCase().includes(examSearch.toLowerCase());
      return semMatch && searchMatch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [exams, filterSemesterId, examSearch]);

  const examGradesForViewing = useMemo(() => {
    if (!viewingExamId) return [];
    return gradeRecords.filter(g => g.examId === viewingExamId).filter(g => {
      const s = students.find(stu => stu.id === g.studentId);
      return !scoreSearch || (s?.name.toLowerCase().includes(scoreSearch.toLowerCase()) || s?.studentNo.includes(scoreSearch));
    });
  }, [viewingExamId, gradeRecords, students, scoreSearch]);

  const getStudentParents = (studentId: string) => allUsers.filter(u => u.role === UserRole.PARENT && u.childIds?.includes(studentId));
  const getStudentGrades = (studentId: string) => gradeRecords.filter(g => g.studentId === studentId);

  const getExamStats = (examId: string) => {
    const eGrades = gradeRecords.filter(g => g.examId === examId);
    if (eGrades.length === 0) return null;
    const subjectsMap: Record<string, { total: number; count: number; max: number; min: number }> = {};
    eGrades.forEach(record => {
      record.grades.forEach(sg => {
        if (!subjectsMap[sg.subject]) subjectsMap[sg.subject] = { total: 0, count: 0, max: 0, min: 1000 };
        subjectsMap[sg.subject].total += sg.score;
        subjectsMap[sg.subject].count += 1;
        subjectsMap[sg.subject].max = Math.max(subjectsMap[sg.subject].max, sg.score);
        subjectsMap[sg.subject].min = Math.min(subjectsMap[sg.subject].min, sg.score);
      });
    });
    return Object.entries(subjectsMap).map(([subject, stats]) => ({
      subject,
      avg: Math.round(stats.total / stats.count),
      max: stats.max,
      min: stats.min,
      count: stats.count
    }));
  };

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-72 flex-shrink-0">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 space-y-2 sticky top-28">
          <div className="px-4 py-3 mb-2 border-b border-slate-50">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">系统管理</h4>
          </div>
          {[
            { id: 'info', icon: 'fa-school', label: '学校概况' },
            { id: 'invites', icon: 'fa-paper-plane', label: '邀请管理' },
            { id: 'semesters', icon: 'fa-calendar-alt', label: '学期管理' },
            { id: 'grades', icon: 'fa-layer-group', label: '年级与班级' },
            { id: 'teachers', icon: 'fa-chalkboard-teacher', label: '教师管理' },
            { id: 'students', icon: 'fa-user-graduate', label: '学生管理' },
            { id: 'exams', icon: 'fa-chart-bar', label: '考试与成绩' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setViewingExamId(null); }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 transform scale-105' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              <i className={`fas ${tab.icon} w-5 text-center`}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 min-h-[600px] animate-in fade-in duration-500">
          
          {/* TAB: Info */}
          {activeTab === 'info' && (
            <div className="space-y-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-2xl shadow-inner overflow-hidden border border-slate-100">
                    {school?.logo ? (
                      <img src={school.logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <i className="fas fa-school"></i>
                    )}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">{school?.name}</h3>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">
                      {school?.motto || 'Institutional Profile'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSchoolEditModalOpen(true)}
                  className="bg-indigo-50 text-indigo-600 px-6 py-3 rounded-2xl text-sm font-black hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2"
                >
                  <i className="fas fa-edit"></i>编辑品牌信息
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:border-indigo-100 transition-colors">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">学校地址</label>
                  <p className="text-lg font-black text-slate-900">{school?.address || '未设置'}</p>
                </div>
                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:border-indigo-100 transition-colors">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">联系电话</label>
                  <p className="text-lg font-black text-slate-900">{school?.phone || '未设置'}</p>
                </div>
                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:border-indigo-100 transition-colors">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">学校官网</label>
                  <p className="text-lg font-black text-slate-900 truncate">
                    {school?.website ? (
                      <a href={school.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{school.website}</a>
                    ) : '未设置'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Students */}
          {activeTab === 'students' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl"><i className="fas fa-user-graduate"></i></div>
                  <div><h3 className="text-2xl font-black text-slate-900 tracking-tight">学生档案管理</h3><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Students</p></div>
                </div>
                <button onClick={openAddStudent} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl text-sm font-black shadow-xl flex items-center gap-2 transition-all active:scale-95"><i className="fas fa-user-plus"></i>录入新学生</button>
              </div>

              <div className="p-8 bg-slate-50/50 rounded-3xl border border-slate-100 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                  <input type="text" placeholder="按姓名或学号搜索..." className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                </div>
                <div className="flex gap-3">
                  <select className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500" value={filterGradeId} onChange={(e) => { setFilterGradeId(e.target.value); setFilterClassId(''); }}>
                    <option value="">全部年级</option>
                    {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <select className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500" value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)} disabled={!filterGradeId}>
                    <option value="">全部班级</option>
                    {classes.filter(c => c.gradeId === filterGradeId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-[2rem] border border-slate-100">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-black tracking-widest">
                    <tr className="border-b border-slate-100">
                      <th className="py-6 px-8">学生姓名</th>
                      <th className="py-6 px-8">学号</th>
                      <th className="py-6 px-8">所属年级/班级</th>
                      <th className="py-6 px-8">关联家长</th>
                      <th className="py-6 px-8 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredStudents.length === 0 ? (
                      <tr><td colSpan={5} className="py-20 text-center text-slate-300 font-bold italic">未检索到符合条件的学籍档案</td></tr>
                    ) : (
                      filteredStudents.map(s => {
                        const parents = getStudentParents(s.id);
                        return (
                          <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors group cursor-pointer" onClick={() => openStudentDetail(s)}>
                            <td className="py-6 px-8">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-sm">{s.name.charAt(0)}</div>
                                <span className="font-black text-slate-900 group-hover:text-indigo-600">{s.name}</span>
                              </div>
                            </td>
                            <td className="py-6 px-8 font-mono text-xs text-slate-400 tracking-wider">{s.studentNo}</td>
                            <td className="py-6 px-8">
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black">{grades.find(g => g.id === s.gradeId)?.name}</span>
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black">{classes.find(c => c.id === s.classId)?.name}</span>
                              </div>
                            </td>
                            <td className="py-6 px-8">
                              <div className="flex -space-x-2">
                                {parents.length === 0 ? (
                                  <span className="text-[10px] text-slate-300 font-bold italic">未绑定</span>
                                ) : (
                                  parents.map((p, i) => (
                                    <div key={p.id} className="w-7 h-7 bg-indigo-600 text-white border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black z-[1]" title={p.username}>
                                      {p.username.charAt(0).toUpperCase()}
                                    </div>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="py-6 px-8 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex justify-end gap-1">
                                <button onClick={() => openStudentDetail(s)} className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-white rounded-xl transition-all" title="查看详情"><i className="fas fa-eye text-sm"></i></button>
                                <button onClick={() => openEditStudent(s)} className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-amber-600 hover:bg-white rounded-xl transition-all" title="编辑资料"><i className="fas fa-user-edit text-sm"></i></button>
                                <button onClick={() => deleteStudent(s.id)} className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-white rounded-xl transition-all" title="注销学籍"><i className="fas fa-user-minus text-sm"></i></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Other tabs placeholder */}
          {activeTab === 'invites' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl"><i className="fas fa-paper-plane"></i></div>
                  <div><h3 className="text-2xl font-black text-slate-900 tracking-tight">家长邀请管理</h3></div>
                </div>
                <button onClick={openAddInvite} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-sm font-black transition-all">生成新邀请码</button>
              </div>
              <div className="grid gap-6">
                {invitations.map(inv => (
                  <div key={inv.id} className="p-8 bg-white border border-slate-100 rounded-[2rem] flex justify-between items-center">
                    <div>
                      <p className="text-lg font-black text-slate-900">{inv.code}</p>
                      <p className="text-xs font-bold text-slate-400">{grades.find(g => g.id === inv.gradeId)?.name}</p>
                    </div>
                    <button onClick={() => copyInviteLink(inv.code)} className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs hover:bg-indigo-600 hover:text-white transition-all">复制链接</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'semesters' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl"><i className="fas fa-calendar-check"></i></div>
                  <div><h3 className="text-2xl font-black text-slate-900 tracking-tight">学期管理</h3></div>
                </div>
                <button onClick={() => { setEditingSemester(null); setSemesterForm({ name: '' }); setIsSemesterModalOpen(true); }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-sm font-black transition-all">创建新学期</button>
              </div>
              <div className="grid gap-6">
                {semesters.map(s => (
                  <div key={s.id} className={`flex items-center justify-between p-8 rounded-[2rem] border ${s.isCurrent ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-100'}`}>
                    <div>
                      <p className="text-lg font-black text-slate-900">{s.name}</p>
                      {s.isCurrent && <span className="text-[10px] font-black text-indigo-600 uppercase">当前学期</span>}
                    </div>
                    <div className="flex gap-2">
                      {!s.isCurrent && <button onClick={() => handleSetCurrentSemester(s.id)} className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-xl text-xs font-black">设为当前</button>}
                      <button onClick={() => handleDeleteSemester(s.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><i className="fas fa-trash-alt"></i></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl"><i className="fas fa-chart-bar"></i></div>
                  <div><h3 className="text-2xl font-black text-slate-900 tracking-tight">考试管理</h3></div>
                </div>
                <button onClick={openAddExam} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-sm font-black transition-all">新建考试</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredExams.map(e => (
                  <div key={e.id} className="p-8 bg-white border border-slate-100 rounded-[2rem] flex justify-between items-center hover:border-indigo-100 transition-all">
                    <div>
                      <h4 className="font-black text-slate-900">{e.name}</h4>
                      <p className="text-xs font-bold text-slate-400">{e.date}</p>
                    </div>
                    <button onClick={() => handleDeleteExam(e.id)} className="text-slate-300 hover:text-red-500 p-2"><i className="fas fa-trash-alt"></i></button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* ... Add other tabs content here as needed ... */}
        </div>
      </div>

      {/* --- ALL MODALS --- */}

      {/* Student Detail Modal */}
      {isStudentDetailModalOpen && viewingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            <div className="p-10 pb-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center text-3xl font-black">{viewingStudent.name.charAt(0)}</div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{viewingStudent.name}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">学号: {viewingStudent.studentNo} · {grades.find(g => g.id === viewingStudent.gradeId)?.name} {classes.find(c => c.id === viewingStudent.classId)?.name}</p>
                </div>
              </div>
              <button onClick={() => setIsStudentDetailModalOpen(false)} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white rounded-2xl transition-all"><i className="fas fa-times"></i></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-slate-50/20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <GradeChart grades={getStudentGrades(viewingStudent.id)} exams={exams} student={viewingStudent} />
                  </div>
                  <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">历史成绩档案</h4></div>
                    <div className="divide-y divide-slate-50 p-4">
                      {getStudentGrades(viewingStudent.id).length === 0 ? <p className="text-center py-10 text-slate-300 italic">暂无记录</p> : 
                        getStudentGrades(viewingStudent.id).map(g => (
                          <div key={g.id} className="p-4 flex justify-between items-center"><p className="font-bold text-slate-900">{exams.find(e => e.id === g.examId)?.name}</p><p className="text-indigo-600 font-black">{g.grades.reduce((a,b)=>a+b.score,0)} 分</p></div>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">家庭成员</h4>
                      <button onClick={() => setIsSearchingParent(!isSearchingParent)} className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"><i className={`fas ${isSearchingParent ? 'fa-minus' : 'fa-plus'} text-xs`}></i></button>
                    </div>

                    {isSearchingParent && (
                      <div className="mb-6 space-y-3 animate-in slide-in-from-top-2">
                        <div className="relative">
                          <input type="text" placeholder="家长用户名或ID" className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none" value={parentSearchUsername} onChange={(e) => setParentSearchUsername(e.target.value)} />
                          <button onClick={handleLinkParent} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600 p-1 hover:bg-white rounded-lg transition-all"><i className="fas fa-search"></i></button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {getStudentParents(viewingStudent.id).length === 0 ? (
                        <div className="py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200"><p className="text-xs text-slate-400 italic">暂无家长关联</p></div>
                      ) : (
                        getStudentParents(viewingStudent.id).map(p => (
                          <div key={p.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group/parent">
                            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black">{p.username.charAt(0).toUpperCase()}</div>
                            <div className="flex-1 min-w-0"><p className="text-sm font-black text-slate-900 truncate">{p.username}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">家长</p></div>
                            <button onClick={() => handleUnlinkParent(p.id)} className="w-8 h-8 opacity-0 group-hover/parent:opacity-100 text-slate-300 hover:text-red-500 transition-all"><i className="fas fa-unlink text-xs"></i></button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8 border-t border-slate-50 flex justify-end gap-3 bg-white">
               <button onClick={() => { setIsStudentDetailModalOpen(false); openEditStudent(viewingStudent); }} className="px-8 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-xs font-black transition-all">修改档案</button>
               <button onClick={() => setIsStudentDetailModalOpen(false)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black transition-all">关闭预览</button>
            </div>
          </div>
        </div>
      )}

      {/* Basic Modals Placeholders */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl p-10 animate-in zoom-in">
            <h3 className="text-2xl font-black text-slate-900 mb-6">{editingStudent ? '编辑学生' : '添加学生'}</h3>
            <div className="space-y-4">
              <input type="text" placeholder="姓名" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} />
              <input type="text" placeholder="学号" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none" value={studentForm.studentNo} onChange={e => setStudentForm({...studentForm, studentNo: e.target.value})} />
              <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none" value={studentForm.gradeId} onChange={e => setStudentForm({...studentForm, gradeId: e.target.value})}>
                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none" value={studentForm.classId} onChange={e => setStudentForm({...studentForm, classId: e.target.value})}>
                {classes.filter(c => c.gradeId === studentForm.gradeId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={saveStudent} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl">保存学籍</button>
            </div>
          </div>
        </div>
      )}

      {/* Semester Modal */}
      {isSemesterModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 animate-in zoom-in">
            <h3 className="text-2xl font-black text-slate-900 mb-6">学期设置</h3>
            <input type="text" placeholder="学期名称" className="w-full p-4 bg-slate-50 rounded-2xl font-bold mb-4" value={semesterForm.name} onChange={e => setSemesterForm({name: e.target.value})} />
            <button onClick={saveSemester} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black">确认保存</button>
          </div>
        </div>
      )}

      {/* Grade Modal */}
      {isGradeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 animate-in zoom-in">
            <h3 className="text-2xl font-black text-slate-900 mb-6">年级设置</h3>
            <input type="text" placeholder="年级名称" className="w-full p-4 bg-slate-50 rounded-2xl font-bold mb-4" value={gradeForm.name} onChange={e => setGradeForm({name: e.target.value})} />
            <button onClick={saveGrade} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black">确认保存</button>
          </div>
        </div>
      )}

      {showImport && <GradeImport onClose={() => setShowImport(false)} onComplete={() => { refreshData(); setShowImport(false); }} schoolId={schoolId}/>}
    </div>
  );
};

export default AdminDashboard;
