import express from 'express';

const router = express.Router();

// 獲取統計儀表板
router.get('/dashboard', async (req, res) => {
  res.json({
    stats: {
      totalUsers: 0,
      totalLectures: 0,
      totalQuestions: 0,
      activeUsers: 0
    },
    message: '統計分析功能開發中'
  });
});

// 講堂統計
router.get('/lecture/:id', async (req, res) => {
  const { id } = req.params;
  res.json({ lectureId: id, stats: {}, message: '講堂統計功能開發中' });
});

export default router;
