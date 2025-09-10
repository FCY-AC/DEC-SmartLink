import express from 'express';
import multer, { StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, requireProfessorOrAdmin } from '../middleware/auth';

const router = express.Router();

// 確保上傳目錄存在
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage: StorageEngine = multer.diskStorage({
  destination: (_req: express.Request, _file: Express.Multer.File, cb: (error: any, destination: string) => void) => cb(null, uploadsDir),
  filename: (_req: express.Request, file: Express.Multer.File, cb: (error: any, filename: string) => void) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${unique}${ext}`);
  }
});

const upload = multer({ storage });

// 上傳錄影檔案
router.post('/recording', authenticateToken, requireProfessorOrAdmin, upload.single('file'), async (req, res) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ error: 'NoFile', message: '未收到檔案' });
    }

    const fileUrl = `/uploads/${file.filename}`;
    return res.status(201).json({ url: fileUrl, filename: file.filename });
  } catch (error) {
    console.error('錄影上傳錯誤:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: '伺服器內部錯誤' });
  }
});

export default router;

