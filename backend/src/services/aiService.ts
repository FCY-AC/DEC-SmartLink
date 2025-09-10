// 動態載入 AI 服務套件（若未安裝則以 mock 模式運行）
let OpenAI: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  OpenAI = require('openai').default || require('openai');
} catch (_) {
  // 套件未安裝時忽略，保持 mock 模式
}

export interface TermExplanation {
  explanation: string;
  category: string;
  relatedTerms: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  examples?: string[];
}

export interface PracticeQuestion {
  id: string;
  questionText: string;
  questionType: 'multiple_choice' | 'short_answer' | 'essay';
  options?: string[];
  correctAnswer?: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

export class AIService {
  private client: any | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey && OpenAI) {
      this.client = new OpenAI({
        apiKey: apiKey
      });
    } else {
      console.warn('⚠️ OpenAI API 未配置或套件未安裝，將使用模擬模式');
    }
  }

  /**
   * 解釋學術詞彙
   */
  async explainTerm(
    term: string,
    context?: string,
    language: string = 'zh'
  ): Promise<TermExplanation> {
    if (!this.client) {
      return this.mockTermExplanation(term, context, language);
    }

    const prompt = `
請詳細解釋以下學術詞彙，並提供相關資訊。請用${language === 'zh' ? '中文' : '英文'}回應。

詞彙: ${term}
${context ? `上下文: ${context}` : ''}

請提供以下資訊:
1. 詳細解釋
2. 學科分類
3. 相關詞彙（3-5個）
4. 難度等級（easy/medium/hard）
5. 實際應用例子（可選）

請用JSON格式回應，格式如下:
{
  "explanation": "詳細解釋",
  "category": "學科分類",
  "relatedTerms": ["相關詞彙1", "相關詞彙2"],
  "difficulty": "medium",
  "examples": ["例子1", "例子2"]
}
`;

    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
      });

      const response = completion.choices[0].message.content;
      if (!response) throw new Error('AI 回應為空');

      const result = JSON.parse(response);
      return result as TermExplanation;
    } catch (error) {
      console.error('詞彙解釋錯誤:', error);
      throw error;
    }
  }

  /**
   * 生成向量嵌入
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.client) {
      // 返回隨機向量作為模擬
      return Array.from({ length: 1536 }, () => Math.random());
    }

    try {
      const response = await this.client.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('生成嵌入錯誤:', error);
      throw error;
    }
  }

  /**
   * 生成練習題
   */
  async generatePracticeQuestions(
    lectureContent: string,
    count: number = 5,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ): Promise<PracticeQuestion[]> {
    if (!this.client) {
      return this.mockPracticeQuestions(count, difficulty);
    }

    const prompt = `
基於以下講堂內容，生成 ${count} 道${difficulty}難度的練習題。

講堂內容: ${lectureContent}

要求:
1. 問題類型可以是: multiple_choice（選擇題）、short_answer（簡答題）、essay（論述題）
2. 選擇題需要提供4個選項和正確答案
3. 每個問題都要有詳細的解釋
4. 分數根據難度設定（easy: 1分, medium: 2分, hard: 3分）

請用JSON格式回應，格式如下:
[
  {
    "id": "q1",
    "questionText": "問題內容",
    "questionType": "multiple_choice",
    "options": ["A. 選項1", "B. 選項2", "C. 選項3", "D. 選項4"],
    "correctAnswer": "A",
    "explanation": "詳細解釋",
    "difficulty": "medium",
    "points": 2
  }
]
`;

    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      });

      const response = completion.choices[0].message.content;
      if (!response) throw new Error('AI 回應為空');

      const questions = JSON.parse(response);
      return questions.map((q: any, index: number) => ({
        ...q,
        id: `q${index + 1}`
      }));
    } catch (error) {
      console.error('生成練習題錯誤:', error);
      throw error;
    }
  }

  /**
   * 分析學習表現
   */
  async analyzeLearningPerformance(
    studentId: string,
    lectureId: string,
    performanceData: any
  ): Promise<{
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  }> {
    if (!this.client) {
      return this.mockLearningAnalysis();
    }

    const prompt = `
分析學生的學習表現數據，提供改善建議。

學生ID: ${studentId}
講堂ID: ${lectureId}
表現數據: ${JSON.stringify(performanceData)}

請分析:
1. 整體表現評分（0-100）
2. 學習強項
3. 需要改進的地方
4. 具體建議

用JSON格式回應。
`;

    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
      });

      const response = completion.choices[0].message.content;
      if (!response) throw new Error('AI 回應為空');

      return JSON.parse(response);
    } catch (error) {
      console.error('學習分析錯誤:', error);
      throw error;
    }
  }

  /**
   * 模擬詞彙解釋（用於開發測試）
   */
  private mockTermExplanation(
    term: string,
    context?: string,
    language: string = 'zh'
  ): TermExplanation {
    const mockExplanations: { [key: string]: TermExplanation } = {
      'algorithm': {
        explanation: language === 'zh'
          ? '演算法是一組明確定義的計算步驟，用於解決特定的計算問題或執行計算任務。'
          : 'An algorithm is a set of well-defined computational steps used to solve a specific computational problem or perform a computational task.',
        category: 'Computer Science',
        relatedTerms: ['data structure', 'complexity', 'sorting', 'searching'],
        difficulty: 'medium',
        examples: ['Bubble sort algorithm', 'Binary search algorithm']
      },
      'complexity': {
        explanation: language === 'zh'
          ? '複雜度是用來評估演算法或問題難度的度量，通常分為時間複雜度和空間複雜度。'
          : 'Complexity is a measure used to evaluate the difficulty of an algorithm or problem, usually divided into time complexity and space complexity.',
        category: 'Computer Science',
        relatedTerms: ['algorithm', 'big O notation', 'efficiency', 'optimization'],
        difficulty: 'hard',
        examples: ['O(n) time complexity', 'O(log n) space complexity']
      }
    };

    return mockExplanations[term.toLowerCase()] || {
      explanation: `這是 ${term} 的解釋（模擬模式）`,
      category: 'General',
      relatedTerms: ['相關詞彙1', '相關詞彙2'],
      difficulty: 'medium',
      examples: ['例子1', '例子2']
    };
  }

  /**
   * 模擬練習題生成（用於開發測試）
   */
  private mockPracticeQuestions(
    count: number,
    difficulty: 'easy' | 'medium' | 'hard'
  ): PracticeQuestion[] {
    const questions: PracticeQuestion[] = [];

    for (let i = 0; i < count; i++) {
      questions.push({
        id: `mock-q${i + 1}`,
        questionText: `這是一個${difficulty}難度的模擬練習題 ${i + 1}`,
        questionType: 'multiple_choice',
        options: ['A. 選項1', 'B. 選項2', 'C. 選項3', 'D. 選項4'],
        correctAnswer: 'A',
        explanation: `這是第 ${i + 1} 題的詳細解釋`,
        difficulty,
        points: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3
      });
    }

    return questions;
  }

  /**
   * 模擬學習分析（用於開發測試）
   */
  private mockLearningAnalysis() {
    return {
      overallScore: 75,
      strengths: ['理解基本概念', '積極參與討論'],
      weaknesses: ['需要加強實作能力', '複雜問題分析'],
      recommendations: [
        '多練習程式設計',
        '參與更多討論',
        '查看補充學習資源'
      ]
    };
  }
}

export default AIService;
