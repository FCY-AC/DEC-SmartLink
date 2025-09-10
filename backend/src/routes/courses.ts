import express from 'express';

const router = express.Router();

// 獲取課程列表
router.get('/', async (req, res) => {
  // TODO: 實現課程列表邏輯
  res.json({ courses: [], message: '課程列表功能開發中' });
});

// 創建新課程
router.post('/', async (req, res) => {
  // TODO: 實現創建課程邏輯
  res.status(201).json({ message: '創建課程功能開發中' });
});

export default router;
