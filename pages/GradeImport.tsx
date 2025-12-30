import React, { useState, useEffect } from 'react';
import { db } from '../store.ts';
import { Student, Exam, GradeRecord, SubjectGrade, User, UserRole, Semester } from '../types.ts';

interface GradeImportProps {
  onClose: () => void;
  onComplete: () => void;
  schoolId: string;
  user: User;
}

const GradeImport: React.FC<GradeImportProps> = ({ onClose, onComplete, schoolId, user }) => {
  const [file, setFile] = useState<File | null>(null);
  const [examName, setExamName] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStats, setImportStats] = useState<{ total: number; success: number; skipped: number } | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);

  useEffect(() => {
    db.getSemesters(schoolId).then(setSemesters);
  }, [schoolId]);

  const isTeacher = user.role === UserRole.TEACHER;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const downloadTemplate = () => {
    const XLSX = (window as any).XLSX;
    const headers = ['学号', '姓名', '年级', '班级', '语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
    const sampleData = [{ '学号': '2024001', '姓名': '张三', '年级': '初三', '班级': '1班', '语文': 95, '数学': 100, '英语': 88, '物理': 90, '化学': 85, '生物': 92, '历史': 80, '地理': 85, '政治': 90 }];
    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "成绩导入模板");
    XLSX.writeFile(workbook, "EduAnalytics_成绩导入模板.xlsx");
  };

  const processExcel = async () => {
    if (!file || !examName || !semesterId) {
      alert('请完整填写考试信息并上传文件');
      return;
    }
    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result;
        const XLSX = (window as any).XLSX;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        const [currentStudents, schoolClasses, gradeLevels] = await Promise.all([
          db.getStudents(schoolId),
          db.getClasses(schoolId),
          db.getGradeLevels(schoolId)
        ]);
        
        const myClassIds = isTeacher 
          ? schoolClasses.filter(c => c.classTeacherId === user.id || Object.values(c.subjectTeachers || {}).includes(user.id)).map(c => c.id)
          : null;

        let successCount = 0;
        let skipCount = 0;
        const newGrades: GradeRecord[] = [];
        const studentUpdates: Student[] = [...currentStudents];
        const newClasses = [...schoolClasses];
        const newGradeLevels = [...gradeLevels];

        json.forEach((row: any) => {
          const studentNo = String(row['学号'] || '');
          const studentName = row['姓名'];
          const gradeName = row['年级'] || '默认年级';
          const className = row['班级'] || '默认班级';

          if (!studentNo || !studentName) {
            skipCount++; return;
          }

          let grade = newGradeLevels.find(g => g.name === gradeName);
          if (!grade) {
            if (isTeacher) { skipCount++; return; }
            grade = { id: 'gl_' + Math.random().toString(36).substr(2, 9), schoolId, name: gradeName };
            newGradeLevels.push(grade);
          }

          let sClass = newClasses.find(c => c.name === className && c.gradeId === grade!.id);
          if (!sClass) {
            if (isTeacher) { skipCount++; return; }
            sClass = { id: 'cl_' + Math.random().toString(36).substr(2, 9), schoolId, gradeId: grade!.id, name: className };
            newClasses.push(sClass);
          }

          if (isTeacher && myClassIds && !myClassIds.includes(sClass.id)) {
            skipCount++; return;
          }

          let studentIdx = studentUpdates.findIndex(s => s.studentNo === studentNo);
          let student: Student;
          if (studentIdx === -1) {
            if (isTeacher) { skipCount++; return; }
            student = { id: 'stu_' + Math.random().toString(36).substr(2, 9), schoolId, name: studentName, classId: sClass.id, gradeId: grade!.id, studentNo };
            studentUpdates.push(student);
          } else {
            student = studentUpdates[studentIdx];
          }

          const subjectGrades: SubjectGrade[] = [];
          const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
          subjects.forEach(key => {
            if (row[key] !== undefined) {
              subjectGrades.push({ subject: key, score: Number(row[key]), fullScore: 100 });
            }
          });

          newGrades.push({ id: 'grade_' + Math.random().toString(36).substr(2, 9), studentId: student.id, examId: 'temp', schoolId, grades: subjectGrades });
          successCount++;
        });

        if (successCount === 0) {
          alert('导入失败：未找到有效记录。');
          setIsProcessing(false); return;
        }

        const finalExam: Exam = { id: 'exam_' + Date.now(), schoolId, semesterId, name: examName, date: new Date().toISOString().split('T')[0] };
        const currentExams = await db.getExams(schoolId);
        await db.saveExams([...currentExams, finalExam], schoolId);
        
        const finalGrades = newGrades.map(g => ({ ...g, examId: finalExam.id }));
        await db.saveGradeLevels(newGradeLevels, schoolId);
        await db.saveClasses(newClasses, schoolId);
        await db.saveStudents(studentUpdates, schoolId);
        const existingGrades = await db.getGrades(schoolId);
        await db.saveGrades([...existingGrades, ...finalGrades], schoolId);
        
        setImportStats({ total: json.length, success: successCount, skipped: skipCount });
        setIsProcessing(false);
        setTimeout(onComplete, 1500);
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error(error);
      alert('解析失败，请检查文件格式。');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-100">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div><h3 className="text-xl font-black text-slate-900 tracking-tight">导入学生成绩</h3><p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">Excel Batch Sync</p></div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2"><i className="fas fa-times"></i></button>
        </div>
        <div className="p-8 space-y-6">
          {importStats ? (
            <div className="text-center py-10 space-y-4 animate-in zoom-in">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-2xl"><i className="fas fa-check"></i></div>
              <h4 className="text-lg font-black text-slate-900">同步完成</h4>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">考试名称</label><input type="text" placeholder="如：期中考试" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={examName} onChange={e => setExamName(e.target.value)} /></div>
                <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">选择学期</label><select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" value={semesterId} onChange={e => setSemesterId(e.target.value)}><option value="">请选择...</option>{semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              </div>
              <div className="flex justify-between items-center mb-1"><label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">上传成绩单</label><button onClick={downloadTemplate} className="text-xs font-black text-indigo-600 hover:underline underline-offset-4 flex items-center gap-1.5"><i className="fas fa-download text-[10px]"></i>下载标准模板</button></div>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center bg-slate-50/30 group hover:border-indigo-300 transition-colors"><input type="file" id="file-up" className="hidden" accept=".xlsx,.xls" onChange={handleFileChange} /><label htmlFor="file-up" className="cursor-pointer"><div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 group-hover:scale-110 transition-transform shadow-sm"><i className="fas fa-file-excel text-2xl text-emerald-500"></i></div><p className="text-sm font-black text-slate-900">{file ? file.name : '点击或拖拽文件上传'}</p></label></div>
              <button disabled={!file || !examName || !semesterId || isProcessing} onClick={processExcel} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:bg-slate-200 disabled:shadow-none">{isProcessing ? <><i className="fas fa-spinner animate-spin"></i>同步中...</> : '确认开始导入'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradeImport;