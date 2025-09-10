import express from 'express';
import { query } from '../database';
import { authenticateToken, requireProfessorOrAdmin, optionalAuth } from '../middleware/auth';

const router = express.Router();

// 獲取講堂列表 (需要認證)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { courseId, status, limit = 50, offset = 0 } = req.query;

    let sql = `
      SELECT
        l.id, l.title, l.description, l.scheduled_at, l.duration_minutes,
        l.room_location, l.status, l.recording_url, l.created_at,
        c.title as course_title, c.code as course_code,
        u.name as professor_name,
        COUNT(lp.id) as participant_count
      FROM lectures l
      JOIN courses c ON l.course_id = c.id
      JOIN users u ON c.professor_id = u.id
      LEFT JOIN lecture_participants lp ON l.id = lp.lecture_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (courseId) {
      sql += ` AND l.course_id = $${paramIndex}`;
      params.push(courseId);
      paramIndex++;
    }

    if (status) {
      sql += ` AND l.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    sql += `
      GROUP BY l.id, c.title, c.code, u.name
      ORDER BY l.scheduled_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await query(sql, params);

    res.json({
      lectures: result.rows,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error) {
    console.error('獲取講堂列表錯誤:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 獲取今日課程 (需要認證)
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const result = await query(`
      SELECT
        l.id, l.title, l.description, l.scheduled_at, l.duration_minutes,
        l.room_location, l.status, l.recording_url,
        c.title as course_title, c.code as course_code,
        u.name as professor_name,
        COUNT(lp.id) as participant_count
      FROM lectures l
      JOIN courses c ON l.course_id = c.id
      JOIN users u ON c.professor_id = u.id
      LEFT JOIN lecture_participants lp ON l.id = lp.lecture_id
      WHERE l.scheduled_at >= $1 AND l.scheduled_at < $2
      GROUP BY l.id, c.title, c.code, u.name
      ORDER BY l.scheduled_at ASC
    `, [startOfDay, endOfDay]);

    return res.json({
      lectures: result.rows
    });
  } catch (error) {
    console.error('獲取今日課程錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 獲取特定講堂詳情 (需要認證)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT
        l.*,
        c.title as course_title, c.code as course_code, c.description as course_description,
        u.name as professor_name, u.email as professor_email,
        COUNT(lp.id) as participant_count
      FROM lectures l
      JOIN courses c ON l.course_id = c.id
      JOIN users u ON c.professor_id = u.id
      LEFT JOIN lecture_participants lp ON l.id = lp.lecture_id
      WHERE l.id = $1
      GROUP BY l.id, c.title, c.code, c.description, u.name, u.email
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '講堂不存在'
      });
    }

    return res.json({
      lecture: result.rows[0]
    });
  } catch (error) {
    console.error('獲取講堂詳情錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 創建新講堂 (教授權限)
router.post('/', authenticateToken, requireProfessorOrAdmin, async (req, res) => {
  try {
    const {
      courseId,
      title,
      description,
      scheduledAt,
      durationMinutes,
      roomLocation,
      maxParticipants,
      isRecorded
    } = req.body;

    // 驗證必填欄位
    if (!courseId || !title || !scheduledAt) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '課程ID、標題和排程時間為必填項目'
      });
    }

    // 驗證用戶是否有權限創建講堂
    const courseResult = await query(
      'SELECT professor_id FROM courses WHERE id = $1',
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '課程不存在'
      });
    }

    // 創建講堂
    const result = await query(`
      INSERT INTO lectures (
        course_id, title, description, scheduled_at, duration_minutes,
        room_location, max_participants, is_recorded
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      courseId, title, description, scheduledAt, durationMinutes,
      roomLocation, maxParticipants, isRecorded
    ]);

    return res.status(201).json({
      lecture: result.rows[0]
    });
  } catch (error) {
    console.error('創建講堂錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 更新講堂資訊 (教授權限)
router.put('/:id', authenticateToken, requireProfessorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const {
      title,
      description,
      scheduledAt,
      durationMinutes,
      roomLocation,
      maxParticipants,
      isRecorded,
      status
    } = req.body;

    // 檢查講堂是否存在並驗證權限
    const lectureCheck = await query(`
      SELECT l.*, c.professor_id
      FROM lectures l
      JOIN courses c ON l.course_id = c.id
      WHERE l.id = $1
    `, [id]);

    if (lectureCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '講堂不存在'
      });
    }

    const lecture = lectureCheck.rows[0];

    // 檢查用戶是否為該課程的教授或管理員
    if (lecture.professor_id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: '無權修改此講堂'
      });
    }

    // 更新講堂
    const result = await query(`
      UPDATE lectures
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          scheduled_at = COALESCE($3, scheduled_at),
          duration_minutes = COALESCE($4, duration_minutes),
          room_location = COALESCE($5, room_location),
          max_participants = COALESCE($6, max_participants),
          is_recorded = COALESCE($7, is_recorded),
          status = COALESCE($8, status),
          updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      title, description, scheduledAt, durationMinutes,
      roomLocation, maxParticipants, isRecorded, status, id
    ]);

    return res.json({
      lecture: result.rows[0],
      message: '講堂更新成功'
    });
  } catch (error) {
    console.error('更新講堂錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 刪除講堂 (教授權限)
router.delete('/:id', authenticateToken, requireProfessorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    // 檢查講堂是否存在並驗證權限
    const lectureCheck = await query(`
      SELECT l.*, c.professor_id
      FROM lectures l
      JOIN courses c ON l.course_id = c.id
      WHERE l.id = $1
    `, [id]);

    if (lectureCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '講堂不存在'
      });
    }

    const lecture = lectureCheck.rows[0];

    // 檢查用戶是否為該課程的教授或管理員
    if (lecture.professor_id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: '無權刪除此講堂'
      });
    }

    // 刪除講堂
    await query('DELETE FROM lectures WHERE id = $1', [id]);

    return res.json({
      message: '講堂刪除成功'
    });
  } catch (error) {
    console.error('刪除講堂錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 開始講堂 (教授權限)
router.post('/:id/start', authenticateToken, requireProfessorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    // 檢查講堂是否存在並驗證權限
    const lectureCheck = await query(`
      SELECT l.*, c.professor_id
      FROM lectures l
      JOIN courses c ON l.course_id = c.id
      WHERE l.id = $1
    `, [id]);

    if (lectureCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '講堂不存在'
      });
    }

    const lecture = lectureCheck.rows[0];

    // 檢查用戶是否為該課程的教授或管理員
    if (lecture.professor_id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: '無權開始此講堂'
      });
    }

    // 檢查講堂狀態
    if (lecture.status === 'ongoing') {
      return res.status(400).json({
        error: 'Bad Request',
        message: '講堂已經開始'
      });
    }

    // 更新講堂狀態為進行中
    const result = await query(`
      UPDATE lectures
      SET status = 'ongoing',
          started_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    return res.json({
      lecture: result.rows[0],
      message: '講堂開始成功'
    });
  } catch (error) {
    console.error('開始講堂錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 結束講堂 (教授權限)
router.post('/:id/end', authenticateToken, requireProfessorOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { recordingUrl } = req.body; // 新增：接收錄影 URL

    // 檢查講堂是否存在並驗證權限
    const lectureCheck = await query(`
      SELECT l.*, c.professor_id
      FROM lectures l
      JOIN courses c ON l.course_id = c.id
      WHERE l.id = $1
    `, [id]);

    if (lectureCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '講堂不存在'
      });
    }

    const lecture = lectureCheck.rows[0];

    // 檢查用戶是否為該課程的教授或管理員
    if (lecture.professor_id !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: '無權結束此講堂'
      });
    }

    // 檢查講堂狀態（允許從 ongoing 或 scheduled 結束）
    if (lecture.status === 'completed') {
      return res.status(400).json({
        error: 'Bad Request',
        message: '講堂已經結束'
      });
    }

    // 更新講堂狀態為已結束，並保存錄影 URL
    const result = await query(`
      UPDATE lectures
      SET status = 'completed',
          ended_at = NOW(),
          recording_url = COALESCE($1, recording_url),
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [recordingUrl, id]);

    return res.json({
      lecture: result.rows[0],
      message: '講堂結束成功'
    });
  } catch (error) {
    console.error('結束講堂錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 獲取講堂參與者 (教授或參與者)
router.get('/:id/participants', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    // 檢查講堂是否存在
    const lectureCheck = await query(`
      SELECT l.*, c.professor_id
      FROM lectures l
      JOIN courses c ON l.course_id = c.id
      WHERE l.id = $1
    `, [id]);

    if (lectureCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '講堂不存在'
      });
    }

    const lecture = lectureCheck.rows[0];

    // 檢查用戶權限（教授或參與者）
    if (lecture.professor_id !== userId && req.user?.role !== 'admin') {
      // 檢查是否為參與者
      const participantCheck = await query(
        'SELECT id FROM lecture_participants WHERE lecture_id = $1 AND user_id = $2',
        [id, userId]
      );

      if (participantCheck.rows.length === 0) {
        return res.status(403).json({
          error: 'Forbidden',
          message: '無權查看此講堂參與者'
        });
      }
    }

    // 獲取參與者列表
    const result = await query(`
      SELECT
        lp.id,
        lp.joined_at,
        lp.left_at,
        lp.is_active,
        u.name,
        u.email,
        u.avatar_url,
        u.student_id
      FROM lecture_participants lp
      JOIN users u ON lp.user_id = u.id
      WHERE lp.lecture_id = $1
      ORDER BY lp.joined_at ASC
    `, [id]);

    return res.json({
      participants: result.rows
    });
  } catch (error) {
    console.error('獲取講堂參與者錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 加入講堂 (學生)
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { deviceInfo } = req.body;

    // 檢查講堂是否存在
    const lectureCheck = await query(
      'SELECT id, status, max_participants FROM lectures WHERE id = $1',
      [id]
    );

    if (lectureCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '講堂不存在'
      });
    }

    const lecture = lectureCheck.rows[0];

    // 檢查講堂狀態
    if (lecture.status !== 'in_progress') {
      return res.status(400).json({
        error: 'Bad Request',
        message: '講堂尚未開始或已經結束'
      });
    }

    // 檢查是否已經加入
    const existingParticipant = await query(
      'SELECT id FROM lecture_participants WHERE lecture_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingParticipant.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: '已經加入此講堂'
      });
    }

    // 檢查參與者人數限制
    if (lecture.max_participants) {
      const participantCount = await query(
        'SELECT COUNT(*) as count FROM lecture_participants WHERE lecture_id = $1 AND is_active = true',
        [id]
      );

      if (participantCount.rows[0].count >= lecture.max_participants) {
        return res.status(409).json({
          error: 'Conflict',
          message: '講堂參與者已滿'
        });
      }
    }

    // 加入講堂
    const result = await query(`
      INSERT INTO lecture_participants (lecture_id, user_id, device_info)
      VALUES ($1, $2, $3)
      RETURNING id, joined_at
    `, [id, userId, deviceInfo || {}]);

    return res.status(201).json({
      participantId: result.rows[0].id,
      joinedAt: result.rows[0].joined_at,
      message: '成功加入講堂'
    });
  } catch (error) {
    console.error('加入講堂錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

// 離開講堂 (學生)
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    // 更新參與者狀態
    const result = await query(`
      UPDATE lecture_participants
      SET left_at = NOW(),
          is_active = false,
          updated_at = NOW()
      WHERE lecture_id = $1 AND user_id = $2 AND is_active = true
      RETURNING id
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: '未找到活躍的參與記錄'
      });
    }

    return res.json({
      message: '成功離開講堂'
    });
  } catch (error) {
    console.error('離開講堂錯誤:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: '伺服器內部錯誤'
    });
  }
});

export default router;
