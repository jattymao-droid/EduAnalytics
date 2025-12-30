import { GoogleGenAI, Type } from "@google/genai";
import { GradeRecord, Exam, Student, AIAnalysisReport, AIPredictionReport } from './types.ts';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeGrades = async (
  student: Student,
  grades: GradeRecord[],
  exams: Exam[],
  relationship: string = '家长'
): Promise<AIAnalysisReport> => {
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
    请根据以上数据，生成一份学情分析报告。要求：针对${relationship}视角，识别学科潜力和障碍，并给出具体的建议。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallAssessment: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            trendAnalysis: { type: Type.STRING },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["overallAssessment", "strengths", "weaknesses", "trendAnalysis", "suggestions"]
        }
      }
    });

    return JSON.parse(response.text?.trim() || "{}");
  } catch (error) {
    console.error("AI Analysis failed:", error);
    throw new Error("AI 分析生成失败");
  }
};

export const predictPerformance = async (
  student: Student,
  grades: GradeRecord[],
  exams: Exam[]
): Promise<AIPredictionReport> => {
  const sortedGrades = [...grades].sort((a, b) => {
    const dateA = exams.find(e => e.id === a.examId)?.date || '';
    const dateB = exams.find(e => e.id === b.examId)?.date || '';
    return dateA.localeCompare(dateB);
  });

  const history = sortedGrades.map(g => {
    const exam = exams.find(e => e.id === g.examId);
    return {
      examName: exam?.name || '未知考试',
      date: exam?.date,
      scores: g.grades.map(sg => ({ subject: sg.subject, score: sg.score, full: sg.fullScore }))
    };
  });

  const prompt = `
    作为顶级教育大数据分析师，请基于以下历史考试序列，预测 ${student.name} 下一次考试的表现。
    
    历史数据：
    ${JSON.stringify(history, null, 2)}
    
    分析要求：
    1. 观察各科成绩的斜率（增长率）和方差（稳定性）。
    2. 考虑学习曲线，预测下一次考试的可能得分区间。
    3. 识别若不进行干预可能出现的“风险学科”。
    4. 识别最具潜力的“突破学科”。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            predictedExamName: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER },
            predictedScores: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  range: { type: Type.STRING },
                  trend: { type: Type.STRING, enum: ["rising", "falling", "stable"] }
                }
              }
            },
            potentialGrowthAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
            riskFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
            strategicAdvice: { type: Type.STRING }
          },
          required: ["predictedExamName", "confidenceScore", "predictedScores", "potentialGrowthAreas", "riskFactors", "strategicAdvice"]
        }
      }
    });

    return JSON.parse(response.text?.trim() || "{}");
  } catch (error) {
    console.error("AI Prediction failed:", error);
    throw new Error("AI 预测生成失败");
  }
};