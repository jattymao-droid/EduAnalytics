
import React, { useState } from 'react';
import { db } from '../store';
import { Student, Exam, GradeRecord, SubjectGrade, GradeLevel, SchoolClass } from '../types';

interface GradeImportProps {
  onClose: () => void;
  onComplete: () => void;
  schoolId: string;
}

const GradeImport: React.FC<GradeImportProps> = ({ onClose, onComplete, schoolId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [examName, setExamName] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const semesters = db.getSemesters(schoolId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processExcel = async () => {
    if (!file || !examName || !semesterId) {
      alert('请完整填写考试信息并上传文件');
      return;
    }
    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = (window as any).XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = (window as any).XLSX.utils.sheet_to_json(worksheet);

        // 1. Create Exam
        const newExam: Exam = {
          id: 'exam_' + Date.now(),
          schoolId,
          semesterId: semesterId,
          name: examName,
          date: new Date().toISOString().split('T')[0]
        };
        const exams = db.getExams(schoolId);
        db.saveExams([...exams, newExam], schoolId);

        // 2. Prepare Data Buffers
        const currentStudents = db.getStudents(schoolId);
        const currentGrades = db.getGrades(schoolId);
        const gradeLevels = db.getGradeLevels(schoolId);
        const schoolClasses = db.getClasses(schoolId);
        
        const newGrades: GradeRecord[] = [];
        const studentUpdates: Student[] = [...currentStudents];

        json.forEach((row: any) => {
          const studentNo = String(row['学号'] || '');
          const studentName = row['姓名'];
          const gradeName = row['年级'] || '默认年级';
          const className = row['班级'] || '默认班级';

          if (!studentNo || !studentName) return;

          // Resolve or Create Grade
          let grade = gradeLevels.find(g => g.name === gradeName);
          if (!grade) {
            grade = { id: 'gl_' + Math.random().toString(36).substr(2, 9), schoolId, name: gradeName };
            gradeLevels.push(grade);
          }

          // Resolve or Create Class (within the found/created grade)
          let sClass = schoolClasses.find(c => c.name === className && c.gradeId === grade!.id);
          if (!sClass) {
            sClass = { id: 'cl_' + Math.random().toString(36).substr(2, 9), schoolId, gradeId: grade!.id, name: className };
            schoolClasses.push(sClass);
          }

          // Resolve Student
          let studentIdx = studentUpdates.findIndex(s => s.studentNo === studentNo);
          let student: Student;

          if (studentIdx === -1) {
            // Create New Student
            student = {
              id: 'stu_' + Math.random().toString(36).substr(2, 9),
              schoolId,
              name: studentName,
              classId: sClass.id,
              gradeId: grade.id,
              studentNo: studentNo
            };
            studentUpdates.push(student);
          } else {
            // Use Existing and update their class/grade if needed
            student = studentUpdates[studentIdx];
            student.classId = sClass.id;
            student.gradeId = grade.id;
            student.name = studentName; // Update name just in case
          }

          // Process Subject Scores
          const subjectGrades: SubjectGrade[] = [];
          const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
          subjects.forEach(key => {
            if (row[key] !== undefined) {
              subjectGrades.push({
                subject: key,
                score: Number(row[key]),
                fullScore: 100
              });
            }
          });

          newGrades.push({
            id: 'grade_' + Math.random().toString(36).substr(2, 9),
            studentId: student.id,
            examId: newExam.id,
            schoolId,
            grades: subjectGrades
          });
        });

        // Finalize Saves
        // Added schoolId as second argument to match store.ts signature
        db.saveGradeLevels(gradeLevels, schoolId);
        // Added schoolId as second argument to match store.ts signature
        db.saveClasses(schoolClasses, schoolId);
        db.saveStudents(studentUpdates, schoolId);
        db.saveGrades([...currentGrades, ...newGrades], schoolId);
        
        setIsProcessing(false);
        onComplete();
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error(error);
      alert('导入失败，请检查文件格式。');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">批量导入成绩</h3>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">Excel Data Processing</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-xl hover:bg-slate-200/50">
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">考试名称</label>
              <input 
                type="text" 
                placeholder="例如：2024春季期中联考"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">选择学期</label>
              <select 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
              >
                <option value="">请选择学期</option>
                {semesters.map(sem => <option key={sem.id} value={sem.id}>{sem.name}</option>)}
              </select>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center bg-slate-50/30 hover:bg-slate-50 transition-colors group">
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              accept=".xlsx, .xls"
              onChange={handleFileChange}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                <i className="fas fa-file-excel text-3xl text-emerald-500"></i>
              </div>
              <p className="text-sm font-black text-slate-900">{file ? file.name : '上传 Excel 成绩单'}</p>
              <p className="text-xs text-slate-400 mt-2 font-medium">系统将自动解析年级、班级、学号及各科成绩</p>
            </label>
          </div>

          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 flex gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <i className="fas fa-magic text-amber-600"></i>
            </div>
            <div className="text-xs text-amber-800 leading-relaxed">
              <p className="font-bold mb-1 uppercase tracking-wider">智能导入模式：</p>
              <p>如果 Excel 中的<b>班级</b>或<b>年级</b>在系统中不存在，系统将为您自动创建。学生档案将根据学号自动同步。</p>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50/80 border-t border-slate-50 flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            取消
          </button>
          <button 
            disabled={!file || !examName || !semesterId || isProcessing}
            onClick={processExcel}
            className="px-10 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-indigo-100 disabled:opacity-50 flex items-center gap-3 transition-all transform active:scale-95"
          >
            {isProcessing ? (
              <>
                <i className="fas fa-spinner animate-spin"></i>
                正在处理并同步...
              </>
            ) : '确认并导入'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GradeImport;
