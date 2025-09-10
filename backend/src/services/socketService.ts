import { Server, Socket } from 'socket.io';
import { query } from '../database';

interface ConnectedUser {
  socketId: string;
  userId: string;
  lectureId?: string;
  position?: { x: number; y: number };
  userInfo?: {
    name: string;
    role: string;
    avatar?: string;
  };
  joinedAt?: Date;
  lastActivity?: Date;
}

interface LectureRoom {
  id: string;
  participants: Map<string, ConnectedUser>;
  isLive: boolean;
  startTime?: Date;
  professorId?: string;
}

// 全局狀態
const connectedUsers = new Map<string, ConnectedUser>();
const lectureRooms = new Map<string, LectureRoom>();

export const setupSocketHandlers = (io: Server): void => {
  // 設定全域 Socket.IO 實例
  setSocketInstance(io);
  
  io.on('connection', (socket: Socket) => {
    console.log(`🔗 用戶連接: ${socket.id}`);

    // 加入講堂
    socket.on('join-lecture', async (data: {
      lectureId: string;
      userId: string;
      userInfo?: { name: string; role: string; avatar?: string }
    }) => {
      try {
        const { lectureId, userId, userInfo } = data;

        // 驗證講堂是否存在
        const lectureResult = await query(
          'SELECT l.id, l.title, l.status, c.professor_id FROM lectures l JOIN courses c ON l.course_id = c.id WHERE l.id = $1',
          [lectureId]
        );

        if (lectureResult.rows.length === 0) {
          socket.emit('error', { message: '講堂不存在' });
          return;
        }

        const lecture = lectureResult.rows[0];

        // 驗證用戶是否有權限參加
        if (lecture.status === 'cancelled') {
          socket.emit('error', { message: '講堂已被取消' });
          return;
        }

        // 更新連接用戶資訊
        const user: ConnectedUser = {
          socketId: socket.id,
          userId,
          lectureId,
          userInfo: userInfo || { name: '未知用戶', role: 'student' }
        };
        connectedUsers.set(socket.id, user);

        // 加入講堂房間
        socket.join(lectureId);

        // 初始化或獲取講堂房間
        if (!lectureRooms.has(lectureId)) {
          lectureRooms.set(lectureId, {
            id: lectureId,
            participants: new Map(),
            isLive: lecture.status === 'ongoing',
            professorId: lecture.professor_id
          });
        }

        const room = lectureRooms.get(lectureId)!;
        room.participants.set(userId, user);

        // 記錄參與者
        await query(
          'INSERT INTO lecture_participants (lecture_id, user_id) VALUES ($1, $2) ON CONFLICT (lecture_id, user_id) DO NOTHING',
          [lectureId, userId]
        );

        // 通知其他參與者
        socket.to(lectureId).emit('user-joined', {
          userId,
          userInfo,
          timestamp: new Date().toISOString()
        });

        // 發送當前講堂狀態給新用戶
        socket.emit('lecture-state', {
          isLive: room.isLive,
          participants: Array.from(room.participants.values()).map(p => ({
            userId: p.userId,
            userInfo: p.userInfo
          })),
          startTime: room.startTime?.toISOString()
        });

        console.log(`✅ 用戶 ${userId} 加入講堂 ${lectureId}`);

      } catch (error) {
        console.error('加入講堂錯誤:', error);
        socket.emit('error', { message: '加入講堂失敗' });
      }
    });

    // 更新位置
    socket.on('update-position', (data: { lectureId: string; position: { x: number; y: number } }) => {
      try {
        const { lectureId, position } = data;
        const user = connectedUsers.get(socket.id);

        if (user && user.lectureId === lectureId) {
          user.position = position;
          connectedUsers.set(socket.id, user);

          // 更新講堂房間中的位置
          const room = lectureRooms.get(lectureId);
          if (room) {
            room.participants.set(user.userId, user);
          }

          // 廣播位置更新
          socket.to(lectureId).emit('position-updated', {
            userId: user.userId,
            position,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('更新位置錯誤:', error);
      }
    });

    // 舉手發問
    socket.on('raise-hand', (data: { lectureId: string; userId: string }) => {
      try {
        const { lectureId, userId } = data;
        const user = connectedUsers.get(socket.id);

        if (user && user.lectureId === lectureId && user.userId === userId) {
          // 廣播到教授端
          io.to(lectureId).emit('hand-raised', {
            userId,
            userInfo: user.userInfo,
            position: user.position,
            timestamp: new Date().toISOString()
          });

          console.log(`🙋 用戶 ${userId} 舉手發問`);
        }
      } catch (error) {
        console.error('舉手發問錯誤:', error);
      }
    });

    // 發送提問
    socket.on('submit-question', async (data: {
      lectureId: string;
      userId: string;
      content: string;
      questionType?: string;
      position?: { x: number; y: number };
      isAnonymous?: boolean;
    }) => {
      try {
        const { lectureId, userId, content, questionType = 'text', position, isAnonymous = false } = data;
        const user = connectedUsers.get(socket.id);

        if (user && user.lectureId === lectureId && user.userId === userId) {
          // 儲存提問到資料庫
          const result = await query(
            'INSERT INTO questions (lecture_id, user_id, content, question_type, position_x, position_y, is_anonymous) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [lectureId, userId, content, questionType, position?.x, position?.y, isAnonymous]
          );

          const question = result.rows[0];

          // 廣播提問
          io.to(lectureId).emit('question-submitted', {
            ...question,
            userInfo: isAnonymous ? null : user.userInfo,
            timestamp: new Date().toISOString()
          });

          console.log(`❓ 用戶 ${userId} 提交提問`);
        }
      } catch (error) {
        console.error('提交提問錯誤:', error);
        socket.emit('error', { message: '提交提問失敗' });
      }
    });

    // 投票
    socket.on('vote', (data: { lectureId: string; userId: string; option: string }) => {
      try {
        const { lectureId, userId, option } = data;
        const user = connectedUsers.get(socket.id);

        if (user && user.lectureId === lectureId && user.userId === userId) {
          // 廣播投票
          io.to(lectureId).emit('vote-received', {
            userId,
            option,
            timestamp: new Date().toISOString()
          });

          console.log(`🗳️ 用戶 ${userId} 投票: ${option}`);
        }
      } catch (error) {
        console.error('投票錯誤:', error);
      }
    });

    // 教授控制
    socket.on('professor-control', async (data: {
      lectureId: string;
      userId: string;
      action: string;
      payload?: any;
    }) => {
      try {
        const { lectureId, userId, action, payload } = data;
        const user = connectedUsers.get(socket.id);

        if (user && user.lectureId === lectureId && user.userId === userId) {
          const room = lectureRooms.get(lectureId);

          if (room && room.professorId === userId) {
            switch (action) {
              case 'start-lecture':
                room.isLive = true;
                room.startTime = new Date();
                await query('UPDATE lectures SET status = $1 WHERE id = $2', ['ongoing', lectureId]);
                io.to(lectureId).emit('lecture-started', { startTime: room.startTime.toISOString() });
                break;

              case 'end-lecture':
                room.isLive = false;
                await query('UPDATE lectures SET status = $1 WHERE id = $2', ['completed', lectureId]);
                io.to(lectureId).emit('lecture-ended');
                break;

              case 'pause-lecture':
                room.isLive = false;
                io.to(lectureId).emit('lecture-paused');
                break;

              case 'resume-lecture':
                room.isLive = true;
                io.to(lectureId).emit('lecture-resumed');
                break;

              case 'request-attendance':
                // 廣播點名請求
                io.to(lectureId).emit('attendance-check');
                break;

              case 'assign-exercise':
                // 廣播練習題到學生端
                io.to(lectureId).emit('exercise-assigned', {
                  exercise: payload?.exercise,
                  deadline: payload?.deadline,
                  timestamp: new Date().toISOString()
                });
                break;

              default:
                console.log(`未知教授控制動作: ${action}`);
            }
          }
        }
      } catch (error) {
        console.error('教授控制錯誤:', error);
        socket.emit('error', { message: '控制操作失敗' });
      }
    });

    // 離開講堂
    socket.on('leave-lecture', async (data: { lectureId: string; userId: string }) => {
      try {
        const { lectureId, userId } = data;
        const user = connectedUsers.get(socket.id);

        if (user && user.lectureId === lectureId && user.userId === userId) {
          // 更新離開時間
          await query(
            'UPDATE lecture_participants SET left_at = NOW() WHERE lecture_id = $1 AND user_id = $2 AND left_at IS NULL',
            [lectureId, userId]
          );

          // 從講堂房間移除
          const room = lectureRooms.get(lectureId);
          if (room) {
            room.participants.delete(userId);
          }

          // 離開 Socket 房間
          socket.leave(lectureId);

          // 通知其他參與者
          socket.to(lectureId).emit('user-left', {
            userId,
            timestamp: new Date().toISOString()
          });

          console.log(`👋 用戶 ${userId} 離開講堂 ${lectureId}`);
        }
      } catch (error) {
        console.error('離開講堂錯誤:', error);
      }
    });

    // 斷開連接
    socket.on('disconnect', async () => {
      try {
        const user = connectedUsers.get(socket.id);

        if (user) {
          console.log(`📴 用戶斷開連接: ${socket.id} (${user.userId})`);

          // 如果用戶在講堂中，處理離開邏輯
          if (user.lectureId) {
            // 更新離開時間
            await query(
              'UPDATE lecture_participants SET left_at = NOW() WHERE lecture_id = $1 AND user_id = $2 AND left_at IS NULL',
              [user.lectureId, user.userId]
            );

            // 從講堂房間移除
            const room = lectureRooms.get(user.lectureId);
            if (room) {
              room.participants.delete(user.userId);
            }

            // 通知其他參與者
            socket.to(user.lectureId).emit('user-left', {
              userId: user.userId,
              timestamp: new Date().toISOString()
            });
          }

          // 從連接用戶列表中移除
          connectedUsers.delete(socket.id);
        }
      } catch (error) {
        console.error('斷開連接處理錯誤:', error);
      }
    });
    // 提交回饋
    socket.on('submit-feedback', async (data: {
      lectureId: string;
      userId: string;
      rating: number;
      comment?: string;
      feedbackType: 'overall' | 'content' | 'presentation' | 'interaction';
    }) => {
      try {
        const { lectureId, userId, rating, comment, feedbackType } = data;
        const user = connectedUsers.get(socket.id);

        if (user && user.lectureId === lectureId && user.userId === userId) {
          // 儲存回饋到資料庫
          await query(
            'INSERT INTO lecture_feedback (lecture_id, user_id, rating, comment, feedback_type) VALUES ($1, $2, $3, $4, $5)',
            [lectureId, userId, rating, comment, feedbackType]
          );

          // 通知教授有新回饋
          io.to(lectureId).emit('feedback-received', {
            userId,
            rating,
            feedbackType,
            timestamp: new Date().toISOString()
          });

          console.log(`📝 用戶 ${userId} 提交回饋: ${rating}星`);
        }
      } catch (error) {
        console.error('提交回饋錯誤:', error);
        socket.emit('error', { message: '提交回饋失敗' });
      }
    });

    // 請求幫助
    socket.on('request-help', (data: {
      lectureId: string;
      userId: string;
      helpType: 'technical' | 'content' | 'other';
      description?: string;
    }) => {
      try {
        const { lectureId, userId, helpType, description } = data;
        const user = connectedUsers.get(socket.id);

        if (user && user.lectureId === lectureId && user.userId === userId) {
          // 廣播幫助請求給教授
          io.to(lectureId).emit('help-requested', {
            userId,
            userInfo: user.userInfo,
            helpType,
            description,
            position: user.position,
            timestamp: new Date().toISOString()
          });

          console.log(`🆘 用戶 ${userId} 請求幫助: ${helpType}`);
        }
      } catch (error) {
        console.error('請求幫助錯誤:', error);
        socket.emit('error', { message: '請求幫助失敗' });
      }
    });

    // 教授回應幫助請求
    socket.on('respond-to-help', (data: {
      lectureId: string;
      userId: string;
      targetUserId: string;
      response: string;
      action?: 'resolved' | 'escalate' | 'ignore';
    }) => {
      try {
        const { lectureId, userId, targetUserId, response, action = 'resolved' } = data;
        const user = connectedUsers.get(socket.id);

        if (user && user.lectureId === lectureId && user.userId === userId) {
          const room = lectureRooms.get(lectureId);

          // 檢查是否為教授
          if (room && room.professorId === userId) {
            // 發送回應給特定用戶
            const targetSocket = Array.from(connectedUsers.entries())
              .find(([_, u]) => u.userId === targetUserId && u.lectureId === lectureId)?.[0];

            if (targetSocket) {
              io.to(targetSocket).emit('help-response', {
                professorId: userId,
                professorInfo: user.userInfo,
                response,
                action,
                timestamp: new Date().toISOString()
              });
            }

            console.log(`✅ 教授 ${userId} 回應幫助請求給 ${targetUserId}`);
          }
        }
      } catch (error) {
        console.error('回應幫助請求錯誤:', error);
        socket.emit('error', { message: '回應幫助請求失敗' });
      }
    });

    // 發送私人訊息
    socket.on('send-private-message', (data: {
      lectureId: string;
      userId: string;
      targetUserId: string;
      message: string;
      messageType?: 'text' | 'emoji' | 'file';
    }) => {
      try {
        const { lectureId, userId, targetUserId, message, messageType = 'text' } = data;
        const user = connectedUsers.get(socket.id);

        if (user && user.lectureId === lectureId && user.userId === userId) {
          // 查找目標用戶的socket
          const targetSocket = Array.from(connectedUsers.entries())
            .find(([_, u]) => u.userId === targetUserId && u.lectureId === lectureId)?.[0];

          if (targetSocket) {
            io.to(targetSocket).emit('private-message', {
              fromUserId: userId,
              fromUserInfo: user.userInfo,
              message,
              messageType,
              timestamp: new Date().toISOString()
            });

            console.log(`💬 用戶 ${userId} 發送私人訊息給 ${targetUserId}`);
          } else {
            socket.emit('error', { message: '目標用戶不線上' });
          }
        }
      } catch (error) {
        console.error('發送私人訊息錯誤:', error);
        socket.emit('error', { message: '發送訊息失敗' });
      }
    });

    // 心跳檢查
    socket.on('heartbeat', (data: { lectureId: string; userId: string }) => {
      try {
        const { lectureId, userId } = data;
        const user = connectedUsers.get(socket.id);

        if (user && user.lectureId === lectureId && user.userId === userId) {
          // 更新最後活動時間
          user.lastActivity = new Date();
          connectedUsers.set(socket.id, user);

          // 回應用戶心跳
          socket.emit('heartbeat-response', {
            timestamp: new Date().toISOString(),
            serverTime: Date.now()
          });
        }
      } catch (error) {
        console.error('心跳檢查錯誤:', error);
      }
    });

    // 獲取活躍用戶列表
    socket.on('get-active-users', (data: { lectureId: string }) => {
      try {
        const { lectureId } = data;
        const user = connectedUsers.get(socket.id);

        if (user && user.lectureId === lectureId) {
          const room = lectureRooms.get(lectureId);
          if (room) {
            const activeUsers = Array.from(room.participants.values()).map(p => ({
              userId: p.userId,
              userInfo: p.userInfo,
              position: p.position,
              joinedAt: p.joinedAt
            }));

            socket.emit('active-users-list', {
              users: activeUsers,
              count: activeUsers.length,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('獲取活躍用戶列表錯誤:', error);
        socket.emit('error', { message: '獲取用戶列表失敗' });
      }
    });

    // 學生回覆出席
    socket.on('attendance-response', (data: { lectureId: string; userId: string }) => {
      try {
        const { lectureId, userId } = data;
        const user = connectedUsers.get(socket.id);

        if (user && user.lectureId === lectureId && user.userId === userId) {
          // 廣播出席回覆給教授
          io.to(lectureId).emit('attendance-response', {
            userId,
            name: user.userInfo?.name || '學生',
            timestamp: new Date().toISOString()
          });
          console.log(`✅ 學生 ${userId} 回覆出席`);
        }
      } catch (error) {
        console.error('出席回覆錯誤:', error);
      }
    });

    // 學生提交練習
    socket.on('submit-exercise', (data: { lectureId: string; userId: string; answer: string }) => {
      try {
        const { lectureId, userId, answer } = data;
        const user = connectedUsers.get(socket.id);

        if (user && user.lectureId === lectureId && user.userId === userId) {
          // 廣播練習提交給教授
          io.to(lectureId).emit('exercise-submitted', {
            userId,
            answer,
            submittedAt: new Date().toISOString()
          });
          console.log(`📝 學生 ${userId} 提交練習答案`);
        }
      } catch (error) {
        console.error('提交練習錯誤:', error);
      }
    });

    // 批量位置更新（用於效能優化）
    socket.on('batch-update-positions', (data: {
      lectureId: string;
      positions: Array<{ userId: string; position: { x: number; y: number } }>
    }) => {
      try {
        const { lectureId, positions } = data;
        const user = connectedUsers.get(socket.id);

        if (user && user.lectureId === lectureId) {
          const room = lectureRooms.get(lectureId);
          if (room) {
            // 批量更新位置
            positions.forEach(({ userId: targetUserId, position }) => {
              const participant = room.participants.get(targetUserId);
              if (participant) {
                participant.position = position;
                room.participants.set(targetUserId, participant);
              }
            });

            // 廣播批量位置更新
            socket.to(lectureId).emit('batch-positions-updated', {
              positions,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error('批量更新位置錯誤:', error);
      }
    });

    // 教授端音訊串流
    socket.on('start-audio-stream', (data: { lectureId: string }) => {
      try {
        // TODO: 驗證使用者是否為教授
        console.log(`[Socket] Received start-audio-stream for lecture ${data.lectureId}`);
        const { startContinuousRecognition } = require('../services/speechService');
        startContinuousRecognition(data.lectureId);
      } catch (error) {
        console.error('Failed to start audio stream:', error);
      }
    });

    socket.on('audio-chunk', (chunk: Buffer) => {
      try {
        const { pushAudioChunk } = require('../services/speechService');
        pushAudioChunk(chunk);
      } catch (error) {
        console.error('Failed to process audio chunk:', error);
      }
    });

    socket.on('stop-audio-stream', () => {
      try {
        console.log(`[Socket] Received stop-audio-stream`);
        const { stopContinuousRecognition } = require('../services/speechService');
        stopContinuousRecognition();
      } catch (error) {
        console.error('Failed to stop audio stream:', error);
      }
    });

    // WebRTC 信令交換
    socket.on('webrtc-offer', (data: { targetSocketId: string; sdp: any }) => {
      socket.to(data.targetSocketId).emit('webrtc-offer', {
        senderSocketId: socket.id,
        sdp: data.sdp,
      });
    });

    socket.on('webrtc-answer', (data: { targetSocketId: string; sdp: any }) => {
      socket.to(data.targetSocketId).emit('webrtc-answer', {
        senderSocketId: socket.id,
        sdp: data.sdp,
      });
    });

    socket.on('webrtc-ice-candidate', (data: { targetSocketId: string; candidate: any }) => {
      socket.to(data.targetSocketId).emit('webrtc-ice-candidate', {
        senderSocketId: socket.id,
        candidate: data.candidate,
      });
    });
  });
};

// 獲取講堂統計資訊
export const getLectureStats = (lectureId: string) => {
  const room = lectureRooms.get(lectureId);
  if (!room) return null;

  const activeParticipants = Array.from(room.participants.values()).filter(p =>
    p.lastActivity && (Date.now() - p.lastActivity.getTime()) < 5 * 60 * 1000 // 5分鐘內活躍
  );

  return {
    participantCount: room.participants.size,
    activeParticipantCount: activeParticipants.length,
    isLive: room.isLive,
    startTime: room.startTime,
    participants: Array.from(room.participants.values()).map(p => ({
      userId: p.userId,
      userInfo: p.userInfo,
      position: p.position,
      joinedAt: p.joinedAt,
      lastActivity: p.lastActivity,
      isActive: p.lastActivity && (Date.now() - p.lastActivity.getTime()) < 5 * 60 * 1000
    })),
    professorId: room.professorId
  };
};

// 清理非活躍用戶
export const cleanupInactiveUsers = () => {
  const now = Date.now();
  const timeout = 10 * 60 * 1000; // 10分鐘超時

  for (const [socketId, user] of connectedUsers.entries()) {
    if (user.lastActivity && (now - user.lastActivity.getTime()) > timeout) {
      // 移除非活躍用戶
      if (user.lectureId) {
        const room = lectureRooms.get(user.lectureId);
        if (room) {
          room.participants.delete(user.userId);
        }
      }
      connectedUsers.delete(socketId);
      console.log(`🧹 清理非活躍用戶: ${user.userId}`);
    }
  }
};

// 每5分鐘清理一次非活躍用戶
setInterval(cleanupInactiveUsers, 5 * 60 * 1000);

// Socket.IO 實例（由 setupSocketHandlers 設定）
let socketInstance: Server | null = null;

// 獲取Socket.IO實例（用於外部調用）
export const getSocketInstance = () => socketInstance;

// 設定 Socket.IO 實例
export const setSocketInstance = (io: Server) => {
  socketInstance = io;
};

// 廣播訊息到講堂
export const broadcastToLecture = (lectureId: string, event: string, data: any) => {
  if (socketInstance) {
    socketInstance.to(lectureId).emit(event, data);
  }
};

// 發送訊息給特定用戶
export const sendToUser = (userId: string, event: string, data: any) => {
  if (socketInstance) {
    // 查找用戶的socket ID
    const userSocket = Array.from(connectedUsers.entries())
      .find(([_, user]) => user.userId === userId)?.[0];

    if (userSocket) {
      socketInstance.to(userSocket).emit(event, data);
    }
  }
};

// 獲取講堂中的活躍用戶
export const getActiveUsersInLecture = (lectureId: string) => {
  const room = lectureRooms.get(lectureId);
  if (!room) return [];

  return Array.from(room.participants.values()).filter(user =>
    user.lastActivity &&
    (Date.now() - user.lastActivity.getTime()) < 5 * 60 * 1000 // 5分鐘內活躍
  );
};
