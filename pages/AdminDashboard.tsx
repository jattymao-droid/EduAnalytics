import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../store.ts';
import { User, School, Semester, GradeLevel, SchoolClass, Student, UserRole, Exam, GradeRecord, Invitation, DEFAULT_SUBJECTS } from '../types.ts';
import GradeImport from './GradeImport.tsx';
import GradeChart from '../components/GradeChart.tsx';

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

  // Modals
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSchoolEditModalOpen, setIsSchoolEditModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  
  // Forms
  const [studentForm, setStudentForm] = useState({ name: '', studentNo: '', gradeId: '', classId: '' });
  const [teacherForm, setTeacherForm] = useState({ username: '', password: '', realName: '', gender: 'MALE' as 'MALE' | 'FEMALE' });
  const [semesterForm, setSemesterForm] = useState({ name: '' });
  const [gradeForm, setGradeForm] = useState({ name: '' });
  const [classForm, setClassForm] = useState({ name: '', gradeId: '', classTeacherId: '', subjectTeachers: {} as Record<string, string> });
  const [schoolForm, setSchoolForm] = useState<Partial<School>>({});
  const [inviteForm, setInviteForm] = useState({ gradeId: '', code: '' });

  const [studentSearch, setStudentSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [classFilterGradeId, setClassFilterGradeId] = useState('');

  const schoolId = user.schoolId!;

  useEffect(() => {
    refreshData();
  }, [schoolId]);

  const refreshData = async () => {
    const schools = await db.getSchools();
    const currentSchool = schools.find(s => s.id === schoolId) || null;
    setSchool(currentSchool);
    if (currentSchool) setSchoolForm(currentSchool);

    const [semestersData, gradesData, classesData, studentsData, usersData, examsData, gradesRecordsData, invitesData] = await Promise.all([
      db.getSemesters(schoolId),
      db.getGradeLevels(schoolId),
      db.getClasses(schoolId),
      db.getStudents(schoolId),
      db.getUsers(),
      db.getExams(schoolId),
      db.getGrades(schoolId),
      db.getInvitations()
    ]);

    setSemesters(semestersData);
    setGrades(gradesData);
    setClasses(classesData);
    setStudents(studentsData);
    setAllUsers(usersData);
    setTeachers(usersData.filter(u => u.role === UserRole.TEACHER && u.schoolId === schoolId));
    setExams(examsData);
    setGradeRecords(gradesRecordsData);
    setInvitations(invitesData.filter(i => i.schoolId === schoolId));
  };

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

  const saveSchoolInfo = async () => {
    if (!schoolForm.name?.trim()) return alert('学校名称不能为空');
    const schoolsData = await db.getSchools();
    const updated = schoolsData.map(s => s.id === schoolId ? { ...s, ...schoolForm } as School : s);
    await db.saveSchools(updated);
    setIsSchoolEditModalOpen(false);
    refreshData();
    if (onSchoolUpdate) {
      const current = updated.find(s => s.id === schoolId);
      if (current) onSchoolUpdate(current);
    }
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setInviteForm(prev => ({ ...prev, code }));
  };

  const saveInvite = async () => {
    if (!inviteForm.gradeId || !inviteForm.code) return alert('请完整填写');
    const newInv: Invitation = { id: 'inv_' + Date.now(), schoolId, gradeId: inviteForm.gradeId, code: inviteForm.code, createdAt: new Date().toISOString() };
    await db.saveInvitations([...invitations, newInv], schoolId);
    setIsInviteModalOpen(false); refreshData();
  };

  const handleSetCurrentSemester = async (id: string) => {
    await db.saveSemesters(semesters.map(s => ({ ...s, isCurrent: s.id === id })), schoolId);
    refreshData();
  };

  const saveGrade = async () => {
    if (!gradeForm.name.trim()) return alert('请输入名称');
    await db.saveGradeLevels([...grades, { id: 'gl_' + Date.now(), schoolId, name: gradeForm.name }], schoolId);
    setIsGradeModalOpen(false); refreshData();
  };

  const saveClass = async () => {
    if (!classForm.name.trim()) return alert('请输入名称');
    await db.saveClasses([...classes, { id: 'cl_' + Date.now(), schoolId, ...classForm }], schoolId);
    setIsClassModalOpen(false); refreshData();
  };

  const saveTeacher = async () => {
    if (!teacherForm.username || !teacherForm.realName) return alert('请完整填写');
    const users = await db.getUsers();
    const newUser: User = { id: 'u_' + Date.now(), ...teacherForm, role: UserRole.TEACHER, schoolId };
    await db.saveUsers([...users, newUser]);
    setIsTeacherModalOpen(false); refreshData();
  };

  const saveStudent = async () => {
    if (!studentForm.name || !studentForm.classId) return alert('请完整填写');
    await db.saveStudents([...students, { id: 'stu_' + Date.now(), schoolId, ...studentForm }], schoolId);
    setIsStudentModalOpen(false); refreshData();
  };

  const filteredGradesAndClasses = useMemo(() => {
    return grades.filter(g => !classFilterGradeId || g.id === classFilterGradeId).map(g => {
      const matchedClasses = classes.filter(c => c.gradeId === g.id && (!classSearch || c.name.toLowerCase().includes(classSearch.toLowerCase())));
      return { ...g, classes: matchedClasses };
    }).filter(g => g.classes.length > 0 || !classSearch);
  }, [grades, classes, classSearch, classFilterGradeId]);

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-72 flex-shrink-0">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 space-y-2 sticky top-28">
          {[
            { id: 'info', icon: 'fa-school', label: '学校概况' },
            { id: 'invites', icon: 'fa-paper-plane', label: '邀请管理' },
            { id: 'semesters', icon: 'fa-calendar-alt', label: '学期管理' },
            { id: 'grades', icon: 'fa-layer-group', label: '年级与班级' },
            { id: 'teachers', icon: 'fa-chalkboard-teacher', label: '教师管理' },
            { id: 'students', icon: 'fa-user-graduate', label: '学生管理' },
            { id: 'exams', icon: 'fa-chart-bar', label: '考试与成绩' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'}`}>
              <i className={`fas ${tab.icon} w-5 text-center`}></i>{tab.label}
            </button>
          ))}
        </div>
      </aside>
      
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 min-h-[600px] animate-in fade-in duration-500">
          {activeTab === 'info' && (
            <div className="space-y-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-2xl border border-slate-100 overflow-hidden shadow-inner">
                    {school?.logo ? <img src={school.logo} alt="Logo" className="w-full h-full object-cover" /> : <i className="fas fa-school"></i>}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">{school?.name || '未设置学校名称'}</h3>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">{school?.motto || '智教云 - 数据驱动未来'}</p>
                  </div>
                </div>
                <button onClick={() => setIsSchoolEditModalOpen(true)} className="bg-indigo-50 text-indigo-600 px-6 py-3 rounded-2xl text-sm font-black hover:bg-indigo-600 hover:text-white transition-all shadow-sm">编辑品牌</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 bg-slate-50 rounded-3xl">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">校园地址</p>
                  <p className="font-bold text-slate-700">{school?.address || '暂未填写'}</p>
                </div>
                <div className="p-8 bg-slate-50 rounded-3xl">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">联系咨询</p>
                  <p className="font-bold text-slate-700">{school?.phone || '暂未填写'}</p>
                </div>
                <div className="p-8 bg-slate-50 rounded-3xl">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2">官方网站</p>
                  <p className="font-bold text-slate-700">{school?.website || '暂未填写'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'semesters' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900">学期配置</h3>
                <button onClick={() => { setSemesterForm({ name: '' }); setIsSemesterModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold">添加学期</button>
              </div>
              <div className="grid gap-4">
                {semesters.map(s => (
                  <div key={s.id} className="p-6 border rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="font-black text-lg">{s.name}</p>
                      {s.isCurrent && <span className="text-xs font-black text-indigo-600 uppercase">当前学期</span>}
                    </div>
                    {!s.isCurrent && <button onClick={() => handleSetCurrentSemester(s.id)} className="text-sm font-bold text-slate-400 hover:text-indigo-600">设为当前</button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'grades' && (
            <div className="space-y-10">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900">年级与班级</h3>
                <button onClick={() => { setGradeForm({ name: '' }); setIsGradeModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold">添加年级</button>
              </div>
              {filteredGradesAndClasses.map(grade => (
                <div key={grade.id} className="border border-slate-100 rounded-[2rem] overflow-hidden mb-8">
                  <div className="px-8 py-4 bg-slate-50 flex justify-between items-center">
                    <h4 className="font-black text-lg">{grade.name}</h4>
                    <button onClick={() => { setClassForm({ name: '', gradeId: grade.id, classTeacherId: '', subjectTeachers: {} }); setIsClassModalOpen(true); }} className="text-indigo-600 font-bold text-sm">添加班级</button>
                  </div>
                  <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {grade.classes.map(c => (
                      <div key={c.id} className="p-4 border rounded-xl">
                        <p className="font-black">{c.name}</p>
                        <p className="text-xs text-slate-400">班主任: {teachers.find(t => t.id === c.classTeacherId)?.realName || '未指定'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'teachers' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900">教师管理</h3>
                <button onClick={() => { setTeacherForm({ username: '', password: '', realName: '', gender: 'MALE' }); setIsTeacherModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold">录入教师</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {teachers.map(t => (
                  <div key={t.id} className="p-6 border rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-black">{t.realName?.charAt(0)}</div>
                    <div><p className="font-black">{t.realName}</p><p className="text-xs text-slate-400">{t.username}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900">学生名册</h3>
                <button onClick={() => { setStudentForm({ name: '', studentNo: '', gradeId: '', classId: '' }); setIsStudentModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold">添加学生</button>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl flex gap-4">
                <input type="text" placeholder="搜索学生..." className="flex-1 p-2 rounded-lg" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
              </div>
              <table className="w-full text-left border-collapse">
                <thead className="text-[10px] text-slate-400 font-black uppercase">
                  <tr className="border-b"><th className="pb-4">姓名</th><th className="pb-4">学号</th><th className="pb-4">年级班级</th></tr>
                </thead>
                <tbody className="divide-y">
                  {students.filter(s => s.name.includes(studentSearch)).map(s => (
                    <tr key={s.id}><td className="py-4 font-bold">{s.name}</td><td className="py-4 font-mono text-xs">{s.studentNo}</td><td className="py-4 text-xs font-bold text-slate-500">{grades.find(g => g.id === s.gradeId)?.name} {classes.find(c => c.id === s.classId)?.name}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900">考试成绩</h3>
                <button onClick={() => setShowImport(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold">导入成绩单</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {exams.map(e => (
                  <div key={e.id} className="p-6 border rounded-2xl hover:border-indigo-600 transition-all cursor-pointer">
                    <p className="font-black text-lg">{e.name}</p>
                    <p className="text-xs text-slate-400">{e.date}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'invites' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900">家长邀请码</h3>
                <button onClick={() => { generateInviteCode(); setIsInviteModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold">生成新码</button>
              </div>
              <div className="grid gap-4">
                {invitations.map(inv => (
                  <div key={inv.id} className="p-6 border rounded-2xl flex justify-between items-center">
                    <span className="font-mono font-black text-xl text-indigo-600">{inv.code}</span>
                    <span className="text-sm font-bold">{grades.find(g => g.id === inv.gradeId)?.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- ALL MODALS --- */}

      {/* Brand Edit Modal */}
      {isSchoolEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 shadow-2xl animate-in zoom-in">
            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">编辑校园品牌</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="relative group">
                  <div className="w-20 h-20 bg-white rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center text-3xl text-slate-300">
                    {schoolForm.logo ? <img src={schoolForm.logo} className="w-full h-full object-cover" /> : <i className="fas fa-school"></i>}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-indigo-600/80 text-white opacity-0 group-hover:opacity-100 cursor-pointer rounded-2xl transition-opacity">
                    <i className="fas fa-camera"></i>
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </label>
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">学校标志 (Logo)</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">点击图标进行更换</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">学校名称</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm" value={schoolForm.name || ''} onChange={e => setSchoolForm({...schoolForm, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">校训 / 简介</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm" value={schoolForm.motto || ''} onChange={e => setSchoolForm({...schoolForm, motto: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">校园电话</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm" value={schoolForm.phone || ''} onChange={e => setSchoolForm({...schoolForm, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">官方网站</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm" value={schoolForm.website || ''} onChange={e => setSchoolForm({...schoolForm, website: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">学校地址</label>
                <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-sm" value={schoolForm.address || ''} onChange={e => setSchoolForm({...schoolForm, address: e.target.value})} />
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsSchoolEditModalOpen(false)} className="flex-1 py-4 font-black text-slate-400">取消</button>
                <button onClick={saveSchoolInfo} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl">保存品牌信息</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Semester Modal */}
      {isSemesterModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in">
            <h4 className="text-xl font-black mb-6">添加新学期</h4>
            <input type="text" className="w-full p-4 border rounded-2xl mb-6 font-bold" value={semesterForm.name} onChange={e => setSemesterForm({name: e.target.value})} placeholder="例如：2024秋季学期" />
            <div className="flex gap-4">
              <button onClick={() => setIsSemesterModalOpen(false)} className="flex-1 font-bold text-slate-400">取消</button>
              <button onClick={async () => {
                if (!semesterForm.name) return;
                await db.saveSemesters([...semesters, { id: 'sem_'+Date.now(), schoolId, name: semesterForm.name, isCurrent: semesters.length === 0 }], schoolId);
                setIsSemesterModalOpen(false); refreshData();
              }} className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg">确认添加</button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in">
            <h4 className="text-xl font-black mb-6">生成家长邀请码</h4>
            <div className="space-y-6">
              <select className="w-full p-4 border rounded-2xl font-bold" value={inviteForm.gradeId} onChange={e => setInviteForm({...inviteForm, gradeId: e.target.value})}>
                <option value="">选择适用年级</option>
                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <div className="text-center">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">生成结果</p>
                <p className="text-5xl font-black font-mono text-indigo-600 py-4 tracking-wider">{inviteForm.code}</p>
              </div>
              <button onClick={saveInvite} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg">发布邀请码</button>
              <button onClick={() => setIsInviteModalOpen(false)} className="w-full font-bold text-slate-400">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Modal */}
      {isGradeModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in">
            <h4 className="text-xl font-black mb-6">添加年级</h4>
            <input type="text" className="w-full p-4 border rounded-2xl mb-6 font-bold" value={gradeForm.name} onChange={e => setGradeForm({name: e.target.value})} placeholder="年级名称" />
            <button onClick={saveGrade} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg">保存</button>
            <button onClick={() => setIsGradeModalOpen(false)} className="w-full mt-4 font-bold text-slate-400">取消</button>
          </div>
        </div>
      )}

      {/* Class Modal */}
      {isClassModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in">
            <h4 className="text-xl font-black mb-6">添加班级</h4>
            <div className="space-y-4">
              <input type="text" className="w-full p-4 border rounded-xl font-bold" value={classForm.name} onChange={e => setClassForm({...classForm, name: e.target.value})} placeholder="班级名称" />
              <select className="w-full p-4 border rounded-xl font-bold" value={classForm.classTeacherId} onChange={e => setClassForm({...classForm, classTeacherId: e.target.value})}>
                <option value="">选择班主任</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.realName}</option>)}
              </select>
              <button onClick={saveClass} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg">保存</button>
              <button onClick={() => setIsClassModalOpen(false)} className="w-full font-bold text-slate-400">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Modal */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in">
            <h4 className="text-xl font-black mb-6">注册教师账号</h4>
            <div className="space-y-4">
              <input type="text" className="w-full p-4 border rounded-2xl font-bold" value={teacherForm.realName} onChange={e => setTeacherForm({...teacherForm, realName: e.target.value})} placeholder="教师真实姓名" />
              <input type="text" className="w-full p-4 border rounded-2xl font-bold" value={teacherForm.username} onChange={e => setTeacherForm({...teacherForm, username: e.target.value})} placeholder="登录用户名" />
              <input type="password" name="new-password" placeholder="初始密码" className="w-full p-4 border rounded-2xl font-bold" value={teacherForm.password} onChange={e => setTeacherForm({...teacherForm, password: e.target.value})} />
              <button onClick={saveTeacher} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg">确认录入</button>
              <button onClick={() => setIsTeacherModalOpen(false)} className="w-full font-bold text-slate-400">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Student Modal */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in">
            <h4 className="text-xl font-black mb-6">添加学生档案</h4>
            <div className="space-y-4">
              <input type="text" className="w-full p-4 border rounded-2xl font-bold" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} placeholder="姓名" />
              <input type="text" className="w-full p-4 border rounded-2xl font-bold" value={studentForm.studentNo} onChange={e => setStudentForm({...studentForm, studentNo: e.target.value})} placeholder="学号" />
              <select className="w-full p-4 border rounded-2xl font-bold" value={studentForm.gradeId} onChange={e => setStudentForm({...studentForm, gradeId: e.target.value, classId: ''})}>
                <option value="">选择年级</option>
                {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select className="w-full p-4 border rounded-2xl font-bold" value={studentForm.classId} onChange={e => setStudentForm({...studentForm, classId: e.target.value})} disabled={!studentForm.gradeId}>
                <option value="">选择班级</option>
                {classes.filter(c => c.gradeId === studentForm.gradeId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={saveStudent} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg">确认添加</button>
              <button onClick={() => setIsStudentModalOpen(false)} className="w-full font-bold text-slate-400">取消</button>
            </div>
          </div>
        </div>
      )}

      {showImport && <GradeImport onClose={() => setShowImport(false)} onComplete={() => { refreshData(); setShowImport(false); }} schoolId={schoolId} user={user} />}
    </div>
  );
};

export default AdminDashboard;