
import { GoogleGenAI, Type } from "@google/genai";
import { GradeRecord, Exam, Student, AIAnalysisReport } from './types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeGrades = async (
  student: Student,
  grades: GradeRecord[],
  exams: Exam[],
  relationship: string = '家长'
): Promise<AIAnalysisReport> => {
  // Construct context for AI
  const history = grades.map(g => {
    const exam = exams.find(e => e.id === g.examId);
    return {
      examName: exam?.name || '未知考试',
      date: exam?.date,
      results: g.grades.map(sg => `${sg.subject}: ${sg.score}/${sg.fullScore}`).join(', ')
    };
  });

  const prompt = `
    你是一位经验丰富的资深教育专家和心理辅导员。现在你正在为一位${relationship}分析其孩子 ${student.name} 的学情。
    
    孩子的历史考试数据如下：
    ${JSON.stringify(history, null, 2)}
    
    请根据以上数据，以专业且充满人文关怀的口吻生成一份学情分析报告。
    特别要求：
    1. 报告应针对${relationship}的视角，给出具体的家校共育建议。
    2. 分析成绩的波动趋势，识别孩子在学科上的潜力和障碍。
    3. 建议应当具有可操作性（例如：如何陪伴阅读、如何练习弱项）。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallAssessment: { type: Type.STRING, description: "总体评估，总结孩子近期的学习状态" },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "优势学科或表现突出的地方" },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "薄弱点或当前面临的挑战" },
            trendAnalysis: { type: Type.STRING, description: "成绩趋势分析（是稳步提升、持平还是有所波动）" },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "给家长的具体行动建议" }
          },
          required: ["overallAssessment", "strengths", "weaknesses", "trendAnalysis", "suggestions"]
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) {
      throw new Error("AI 返回了空数据");
    }
    return JSON.parse(jsonStr.trim());
  } catch (error) {
    console.error("AI Analysis failed:", error);
    throw new Error("AI 分析生成失败，请检查网络或稍后再试。");
  }
};
