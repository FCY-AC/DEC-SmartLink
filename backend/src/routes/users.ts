import express from 'express';
import { query } from '../database';
import { authenticateToken, requireAdmin, requireProfessorOrAdmin, optionalAuth } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const router = express.Router();

// 獲取用戶列表 (需要管理員權限)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, department, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (role) {
      whereClause += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (department) {
      whereClause += ` AND department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR student_id ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // 獲取總數
    const countResult = await query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );

    // 獲取分頁數據
    const result = await query(
      `SELECT id, name, email, role, student_id, department, avatar_url, is_active, last_login_at, created_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, Number(limit), offset]
    );

    res.json({
      users: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countResult.rows[0].total),
        totalPages: Math.ceil(Number(countResult.rows[0].total) / Number(limit))
      }
    });
  } catch (error) {
    console.error('獲取用戶列表錯誤:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 獲取特定用戶 (需要認證，用戶只能查看自己的資訊或管理員查看所有)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    // 用戶只能查看自己的資訊，除非是管理員或教授
    if (id !== userId && !['admin', 'professor'].includes(req.user?.role || '')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: '無權訪問其他用戶資訊'
      });
    }

    const result = await query(
      `SELECT id, name, email, role, student_id, department, avatar_url, is_active,
              last_login_at, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '用戶不存在'
      });
    }

    return res.json({
      user: result.rows[0]
    });
  } catch (error) {
    console.error('獲取用戶錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 更新用戶資訊 (用戶可以更新自己的資訊，管理員可以更新任何人)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { name, email, department, avatar_url } = req.body;

    // 用戶只能更新自己的資訊，除非是管理員
    if (id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: '無權修改其他用戶資訊'
      });
    }

    // 檢查郵箱是否已被其他用戶使用
    if (email) {
      const emailCheck = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(409).json({
          error: 'Conflict',
          message: '郵箱已被其他用戶使用'
        });
      }
    }

    const result = await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           department = COALESCE($3, department),
           avatar_url = COALESCE($4, avatar_url),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, email, role, student_id, department, avatar_url, updated_at`,
      [name, email, department, avatar_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '用戶不存在'
      });
    }

    return res.json({
      user: result.rows[0],
      message: '用戶資訊更新成功'
    });
  } catch (error) {
    console.error('更新用戶錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 刪除用戶 (僅管理員)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 不允許刪除自己的帳號
    if (id === req.user?.userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '不能刪除自己的帳號'
      });
    }

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '用戶不存在'
      });
    }

    return res.json({
      message: '用戶刪除成功',
      userId: result.rows[0].id
    });
  } catch (error) {
    console.error('刪除用戶錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 獲取用戶個人資料 (需要認證)
router.get('/profile/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;

    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.student_id, u.department, u.avatar_url,
              u.last_login_at, u.created_at,
              up.theme, up.language, up.notifications_enabled, up.auto_translate
       FROM users u
       LEFT JOIN user_preferences up ON u.id = up.user_id
       WHERE u.id = $1`,
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
      profile: {
        ...user,
        preferences: {
          theme: user.theme || 'light',
          language: user.language || 'zh',
          notificationsEnabled: user.notifications_enabled !== false,
          autoTranslate: user.auto_translate !== false
        }
      }
    });
  } catch (error) {
    console.error('獲取用戶個人資料錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 更新用戶個人資料 (需要認證)
router.put('/profile/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { name, email, department, avatar_url, preferences } = req.body;

    // 開始交易
    await query('BEGIN');

    try {
      // 更新用戶基本資訊
      await query(
        `UPDATE users
         SET name = COALESCE($1, name),
             email = COALESCE($2, email),
             department = COALESCE($3, department),
             avatar_url = COALESCE($4, avatar_url),
             updated_at = NOW()
         WHERE id = $5`,
        [name, email, department, avatar_url, userId]
      );

      // 更新用戶偏好設定
      if (preferences) {
        await query(
          `INSERT INTO user_preferences (user_id, theme, language, notifications_enabled, auto_translate)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id)
           DO UPDATE SET
             theme = EXCLUDED.theme,
             language = EXCLUDED.language,
             notifications_enabled = EXCLUDED.notifications_enabled,
             auto_translate = EXCLUDED.auto_translate`,
          [
            userId,
            preferences.theme || 'light',
            preferences.language || 'zh',
            preferences.notificationsEnabled !== false,
            preferences.autoTranslate !== false
          ]
        );
      }

      await query('COMMIT');

      // 獲取更新後的個人資料
      const result = await query(
        `SELECT u.id, u.name, u.email, u.role, u.student_id, u.department, u.avatar_url,
                up.theme, up.language, up.notifications_enabled, up.auto_translate
         FROM users u
         LEFT JOIN user_preferences up ON u.id = up.user_id
         WHERE u.id = $1`,
        [userId]
      );

      const user = result.rows[0];
      res.json({
        profile: {
          ...user,
          preferences: {
            theme: user.theme || 'light',
            language: user.language || 'zh',
            notificationsEnabled: user.notifications_enabled !== false,
            autoTranslate: user.auto_translate !== false
          }
        },
        message: '個人資料更新成功'
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('更新用戶個人資料錯誤:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 更改密碼 (需要認證)
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '當前密碼和新密碼為必填項目'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '新密碼長度至少6位'
      });
    }

    // 獲取用戶當前密碼哈希
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '用戶不存在'
      });
    }

    // 驗證當前密碼
    const isValidPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: '當前密碼錯誤'
      });
    }

    // 加密新密碼
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // 更新密碼
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedNewPassword, userId]
    );

    return res.json({
      message: '密碼更改成功'
    });
  } catch (error) {
    console.error('更改密碼錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

export default router;
