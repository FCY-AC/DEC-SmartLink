import express from 'express';

// 路由模組
import authRoutes from './auth';
import userRoutes from './users';
import courseRoutes from './courses';
import lectureRoutes from './lectures';
import questionRoutes from './questions';
import pollRoutes from './polls';
import transcriptRoutes from './transcripts';
import analyticsRoutes from './analytics';
import uploadsRoutes from './uploads';
import aiRoutes from './ai';

export const setupRoutes = (app: express.Application): void => {
  // API 版本前綴
  const apiRouter = express.Router();

  // 健康檢查（已在 server.ts 中定義）

  // 認證路由
  apiRouter.use('/auth', authRoutes);

  // 用戶管理路由
  apiRouter.use('/users', userRoutes);

  // 課程管理路由
  apiRouter.use('/courses', courseRoutes);

  // 講堂管理路由
  apiRouter.use('/lectures', lectureRoutes);

  // 提問管理路由
  apiRouter.use('/questions', questionRoutes);

  // 投票管理路由
  apiRouter.use('/polls', pollRoutes);

  // 字幕管理路由
  apiRouter.use('/transcripts', transcriptRoutes);

  // 統計分析路由
  apiRouter.use('/analytics', analyticsRoutes);

  // AI 服務路由
  apiRouter.use('/ai', aiRoutes);

  // 檔案上傳路由
  apiRouter.use('/uploads', uploadsRoutes);

  // 使用 API 版本前綴
  app.use('/api/v1', apiRouter);

  // 向後相容性：保留舊的 API 路徑
  app.use('/api', apiRouter);
};
