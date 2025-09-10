import express from 'express';

const router = express.Router();

// 獲取講堂字幕
router.get('/', async (req, res) => {
  res.json({ transcripts: [], message: '字幕功能開發中' });
});

// 上傳字幕
router.post('/', async (req, res) => {
  res.status(201).json({ message: '上傳字幕功能開發中' });
});

export default router;
