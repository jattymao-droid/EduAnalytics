
import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { GradeRecord, Exam, Student } from '../types';

interface GradeChartProps {
  grades: GradeRecord[];
  exams: Exam[];
  student?: Student;
}

const GradeChart: React.FC<GradeChartProps> = ({ grades, exams, student }) => {
  // Process data for Recharts
  const data = grades.map(g => {
    const exam = exams.find(e => e.id === g.examId);
    const entry: any = { 
      name: exam?.name || '未知',
      date: exam?.date || ''
    };
    g.grades.forEach(sg => {
      // Normalize to percentage for better comparison across subjects
      entry[sg.subject] = Math.round((sg.score / sg.fullScore) * 100);
    });
    return entry;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const subjects = Array.from(new Set(grades.flatMap(g => g.grades.map(sg => sg.subject))));
  const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F43F5E'];

  return (
    <div className="space-y-4">
      {student && (
        <div className="flex items-center justify-between px-2 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
            <div>
              <h4 className="text-sm font-black text-slate-900">成绩走势分析</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance trend for {student.name}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black font-mono tracking-wider">
              ID: {student.studentNo}
            </span>
          </div>
        </div>
      )}
      
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis 
              dataKey="name" 
              stroke="#94A3B8" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false}
              dy={10}
            />
            <YAxis 
              domain={[0, 100]} 
              stroke="#94A3B8" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false}
              unit="%" 
            />
            <Tooltip 
              isAnimationActive={true}
              animationDuration={400}
              animationEasing="ease-out"
              cursor={{ stroke: '#E2E8F0', strokeWidth: 2, strokeDasharray: '5 5' }}
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                borderRadius: '20px', 
                border: 'none', 
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                padding: '16px'
              }}
              itemStyle={{ fontSize: '13px', fontWeight: '800', padding: '2px 0' }}
              labelStyle={{ fontSize: '14px', fontWeight: '900', color: '#1E293B', marginBottom: '10px' }}
            />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '30px' }}
            />
            {subjects.map((subj, idx) => (
              <Line 
                key={subj} 
                type="monotone" 
                dataKey={subj} 
                name={subj}
                stroke={colors[idx % colors.length]} 
                strokeWidth={4}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: colors[idx % colors.length] }}
                activeDot={{ 
                  r: 8, 
                  strokeWidth: 4, 
                  fill: colors[idx % colors.length], 
                  stroke: '#fff',
                  className: 'active-dot-shadow' 
                }} 
                animationDuration={2000}
                animationEasing="ease-in-out"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <style>{`
        .active-dot-shadow {
          filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default GradeChart;
