import express from 'express';

const router = express.Router();

// 獲取講堂投票
router.get('/', async (req, res) => {
  res.json({ polls: [], message: '投票功能開發中' });
});

// 創建投票
router.post('/', async (req, res) => {
  res.status(201).json({ message: '創建投票功能開發中' });
});

export default router;
