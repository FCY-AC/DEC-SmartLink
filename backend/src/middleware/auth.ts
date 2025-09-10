import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 擴展 Request 介面以包含用戶資訊
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
        studentId: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// JWT 認證中間件
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      error: 'Access Token Required',
      message: '請求需要有效的訪問令牌'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET as any) as any;
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      studentId: decoded.studentId
    };
    next();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Token 驗證錯誤:', message);

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Token Expired',
        message: '訪問令牌已過期'
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Invalid Token',
        message: '無效的訪問令牌'
      });
    } else {
      res.status(500).json({
        error: 'Token Verification Failed',
        message: '令牌驗證失敗'
      });
    }
  }
};

// 角色授權中間件
export const authorizeRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication Required',
        message: '需要身份驗證'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Insufficient Permissions',
        message: '權限不足，無法訪問此資源'
      });
      return;
    }

    next();
  };
};

// 可選認證中間件（用於不需要強制認證的路由）
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET as any) as any;
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
        studentId: decoded.studentId
      };
    } catch (error: unknown) {
      // 可選認證，驗證失敗不阻擋請求
      const message = error instanceof Error ? error.message : String(error);
      console.warn('可選認證失敗:', message);
    }
  }

  next();
};

// 教授專用中間件
export const requireProfessor = authorizeRole('professor');

// 學生專用中間件
export const requireStudent = authorizeRole('student');

// 管理員專用中間件（未來使用）
export const requireAdmin = authorizeRole('admin');

// 教授或管理員中間件
export const requireProfessorOrAdmin = authorizeRole('professor', 'admin');

// 學生或教授中間件
export const requireStudentOrProfessor = authorizeRole('student', 'professor');

// 速率限制中間件（基礎實現）
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'anonymous';
    const now = Date.now();
    const windowData = requestCounts.get(key);

    if (!windowData || now > windowData.resetTime) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (windowData.count >= maxRequests) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: '請求過多，請稍後再試'
      });
      return;
    }

    windowData.count++;
    next();
  };
};

// CORS 預檢請求處理
export const handleOptions = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
  } else {
    next();
  }
};
