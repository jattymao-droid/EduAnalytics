
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../store';
import { User, Student, GradeRecord, Exam, AIAnalysisReport, GradeLevel, SchoolClass, School, Invitation } from '../types';
import GradeChart from '../components/GradeChart';
import { analyzeGrades } from '../geminiService';

interface ParentDashboardProps {
  user: User;
  onUserUpdate: (user: User) => void;
  initialInviteCode?: string | null;
}

const ParentDashboard: React.FC<ParentDashboardProps> = ({ user, onUserUpdate, initialInviteCode }) => {
  const [children, setChildren] = useState<Student[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [childGrades, setChildGrades] = useState<GradeRecord[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  
  const [isBinding, setIsBinding] = useState(false);
  const [bindingStep, setBindingStep] = useState<'input' | 'verify'>('input');
  const [bindMode, setBindMode] = useState<'code' | 'manual'>('code');
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  
  const [bindForm, setBindForm] = useState({ 
    schoolId: '', 
    gradeId: '', 
    classId: '', 
    name: '', 
    relationship: '父亲',
    inviteCode: initialInviteCode || ''
  });
  
  const [schools, setSchools] = useState<School[]>([]);
  const [availableGrades, setAvailableGrades] = useState<GradeLevel[]>([]);
  const [availableClasses, setAvailableClasses] = useState<SchoolClass[]>([]);

  const [aiReport, setAiReport] = useState<AIAnalysisReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    refreshData();
    setSchools(db.getSchools());
    if (initialInviteCode) {
      setIsBinding(true);
      setBindMode('code');
    }
  }, [user, initialInviteCode]);

  const refreshData = () => {
    const students = db.getStudents();
    const myChildren = students.filter(s => user.childIds?.includes(s.id));
    setChildren(myChildren);
    if (myChildren.length > 0 && !selectedChildId) {
      setSelectedChildId(myChildren[0].id);
    }
  };

  useEffect(() => {
    if (selectedChildId) {
      const child = children.find(c => c.id === selectedChildId);
      if (child) {
        const schoolId = child.schoolId;
        setChildGrades(db.getGrades(schoolId).filter(g => g.studentId === selectedChildId));
        setExams(db.getExams(schoolId));
      }
      setAiReport(null);
    }
  }, [selectedChildId, children]);

  // Cascading Logic
  useEffect(() => {
    if (bindForm.schoolId) {
      setAvailableGrades(db.getGradeLevels(bindForm.schoolId));
    } else {
      setAvailableGrades([]);
    }
  }, [bindForm.schoolId]);

  useEffect(() => {
    if (bindForm.gradeId) {
      const classes = db.getClasses(bindForm.schoolId);
      setAvailableClasses(classes.filter(c => c.gradeId === bindForm.gradeId));
    } else {
      setAvailableClasses([]);
    }
  }, [bindForm.gradeId, bindForm.schoolId]);

  const handleVerifyStudent = () => {
    let targetSchoolId = bindForm.schoolId;
    let targetGradeId = bindForm.gradeId;

    if (bindMode === 'code') {
      const invite = db.getInvitationByCode(bindForm.inviteCode.toUpperCase());
      if (!invite) {
        alert('邀请码无效或已失效');
        return;
      }
      targetSchoolId = invite.schoolId;
      targetGradeId = invite.gradeId;
    }

    const { classId, name } = bindForm;
    if (!targetSchoolId || !targetGradeId || !classId || !name) {
      alert('请完整填写所有查找信息');
      return;
    }

    const allStudents = db.getStudents(targetSchoolId);
    const found = allStudents.find(s => 
      s.name === name && 
      s.gradeId === targetGradeId && 
      s.classId === classId
    );

    if (found) {
      if (user.childIds?.includes(found.id)) {
        alert('该孩子已经绑定在您的名下了');
        return;
      }
      // Update form context with resolved IDs for manual confirmation if needed
      setBindForm(prev => ({ ...prev, schoolId: targetSchoolId, gradeId: targetGradeId }));
      setFoundStudent(found);
      setBindingStep('verify');
    } else {
      alert('未找到匹配的学生，请检查班级及姓名是否完全正确。');
    }
  };

  const handleConfirmBind = () => {
    if (!foundStudent) return;

    const users = db.getUsers();
    let updatedUser: User | null = null;
    const updatedUsers = users.map(u => {
      if (u.id === user.id) {
        updatedUser = { ...u, childIds: Array.from(new Set([...(u.childIds || []), foundStudent.id])) };
        return updatedUser;
      }
      return u;
    });
    
    if (updatedUser) {
      db.saveUsers(updatedUsers);
      onUserUpdate(updatedUser);
      setIsBinding(false);
      setBindingStep('input');
      setFoundStudent(null);
      setBindForm({ schoolId: '', gradeId: '', classId: '', name: '', relationship: '父亲', inviteCode: '' });
    }
  };

  const handleAIAnalysis = async () => {
    if (!selectedChildId || childGrades.length === 0) return;
    setIsAnalyzing(true);
    try {
      const student = children.find(c => c.id === selectedChildId)!;
      const report = await analyzeGrades(student, childGrades, exams, '家长');
      setAiReport(report);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectedChild = children.find(c => c.id === selectedChildId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">家长服务中心</h2>
          <p className="text-slate-500 font-medium">关注孩子的成长曲线，获取 AI 深度学情诊断</p>
        </div>
        <button 
          onClick={() => { setIsBinding(true); setBindingStep('input'); setBindMode('code'); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl text-sm font-black transition-all shadow-xl shadow-indigo-100 flex items-center gap-3 active:scale-95 group"
        >
          <i className="fas fa-link group-hover:rotate-12 transition-transform"></i>
          绑定孩子账号
        </button>
      </div>

      {children.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-24 text-center">
          <div className="w-24 h-24 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <i className="fas fa-user-plus text-4xl"></i>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">开启智慧学情分析</h3>
          <p className="text-slate-400 max-w-sm mx-auto mb-10 font-medium leading-relaxed">
            目前尚未关联孩子账号。请使用老师提供的<b>邀请码</b>或手动选择学校班级进行绑定。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => { setIsBinding(true); setBindingStep('input'); setBindMode('code'); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-2xl font-black transition-all shadow-2xl shadow-indigo-100 active:scale-95"
            >
              使用邀请码绑定
            </button>
            <button 
              onClick={() => { setIsBinding(true); setBindingStep('input'); setBindMode('manual'); }}
              className="bg-white border-2 border-slate-200 text-slate-600 px-10 py-5 rounded-2xl font-black transition-all hover:bg-slate-50 active:scale-95"
            >
              手动查找绑定
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8">
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`px-8 py-4 rounded-2xl text-sm font-black whitespace-nowrap transition-all border-2 flex items-center gap-3 ${
                    selectedChildId === child.id 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' 
                      : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <i className="fas fa-user-graduate"></i>
                  {child.name}
                </button>
              ))}
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">成长趋势分析</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Academic progress chart</p>
                  </div>
                </div>
              </div>
              {childGrades.length > 0 ? (
                <GradeChart grades={childGrades} exams={exams} student={selectedChild} />
              ) : (
                <div className="h-60 flex flex-col items-center justify-center text-slate-300 gap-4">
                  <i className="fas fa-chart-area text-4xl opacity-20"></i>
                  <p className="font-bold italic">该孩子暂无考试成绩记录，请联系老师录入</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <i className="fas fa-list-check"></i>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">成绩档案明细</h3>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {childGrades.length === 0 ? (
                  <div className="p-20 text-center text-slate-200 font-black italic">NO RECORDS FOUND</div>
                ) : (
                  childGrades.sort((a,b) => {
                    const examA = exams.find(e => e.id === a.examId);
                    const examB = exams.find(e => e.id === b.examId);
                    return (examB?.date || '').localeCompare(examA?.date || '');
                  }).map(g => {
                    const exam = exams.find(e => e.id === g.examId);
                    const total = g.grades.reduce((acc, curr) => acc + curr.score, 0);
                    return (
                      <div key={g.id} className="p-8 hover:bg-slate-50/50 transition-colors group">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                              <i className="fas fa-file-signature"></i>
                            </div>
                            <div>
                              <p className="font-black text-slate-900 text-lg">{exam?.name}</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{exam?.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black text-indigo-600 leading-none">{total}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">总分</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                          {g.grades.map(sg => (
                            <div key={sg.subject} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{sg.subject}</span>
                              <span className={`text-xl font-black ${sg.score >= 90 ? 'text-emerald-500' : sg.score < 60 ? 'text-rose-500' : 'text-slate-900'}`}>{sg.score}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="bg-indigo-700 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/30"><i className="fas fa-robot text-2xl"></i></div>
                  <div><h3 className="font-black text-lg tracking-tight">AI 学情透视</h3><p className="text-indigo-100/60 text-[10px] font-black uppercase tracking-widest">Educational Analysis</p></div>
                </div>
                <p className="text-sm text-indigo-50 leading-relaxed mb-10 font-medium">我们将为您解析孩子的学术潜能、学科短板以及近期的成绩波动原因。</p>
                <button 
                  onClick={handleAIAnalysis}
                  disabled={isAnalyzing || childGrades.length === 0}
                  className="w-full bg-white text-indigo-600 font-black py-5 rounded-2xl hover:bg-slate-50 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {isAnalyzing ? <><i className="fas fa-sync-alt animate-spin"></i>诊断中...</> : <><i className="fas fa-wand-sparkles"></i>生成诊断报告</>}
                </button>
              </div>
            </div>

            {aiReport && (
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-8 animate-in slide-in-from-bottom-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">总体评价</h4>
                  <p className="text-slate-800 text-sm leading-relaxed font-bold bg-indigo-50/50 p-5 rounded-3xl">{aiReport.overallAssessment}</p>
                </div>
                <div className="space-y-4 pt-6 border-t border-slate-50">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">学习建议</h4>
                  <div className="space-y-4">
                    {aiReport.suggestions.map((s, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black">{i + 1}</div>
                        <p className="text-xs text-slate-700 font-bold leading-relaxed pt-1">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Binding Modal */}
      {isBinding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            {bindingStep === 'input' ? (
              <>
                <div className="p-10 pb-4 flex justify-between items-center border-b border-slate-50">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">关联学生账号</h3>
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">Join via {bindMode === 'code' ? 'Invite Code' : 'Manual Search'}</p>
                  </div>
                  <button onClick={() => setIsBinding(false)} className="text-slate-400 hover:text-slate-600 p-2"><i className="fas fa-times"></i></button>
                </div>
                
                <div className="p-10 space-y-6">
                  {bindMode === 'code' ? (
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">请输入邀请码</label>
                      <input 
                        type="text" 
                        placeholder="例如: ABC123"
                        className="w-full px-5 py-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-black text-center text-3xl tracking-[0.2em] text-indigo-600 uppercase"
                        value={bindForm.inviteCode}
                        onChange={(e) => setBindForm({ ...bindForm, inviteCode: e.target.value })}
                      />
                      <button onClick={() => setBindMode('manual')} className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors w-full text-center mt-2">没有邀请码？点击手动查找</button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">所属学校</label>
                        <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={bindForm.schoolId} onChange={(e) => setBindForm({ ...bindForm, schoolId: e.target.value })}>
                          <option value="">请选择学校</option>
                          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">年级</label>
                          <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={bindForm.gradeId} onChange={(e) => setBindForm({ ...bindForm, gradeId: e.target.value })}>
                            <option value="">请选择</option>
                            {availableGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button onClick={() => setBindMode('code')} className="text-[10px] font-black text-indigo-500 mb-4 ml-1 underline underline-offset-4">使用邀请码</button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 pt-4 border-t border-slate-50">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">孩子所在班级</label>
                      <select 
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" 
                        value={bindForm.classId} 
                        onChange={(e) => setBindForm({ ...bindForm, classId: e.target.value })}
                        disabled={bindMode === 'manual' && !bindForm.gradeId}
                      >
                        <option value="">选择班级</option>
                        {bindMode === 'manual' ? 
                          availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>) :
                          // For code mode, we fetch classes after invite validation but for simpler UI let's show classes of the school/grade resolved by code
                          db.getClasses(db.getInvitationByCode(bindForm.inviteCode.toUpperCase())?.schoolId || '').filter(c => c.gradeId === db.getInvitationByCode(bindForm.inviteCode.toUpperCase())?.gradeId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                        }
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">孩子真实姓名</label>
                      <input type="text" placeholder="请输入姓名" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={bindForm.name} onChange={(e) => setBindForm({ ...bindForm, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">家庭成员关系</label>
                      <div className="grid grid-cols-2 gap-3">
                        {['父亲', '母亲', '监护人'].map(rel => (
                          <button key={rel} type="button" onClick={() => setBindForm({ ...bindForm, relationship: rel })} className={`py-3 rounded-xl font-black text-xs border-2 ${bindForm.relationship === rel ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'bg-white border-slate-100 text-slate-400'}`}>{rel}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleVerifyStudent}
                    disabled={!bindForm.name || !bindForm.classId || (bindMode === 'code' && !bindForm.inviteCode)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95"
                  >
                    验证信息
                  </button>
                </div>
              </>
            ) : (
              <div className="p-10 space-y-8 text-center">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto"><i className="fas fa-check text-3xl"></i></div>
                <div><h3 className="text-2xl font-black text-slate-900">验证成功</h3><p className="text-slate-500 mt-2 font-medium">系统已匹配到您的孩子：{foundStudent?.name}</p></div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">学校班级信息</p>
                  <p className="font-black text-slate-900">{schools.find(s => s.id === foundStudent?.schoolId)?.name}</p>
                  <p className="text-xs font-bold text-slate-400">{db.getGradeLevels(foundStudent?.schoolId || '').find(g => g.id === foundStudent?.gradeId)?.name} · {db.getClasses(foundStudent?.schoolId || '').find(c => c.id === foundStudent?.classId)?.name}</p>
                </div>
                <div className="flex gap-4"><button onClick={() => setBindingStep('input')} className="flex-1 py-4 text-slate-400 font-black text-sm">返回修改</button><button onClick={handleConfirmBind} className="flex-[2] bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl">确认绑定</button></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;
