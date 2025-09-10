import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { startContinuousRecognition, stopContinuousRecognition } from '../services/speechService';
import TranslationService from '../services/translationService';
import AIService from '../services/aiService';
import { query } from '../database';

const router = express.Router();

// 初始化AI服務
const translationService = new TranslationService();
const aiService = new AIService();

// 語音識別 - 開始即時辨識
router.post('/speech/start', authenticateToken, async (req, res) => {
  try {
    const { lectureId, language = 'en-US' } = req.body;

    if (!lectureId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Lecture ID is required'
      });
    }

    startContinuousRecognition(lectureId, language);

    return res.json({
      message: 'Speech recognition started',
      lectureId,
      language,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Speech recognition start error:', error);
    return res.status(500).json({
      error: 'Speech Recognition Failed',
      message: 'Failed to start speech recognition'
    });
  }
});

// 語音識別 - 停止即時辨識
router.post('/speech/stop', authenticateToken, async (req, res) => {
  try {
    stopContinuousRecognition();

    return res.json({
      message: 'Speech recognition stopped',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Speech recognition stop error:', error);
    return res.status(500).json({
      error: 'Speech Recognition Failed',
      message: 'Failed to stop speech recognition'
    });
  }
});

// 翻譯文字
router.post('/translate', authenticateToken, async (req, res) => {
  try {
    const { text, fromLanguage = 'en', toLanguage = 'zh-Hans' } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '翻譯文字為必填項目'
      });
    }

    const translation = await translationService.translateText(text, fromLanguage, toLanguage);

    return res.json({
      translation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('翻譯錯誤:', error);
    return res.status(500).json({
      error: 'Translation Failed',
      message: '翻譯失敗，請稍後再試'
    });
  }
});

// 批量翻譯
router.post('/translate/batch', authenticateToken, async (req, res) => {
  try {
    const { texts, fromLanguage = 'en', toLanguage = 'zh-Hans' } = req.body;

    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '翻譯文字陣列為必填項目'
      });
    }

    const translations = await translationService.translateMultipleTexts(texts, fromLanguage, toLanguage);

    return res.json({
      translations,
      count: translations.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('批量翻譯錯誤:', error);
    return res.status(500).json({
      error: 'Batch Translation Failed',
      message: '批量翻譯失敗，請稍後再試'
    });
  }
});

// 詞彙解釋
router.post('/explain-term', authenticateToken, async (req, res) => {
  try {
    const { term, context, language = 'zh' } = req.body;

    if (!term) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '詞彙為必填項目'
      });
    }

    const explanation = await aiService.explainTerm(term, context, language);

    return res.json({
      term,
      explanation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('詞彙解釋錯誤:', error);
    return res.status(500).json({
      error: 'Term Explanation Failed',
      message: '詞彙解釋失敗，請稍後再試'
    });
  }
});

// 生成練習題
router.post('/generate-questions', authenticateToken, async (req, res) => {
  try {
    const { lectureContent, count = 5, difficulty = 'medium' } = req.body;

    if (!lectureContent) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '講堂內容為必填項目'
      });
    }

    const questions = await aiService.generatePracticeQuestions(lectureContent, count, difficulty);

    return res.json({
      questions,
      count: questions.length,
      difficulty,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('生成練習題錯誤:', error);
    return res.status(500).json({
      error: 'Question Generation Failed',
      message: '生成練習題失敗，請稍後再試'
    });
  }
});

// 獲取學術詞彙列表（用於搜尋建議）
router.get('/academic-terms', authenticateToken, async (req, res) => {
  try {
    const { search, category, limit = 20 } = req.query;

    let sql = 'SELECT term, category, difficulty, explanation FROM academic_terms WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      sql += ` AND term ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    sql += ` ORDER BY term LIMIT $${paramIndex}`;
    params.push(Number(limit));

    const result = await query(sql, params);

    return res.json({
      terms: result.rows,
      count: result.rows.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('獲取學術詞彙錯誤:', error);
    return res.status(500).json({
      error: 'Database Error',
      message: '獲取詞彙列表失敗'
    });
  }
});

// 儲存學術詞彙
router.post('/academic-terms', authenticateToken, async (req, res) => {
  try {
    const { term, category, explanation, difficulty = 'medium', examples } = req.body;

    if (!term || !category || !explanation) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '詞彙、分類、解釋為必填項目'
      });
    }

    // 生成向量嵌入
    const embedding = await aiService.generateEmbedding(`${term} ${explanation}`);

    const result = await query(
      'INSERT INTO academic_terms (term, category, explanation, difficulty, examples, embedding) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [term, category, explanation, difficulty, examples || [], embedding]
    );

    return res.status(201).json({
      term: result.rows[0],
      message: '學術詞彙儲存成功',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('儲存學術詞彙錯誤:', error);
    return res.status(500).json({
      error: 'Database Error',
      message: '儲存詞彙失敗'
    });
  }
});

// 向量搜尋學術詞彙
router.post('/search-terms', authenticateToken, async (req, res) => {
  try {
    const { query: searchQuery, limit = 10 } = req.body;

    if (!searchQuery) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '搜尋查詢為必填項目'
      });
    }

    // 生成查詢向量
    const queryEmbedding = await aiService.generateEmbedding(searchQuery);

    // 使用 pgvector 進行相似度搜尋
    const result = await query(
      `SELECT term, category, explanation, difficulty, examples,
              1 - (embedding <=> $1::vector) as similarity
       FROM academic_terms
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [queryEmbedding, Number(limit)]
    );

    return res.json({
      results: result.rows,
      count: result.rows.length,
      searchQuery,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('向量搜尋錯誤:', error);
    return res.status(500).json({
      error: 'Search Failed',
      message: '搜尋失敗，請稍後再試'
    });
  }
});

// 學習表現分析
router.post('/analyze-performance', authenticateToken, async (req, res) => {
  try {
    const { studentId, lectureId, performanceData } = req.body;

    if (!studentId || !lectureId || !performanceData) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '學生ID、講堂ID、表現數據為必填項目'
      });
    }

    const analysis = await aiService.analyzeLearningPerformance(studentId, lectureId, performanceData);

    return res.json({
      analysis,
      studentId,
      lectureId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('學習表現分析錯誤:', error);
    return res.status(500).json({
      error: 'Analysis Failed',
      message: '學習分析失敗，請稍後再試'
    });
  }
});

// 獲取支援的語言列表
router.get('/supported-languages', authenticateToken, (req, res) => {
  const languages = translationService.getSupportedLanguages();

  res.json({
    languages,
    count: languages.length,
    timestamp: new Date().toISOString()
  });
});

// AI服務健康檢查
router.get('/health', authenticateToken, (req, res) => {
  const health = {
    speechService: !!process.env.AZURE_SPEECH_KEY,
    translationService: !!process.env.AZURE_TRANSLATOR_KEY,
    aiService: !!process.env.OPENAI_API_KEY,
    mode: process.env.NODE_ENV || 'development'
  };

  res.json({
    status: 'OK',
    services: health,
    timestamp: new Date().toISOString()
  });
});

export default router;
