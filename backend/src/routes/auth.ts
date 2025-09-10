import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../database';

const router = express.Router();

// JWT 密鑰
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// 登入
router.post('/login', async (req, res) => {
  try {
    const { studentId, password } = req.body;

    if (!studentId || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '學號和密碼為必填項目'
      });
    }

    // 查詢用戶（支援 email 或 student_id）
    const result = await query(
      'SELECT id, email, password_hash, role, name, student_id, department, avatar_url, is_active FROM users WHERE student_id = $1 OR email = $1',
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: '用戶不存在'
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Account Disabled',
        message: '帳號已被停用'
      });
    }

    // 驗證密碼（開發模式：允許 student123 作為萬用密碼）
    let isValidPassword = false;
    
    if (password === 'student123' || password === 'prof123' || password === 'admin123') {
      isValidPassword = true; // 開發模式萬用密碼
    } else {
      isValidPassword = await bcrypt.compare(password, user.password_hash);
    }

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: '密碼錯誤'
      });
    }

    // 生成 JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        studentId: user.student_id
      },
      JWT_SECRET as any,
      { expiresIn: JWT_EXPIRES_IN } as any
    ) as string;

    // 更新最後登入時間
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // 返回用戶資訊和 token
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.student_id,
        department: user.department,
        avatar: user.avatar_url
      }
    });

  } catch (error) {
    console.error('登入錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 註冊
router.post('/register', async (req, res) => {
  try {
    const { name, email, studentId, password, department, role = 'student' } = req.body;

    // 驗證必填欄位
    if (!name || !email || !studentId || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '姓名、郵箱、學號和密碼為必填項目'
      });
    }

    // 驗證角色
    if (!['student', 'professor'].includes(role)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '角色必須是 student 或 professor'
      });
    }

    // 檢查用戶是否已存在
    const existingUser = await query(
      'SELECT id FROM users WHERE student_id = $1 OR email = $2',
      [studentId, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: '學號或郵箱已被註冊'
      });
    }

    // 加密密碼
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 創建用戶
    const result = await query(
      'INSERT INTO users (name, email, student_id, password_hash, role, department) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, student_id, department',
      [name, email, studentId, hashedPassword, role, department]
    );

    const user = result.rows[0];

    // 創建用戶偏好設定
    await query(
      'INSERT INTO user_preferences (user_id) VALUES ($1)',
      [user.id]
    );

    // 生成 JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        studentId: user.student_id
      },
      JWT_SECRET as any,
      { expiresIn: JWT_EXPIRES_IN } as any
    ) as string;

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.student_id,
        department: user.department
      }
    });

  } catch (error) {
    console.error('註冊錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 獲取當前用戶資訊
router.get('/me', async (req, res) => {
  try {
    // 從請求中獲取用戶資訊（需要身份驗證中間件）
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '未授權訪問'
      });
    }

    const result = await query(
      'SELECT id, name, email, role, student_id, department, avatar_url, last_login_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '用戶不存在'
      });
    }

    const user = result.rows[0];

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.student_id,
        department: user.department,
        avatar: user.avatar_url,
        lastLogin: user.last_login_at
      }
    });

  } catch (error) {
    console.error('獲取用戶資訊錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 刷新 token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '刷新令牌為必填項目'
      });
    }

    // 驗證刷新令牌
    const decoded = jwt.verify(refreshToken, JWT_SECRET as any) as any;

    // 生成新的訪問令牌
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        role: decoded.role,
        studentId: decoded.studentId
      },
      JWT_SECRET as any,
      { expiresIn: JWT_EXPIRES_IN } as any
    ) as string;

    return res.json({
      token: newToken
    });

  } catch (error) {
    console.error('刷新令牌錯誤:', error);
    return res.status(401).json({
      error: 'Invalid Token',
      message: '無效的刷新令牌'
    });
  }
});

// 登出
router.post('/logout', async (req, res) => {
  try {
    // 在實際應用中，可以將 token 加入黑名單
    // 這裡簡化處理，直接返回成功
    return res.json({
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

export default router;
