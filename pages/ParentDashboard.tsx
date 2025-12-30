import React, { useState, useEffect } from 'react';
import { db } from '../store.ts';
import { User, Student, GradeRecord, Exam, AIAnalysisReport, AIPredictionReport, School } from '../types.ts';
import GradeChart from '../components/GradeChart.tsx';
import { analyzeGrades, predictPerformance } from '../geminiService.ts';

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
  const [bindForm, setBindForm] = useState({ 
    schoolId: '', gradeId: '', classId: '', name: '', relationship: '父亲', inviteCode: initialInviteCode || ''
  });
  
  const [aiReport, setAiReport] = useState<AIAnalysisReport | null>(null);
  const [aiPrediction, setAiPrediction] = useState<AIPredictionReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);

  useEffect(() => {
    refreshData();
    if (initialInviteCode) setIsBinding(true);
  }, [user, initialInviteCode]);

  const refreshData = async () => {
    const students = await db.getStudents();
    const myChildren = students.filter(s => user.childIds?.includes(s.id));
    setChildren(myChildren);
    if (myChildren.length > 0 && !selectedChildId) {
      setSelectedChildId(myChildren[0].id);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (selectedChildId) {
        const child = children.find(c => c.id === selectedChildId);
        if (child) {
          const sId = child.schoolId;
          const [gradesData, examsData] = await Promise.all([
            db.getGrades(sId),
            db.getExams(sId)
          ]);
          setChildGrades(gradesData.filter(g => g.studentId === selectedChildId));
          setExams(examsData);
        }
        setAiReport(null);
        setAiPrediction(null);
      }
    };
    fetchData();
  }, [selectedChildId, children]);

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

  const handleAIPrediction = async () => {
    if (!selectedChildId || childGrades.length < 2) {
      alert('学情预测需要至少两次以上的成绩作为数据支撑。');
      return;
    }
    setIsPredicting(true);
    try {
      const student = children.find(c => c.id === selectedChildId)!;
      const prediction = await predictPerformance(student, childGrades, exams);
      setAiPrediction(prediction);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsPredicting(false);
    }
  };

  const selectedChild = children.find(c => c.id === selectedChildId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div><h2 className="text-3xl font-black text-slate-900 tracking-tight">家长服务中心</h2><p className="text-slate-500 font-medium">关注孩子成长曲线，掌握未来学情趋势</p></div>
        <button onClick={() => setIsBinding(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl text-sm font-black shadow-xl flex items-center gap-3"><i className="fas fa-link"></i>绑定新账号</button>
      </div>

      {children.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8">
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {children.map(child => (
                <button key={child.id} onClick={() => setSelectedChildId(child.id)} className={`px-8 py-4 rounded-2xl text-sm font-black transition-all border-2 flex items-center gap-3 ${selectedChildId === child.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white text-slate-400 border-slate-100'}`}>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black">{child.name.charAt(0)}</div>{child.name}
                </button>
              ))}
            </div>
            {selectedChild && (
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                <GradeChart grades={childGrades} exams={exams} student={selectedChild} />
              </div>
            )}
          </div>
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3"><i className="fas fa-brain text-indigo-600"></i>学情深度诊断</h3>
              {isAnalyzing ? (<div className="py-12 text-center animate-pulse"><p className="text-sm font-bold text-slate-400">AI 正在分析...</p></div>) : aiReport ? (
                <div className="space-y-6">
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-sm leading-relaxed">{aiReport.overallAssessment}</div>
                </div>
              ) : (<button onClick={handleAIAnalysis} className="w-full py-12 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 hover:bg-slate-50 transition-all font-black uppercase text-xs">生成诊断报告</button>)}
            </div>
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl space-y-6">
              <h3 className="text-xl font-black flex items-center gap-3"><i className="fas fa-sparkles text-amber-400"></i>未来成绩预测</h3>
              {isPredicting ? (<div className="py-12 text-center animate-pulse"><p className="text-sm font-bold text-slate-300">大数据建模中...</p></div>) : aiPrediction ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">预测目标</p><p className="text-lg font-black">{aiPrediction.predictedExamName}</p></div>
                    <div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">置信度</p><p className="text-2xl font-black text-amber-400">{aiPrediction.confidenceScore}%</p></div>
                  </div>
                </div>
              ) : (<button onClick={handleAIPrediction} className="w-full py-12 border-2 border-dashed border-white/20 rounded-3xl text-slate-400 hover:bg-white/5 transition-all font-black uppercase text-xs">开启 AI 预测</button>)}
            </div>
          </div>
        </div>
      )}

      {isBinding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl animate-in zoom-in">
            <div className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black text-slate-900 tracking-tight">绑定学生账号</h3><button onClick={() => setIsBinding(false)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button></div>
            <div className="space-y-6">
              <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">邀请码</label><input type="text" value={bindForm.inviteCode} onChange={e => setBindForm({...bindForm, inviteCode: e.target.value.toUpperCase()})} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-2xl tracking-[0.2em] text-center text-indigo-600 outline-none" placeholder="EX: ABC123" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">孩子姓名</label><input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={bindForm.name} onChange={e => setBindForm({...bindForm, name: e.target.value})} placeholder="真实姓名" /></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">您的关系</label><select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold" value={bindForm.relationship} onChange={e => setBindForm({...bindForm, relationship: e.target.value})}><option value="父亲">父亲</option><option value="母亲">母亲</option><option value="监护人">监护人</option></select></div>
              </div>
              <button onClick={async () => {
                  if (!bindForm.inviteCode || !bindForm.name) return alert('请完整填写信息');
                  const invitation = await db.getInvitationByCode(bindForm.inviteCode);
                  if (!invitation) return alert('无效的邀请码');
                  const students = await db.getStudents(invitation.schoolId);
                  const student = students.find(s => s.name === bindForm.name && s.gradeId === invitation.gradeId);
                  if (!student) return alert('未在该年级找到该学生');
                  const users = await db.getUsers();
                  const updatedUsers = users.map(u => u.id === user.id ? { ...u, schoolId: invitation.schoolId, childIds: [...(u.childIds || []), student.id] } : u);
                  await db.saveUsers(updatedUsers);
                  onUserUpdate({ ...user, schoolId: invitation.schoolId, childIds: [...(user.childIds || []), student.id] });
                  setIsBinding(false); refreshData();
                }} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black shadow-xl active:scale-95 transition-all">确认关联</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;