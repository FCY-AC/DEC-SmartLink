import express from 'express';

const router = express.Router();

// 獲取講堂提問
router.get('/', async (req, res) => {
  res.json({ questions: [], message: '提問功能開發中' });
});

// 提交提問
router.post('/', async (req, res) => {
  res.status(201).json({ message: '提交提問功能開發中' });
});

export default router;
