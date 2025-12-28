
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../store';
import { User, Student, Exam, GradeRecord, GradeLevel, SchoolClass, Semester, AIAnalysisReport } from '../types';
import GradeImport from './GradeImport';
import GradeChart from '../components/GradeChart';
import { analyzeGrades } from '../geminiService';

interface TeacherDashboardProps {
  user: User;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState<'students' | 'exams'>('students');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Student Report Modal states
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [aiReport, setAiReport] = useState<AIAnalysisReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Exam Score List View
  const [viewingExamScores, setViewingExamScores] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');

  const schoolId = user.schoolId!;

  useEffect(() => {
    refreshData();
  }, [schoolId]);

  const refreshData = () => {
    setStudents(db.getStudents(schoolId));
    setExams(db.getExams(schoolId));
    setGrades(db.getGrades(schoolId));
    setGradeLevels(db.getGradeLevels(schoolId));
    setSchoolClasses(db.getClasses(schoolId));
    const allSemesters = db.getSemesters(schoolId);
    setSemesters(allSemesters);
    
    const currentSem = allSemesters.find(s => s.isCurrent);
    if (currentSem && !selectedSemesterId) {
      setSelectedSemesterId(currentSem.id);
    }
  };

  // 教师关联的班级
  const myClasses = useMemo(() => {
    return schoolClasses.filter(c => 
      c.classTeacherId === user.id || 
      Object.values(c.subjectTeachers || {}).includes(user.id)
    );
  }, [schoolClasses, user.id]);

  const handleImportComplete = () => {
    refreshData();
    setShowImport(false);
  };

  const handleDeleteExam = (examId: string) => {
    if (window.confirm('警告：删除考试将永久删除该场考试下的所有学生成绩！确定要继续吗？')) {
      db.deleteExam(examId, schoolId);
      refreshData();
      if (selectedExamId === examId) setSelectedExamId(null);
    }
  };

  const handleEditScore = (gradeId: string, subject: string, oldScore: number) => {
    const newScore = prompt(`修改 ${subject} 成绩`, String(oldScore));
    if (newScore !== null && !isNaN(Number(newScore))) {
      const allGrades = db.getGrades(schoolId);
      const updated = allGrades.map(g => {
        if (g.id === gradeId) {
          return {
            ...g,
            grades: g.grades.map(sg => sg.subject === subject ? { ...sg, score: Number(newScore) } : sg)
          };
        }
        return g;
      });
      db.saveGrades(updated, schoolId);
      refreshData();
    }
  };

  const handleViewReport = async (student: Student) => {
    setSelectedStudent(student);
    setAiReport(null);
    const studentGrades = grades.filter(g => g.studentId === student.id);
    if (studentGrades.length > 0) {
      setIsAnalyzing(true);
      try {
        const report = await analyzeGrades(student, studentGrades, exams);
        setAiReport(report);
      } catch (err) {
        console.error(err);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.studentNo.includes(searchQuery);
      const matchesGrade = selectedGradeId ? s.gradeId === selectedGradeId : true;
      const matchesClass = selectedClassId ? s.classId === selectedClassId : true;
      
      // 默认情况下教师只能看到自己所带班级的学生
      const isMyStudent = myClasses.some(c => c.id === s.classId);
      
      return matchesSearch && matchesGrade && matchesClass && isMyStudent;
    });
  }, [students, searchQuery, selectedGradeId, selectedClassId, myClasses]);

  const filteredExams = useMemo(() => {
    return exams.filter(e => selectedSemesterId ? e.semesterId === selectedSemesterId : true)
                .sort((a, b) => b.date.localeCompare(a.date));
  }, [exams, selectedSemesterId]);

  const availableClasses = useMemo(() => {
    return myClasses.filter(c => !selectedGradeId || c.gradeId === selectedGradeId);
  }, [myClasses, selectedGradeId]);

  const getExamStats = (examId: string) => {
    const examGrades = grades.filter(g => g.examId === examId);
    if (examGrades.length === 0) return null;
    const subjectsMap: Record<string, { total: number; count: number; max: number; min: number }> = {};
    examGrades.forEach(record => {
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

  const getStudentCountForExam = (examId: string) => {
    return grades.filter(g => g.examId === examId).length;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">教师管理终端</h2>
          <p className="text-slate-500 font-medium">
            {myClasses.length > 0 ? `当前负责 ${myClasses.length} 个班级的教学工作` : '数据驱动教学，AI 赋能成长'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 transition-all shadow-xl shadow-indigo-100 active:scale-95"
          >
            <i className="fas fa-plus"></i>
            导入新成绩
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-50 px-4 bg-white sticky top-0 z-10">
          {['students', 'exams'].map(tab => (
            <button 
              key={tab}
              onClick={() => { setActiveTab(tab as any); setViewingExamScores(null); }}
              className={`px-8 py-6 font-black text-sm transition-all border-b-4 uppercase tracking-widest ${
                activeTab === tab 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-300 hover:text-slate-600'
              }`}
            >
              {tab === 'students' ? '我的学生' : '考试中心'}
            </button>
          ))}
        </div>

        <div className="p-0">
          {activeTab === 'students' ? (
            <div className="space-y-6">
              <div className="p-8 bg-slate-50/50 border-b border-slate-50 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><i className="fas fa-search"></i></span>
                  <input type="text" placeholder="搜索姓名或学号..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"/>
                </div>
                <select value={selectedGradeId} onChange={(e) => { setSelectedGradeId(e.target.value); setSelectedClassId(''); }} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600">
                  <option value="">所有年级</option>
                  {gradeLevels.filter(gl => myClasses.some(c => c.gradeId === gl.id)).map(gl => <option key={gl.id} value={gl.id}>{gl.name}</option>)}
                </select>
                <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600">
                  <option value="">所有负责班级</option>
                  {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="flex items-center justify-end px-2"><p className="text-xs font-black text-slate-400 uppercase tracking-widest">检索到 {filteredStudents.length} 位学生</p></div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                    <tr>
                      <th className="px-8 py-5">学生姓名</th>
                      <th className="px-8 py-5">学号</th>
                      <th className="px-8 py-5">班级角色</th>
                      <th className="px-8 py-5">年级班级</th>
                      <th className="px-8 py-5 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {filteredStudents.map(s => {
                      const classInfo = schoolClasses.find(c => c.id === s.classId);
                      const isClassTeacher = classInfo?.classTeacherId === user.id;
                      return (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-8 py-5 flex items-center gap-3"><div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-black text-xs">{s.name.charAt(0)}</div><span className="font-black text-slate-900">{s.name}</span></td>
                          <td className="px-8 py-5 font-mono text-slate-400 text-xs tracking-wider">{s.studentNo}</td>
                          <td className="px-8 py-5">
                            {isClassTeacher ? (
                              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-black uppercase">班主任</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-[10px] font-black uppercase">科任教师</span>
                            )}
                          </td>
                          <td className="px-8 py-5"><span className="text-slate-500 font-bold">{gradeLevels.find(g => g.id === s.gradeId)?.name} · {classInfo?.name}</span></td>
                          <td className="px-8 py-5 text-right">
                            <button 
                              onClick={() => handleViewReport(s)} 
                              className="bg-white border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ml-auto"
                            >
                              <i className="fas fa-brain text-[10px]"></i>
                              诊断档案
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            // ... Exam management remains similar but filter based on permissions if needed
            <div className="space-y-6">
              {viewingExamScores ? (
                <div className="p-8 space-y-8 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setViewingExamScores(null)} className="text-slate-400 hover:text-indigo-600 flex items-center gap-2 font-black text-xs uppercase tracking-widest"><i className="fas fa-arrow-left"></i> 返回列表</button>
                    <h3 className="text-xl font-black text-slate-900">{exams.find(e => e.id === viewingExamScores)?.name} - 成绩明细</h3>
                    <div className="flex gap-2">
                       <button className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black"><i className="fas fa-file-export mr-2"></i>导出</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto border border-slate-100 rounded-3xl">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                          <th className="px-6 py-4">姓名/学号</th>
                          {Array.from(new Set(grades.filter(g => g.examId === viewingExamScores).flatMap(g => g.grades.map(sg => sg.subject)))).map(sub => (
                            <th key={sub} className="px-6 py-4">{sub}</th>
                          ))}
                          <th className="px-6 py-4 text-right">总分</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {grades.filter(g => g.examId === viewingExamScores).map(g => {
                          const student = students.find(s => s.id === g.studentId);
                          // 仅显示教师有权限查看的学生成绩（教师带的班级）
                          if (!myClasses.some(c => c.id === student?.classId)) return null;
                          const total = g.grades.reduce((acc, curr) => acc + curr.score, 0);
                          return (
                            <tr key={g.id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4"><p className="font-black text-slate-900">{student?.name}</p><p className="text-[10px] font-mono text-slate-400">{student?.studentNo}</p></td>
                              {g.grades.map(sg => (
                                <td key={sg.subject} className="px-6 py-4">
                                  <button onClick={() => handleEditScore(g.id, sg.subject, sg.score)} className={`font-bold hover:text-indigo-600 ${sg.score < 60 ? 'text-rose-500' : 'text-slate-600'}`}>
                                    {sg.score}
                                  </button>
                                </td>
                              ))}
                              <td className="px-6 py-4 text-right font-black text-indigo-600">{total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-8 bg-slate-50/50 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="w-full md:w-80">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">按学期筛选</label>
                      <select 
                        value={selectedSemesterId} 
                        onChange={(e) => setSelectedSemesterId(e.target.value)} 
                        className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-700"
                      >
                        <option value="">全部学期</option>
                        {semesters.map(sem => (
                          <option key={sem.id} value={sem.id}>{sem.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="px-8 pb-10 space-y-6">
                    {filteredExams.map(e => {
                      const isSelected = selectedExamId === e.id;
                      const stats = getExamStats(e.id);
                      const studentCount = getStudentCountForExam(e.id);
                      return (
                        <div key={e.id} className={`group border-2 rounded-[2rem] overflow-hidden transition-all ${isSelected ? 'border-indigo-600 bg-white shadow-xl' : 'border-slate-50 bg-white hover:border-indigo-100'}`}>
                          <div className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 cursor-pointer" onClick={() => setSelectedExamId(isSelected ? null : e.id)}>
                            <div className="flex items-center gap-6">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-all ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                <i className="fas fa-file-invoice"></i>
                              </div>
                              <div>
                                <h4 className="font-black text-slate-900 text-lg">{e.name}</h4>
                                <p className="text-xs font-bold text-slate-400 mt-1">{e.date} · {studentCount} 人参与</p>
                              </div>
                            </div>
                            <button onClick={(evt) => { evt.stopPropagation(); setViewingExamScores(e.id); }} className="px-6 py-3 bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white rounded-2xl text-xs font-black transition-all">
                              成绩录入 / 详情
                            </button>
                          </div>
                          {isSelected && stats && (
                            <div className="px-8 pb-8 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
                               {stats.map(s => (
                                 <div key={s.subject} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.subject}</p>
                                   <p className="text-2xl font-black text-indigo-600">{s.avg}</p>
                                   <div className="flex gap-2 mt-2">
                                     <span className="text-[9px] font-bold text-emerald-500">高: {s.max}</span>
                                     <span className="text-[9px] font-bold text-rose-400">低: {s.min}</span>
                                   </div>
                                 </div>
                               ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Student Report Modal remains same as before */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            <div className="p-10 pb-6 border-b border-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-2xl font-black">{selectedStudent.name.charAt(0)}</div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedStudent.name} 的学情诊断</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">NO: {selectedStudent.studentNo} · {gradeLevels.find(g => g.id === selectedStudent.gradeId)?.name} {schoolClasses.find(c => c.id === selectedStudent.classId)?.name}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-slate-600 p-2"><i className="fas fa-times"></i></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-10 space-y-10">
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <GradeChart 
                  grades={grades.filter(g => g.studentId === selectedStudent.id)} 
                  exams={exams} 
                  student={selectedStudent}
                />
              </div>
              <div className="space-y-8">
                  {isAnalyzing ? (
                    <div className="py-20 text-center space-y-4">
                      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">AI 深度分析中...</p>
                    </div>
                  ) : aiReport ? (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2">
                       <div className="p-6 bg-indigo-600 text-white rounded-[2rem]">
                         <h5 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">综合评估</h5>
                         <p className="font-bold leading-relaxed">{aiReport.overallAssessment}</p>
                       </div>
                       <div className="grid grid-cols-2 gap-6">
                         <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                           <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">表现优势</h5>
                           <ul className="space-y-2">{aiReport.strengths.map((s,i) => <li key={i} className="text-xs font-bold text-emerald-800 flex gap-2"><span>•</span>{s}</li>)}</ul>
                         </div>
                         <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100">
                           <h5 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-3">待改进项</h5>
                           <ul className="space-y-2">{aiReport.weaknesses.map((w,i) => <li key={i} className="text-xs font-bold text-rose-800 flex gap-2"><span>•</span>{w}</li>)}</ul>
                         </div>
                       </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-slate-300 italic">请点击学生列表中的诊断按钮</div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showImport && <GradeImport onClose={() => setShowImport(false)} onComplete={handleImportComplete} schoolId={schoolId}/>}
    </div>
  );
};

export default TeacherDashboard;
