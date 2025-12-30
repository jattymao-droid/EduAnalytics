import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../store.ts';
import { User, Student, Exam, GradeRecord, GradeLevel, SchoolClass, Semester, AIAnalysisReport, AIPredictionReport } from '../types.ts';
import GradeImport from './GradeImport.tsx';
import GradeChart from '../components/GradeChart.tsx';
import { analyzeGrades, predictPerformance } from '../geminiService.ts';

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
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [aiReport, setAiReport] = useState<AIAnalysisReport | null>(null);
  const [aiPrediction, setAiPrediction] = useState<AIPredictionReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');

  const schoolId = user.schoolId!;

  useEffect(() => {
    refreshData();
  }, [schoolId]);

  const refreshData = async () => {
    const [studentsData, examsData, gradesData, gradeLevelsData, classesData, semestersData] = await Promise.all([
      db.getStudents(schoolId),
      db.getExams(schoolId),
      db.getGrades(schoolId),
      db.getGradeLevels(schoolId),
      db.getClasses(schoolId),
      db.getSemesters(schoolId)
    ]);

    setStudents(studentsData);
    setExams(examsData);
    setGrades(gradesData);
    setGradeLevels(gradeLevelsData);
    setSchoolClasses(classesData);
    setSemesters(semestersData);
  };

  const handleAIAnalysis = async () => {
    if (!selectedStudent) return;
    const studentGrades = grades.filter(g => g.studentId === selectedStudent.id);
    if (studentGrades.length === 0) return alert('无成绩记录');
    
    setIsAnalyzing(true);
    try {
      const report = await analyzeGrades(selectedStudent, studentGrades, exams, '老师');
      setAiReport(report);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAIPrediction = async () => {
    if (!selectedStudent) return;
    const studentGrades = grades.filter(g => g.studentId === selectedStudent.id);
    if (studentGrades.length < 2) return alert('预测需要至少两次考试记录');

    setIsPredicting(true);
    try {
      const prediction = await predictPerformance(selectedStudent, studentGrades, exams);
      setAiPrediction(prediction);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsPredicting(false);
    }
  };

  const myClassIds = useMemo(() => {
    return schoolClasses
      .filter(c => c.classTeacherId === user.id || Object.values(c.subjectTeachers || {}).includes(user.id))
      .map(c => c.id);
  }, [schoolClasses, user.id]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = s.name.includes(searchQuery) || s.studentNo.includes(searchQuery);
      const matchGrade = !selectedGradeId || s.gradeId === selectedGradeId;
      const matchClass = !selectedClassId || s.classId === selectedClassId;
      const isMyStudent = myClassIds.length === 0 || myClassIds.includes(s.classId);
      return matchSearch && matchGrade && matchClass && isMyStudent;
    });
  }, [students, searchQuery, selectedGradeId, selectedClassId, myClassIds]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900">教师工作台</h2>
          <p className="text-slate-500">班级管理与 AI 智能诊断</p>
        </div>
        <button onClick={() => setShowImport(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg">导入成绩</button>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm p-8 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <input type="text" placeholder="搜索姓名或学号..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="p-3 border rounded-xl" />
          <select value={selectedGradeId} onChange={e => setSelectedGradeId(e.target.value)} className="p-3 border rounded-xl">
            <option value="">全部年级</option>
            {gradeLevels.map(gl => <option key={gl.id} value={gl.id}>{gl.name}</option>)}
          </select>
          <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="p-3 border rounded-xl">
            <option value="">全部班级</option>
            {schoolClasses.filter(c => !selectedGradeId || c.gradeId === selectedGradeId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <table className="w-full text-left">
          <thead className="bg-slate-50 font-black text-xs uppercase tracking-widest text-slate-400">
            <tr><th className="p-4">姓名</th><th className="p-4">学号</th><th className="p-4">年级班级</th><th className="p-4 text-right">诊断</th></tr>
          </thead>
          <tbody className="divide-y">
            {filteredStudents.map(s => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="p-4 font-bold">{s.name}</td>
                <td className="p-4 font-mono text-xs">{s.studentNo}</td>
                <td className="p-4 text-xs font-bold">{gradeLevels.find(gl => gl.id === s.gradeId)?.name} {schoolClasses.find(sc => sc.id === s.classId)?.name}</td>
                <td className="p-4 text-right"><button onClick={() => setSelectedStudent(s)} className="text-indigo-600 font-black text-sm">诊断详情</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-10 shadow-2xl animate-in zoom-in">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black">{selectedStudent.name} 的学情诊断</h3>
              <button onClick={() => {setSelectedStudent(null); setAiReport(null); setAiPrediction(null);}} className="text-slate-400"><i className="fas fa-times"></i></button>
            </div>
            
            <GradeChart grades={grades.filter(g => g.studentId === selectedStudent.id)} exams={exams} student={selectedStudent} />

            <div className="grid grid-cols-2 gap-8 mt-10">
              <div className="space-y-6">
                <h4 className="font-black text-slate-400 uppercase tracking-widest text-xs">AI 深度分析</h4>
                {isAnalyzing ? <div className="p-10 bg-slate-50 rounded-3xl animate-pulse">分析中...</div> : aiReport ? (
                  <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                    <p className="font-bold text-sm text-indigo-900 leading-relaxed">{aiReport.overallAssessment}</p>
                  </div>
                ) : <button onClick={handleAIAnalysis} className="w-full py-12 border-2 border-dashed rounded-3xl text-slate-400 font-black">生成 AI 诊断</button>}
              </div>
              <div className="space-y-6">
                <h4 className="font-black text-violet-400 uppercase tracking-widest text-xs">AI 趋势预测</h4>
                {isPredicting ? <div className="p-10 bg-violet-50 rounded-3xl animate-pulse">预测中...</div> : aiPrediction ? (
                  <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-3xl text-white">
                    <p className="text-xs text-slate-400 font-bold mb-2">下次考试预测: {aiPrediction.predictedExamName}</p>
                    <p className="text-2xl font-black text-amber-400">{aiPrediction.confidenceScore}% 置信度</p>
                  </div>
                ) : <button onClick={handleAIPrediction} className="w-full py-12 border-2 border-dashed rounded-3xl text-violet-400 font-black">开启成绩预测</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {showImport && <GradeImport onClose={() => setShowImport(false)} onComplete={() => {refreshData(); setShowImport(false);}} schoolId={schoolId} user={user} />}
    </div>
  );
};

export default TeacherDashboard;