import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (socket) return socket;

  const baseUrl = (process.env.REACT_APP_API_BASE || 'http://localhost:3001/api/v1')
    .replace('/api/v1', '');

  socket = io(baseUrl, {
    transports: ['websocket'],
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('🔗 Socket connected:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('📴 Socket disconnected');
  });

  return socket;
};

export const joinLecture = (lectureId: string, userId: string, userInfo?: { name: string; role: string; avatar?: string }) => {
  const s = getSocket();
  s.emit('join-lecture', { lectureId, userId, userInfo });
};

export const leaveLecture = (lectureId: string, userId: string) => {
  const s = getSocket();
  s.emit('leave-lecture', { lectureId, userId });
};

export const professorControl = (lectureId: string, userId: string, action: string, payload?: any) => {
  const s = getSocket();
  s.emit('professor-control', { lectureId, userId, action, payload });
};

export default getSocket;

