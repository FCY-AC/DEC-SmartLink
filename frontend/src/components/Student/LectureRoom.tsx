import React, { useState, useEffect, useRef } from 'react';
import { Button, Modal, message, Tooltip, Badge, Card, Form, Input, Radio, Space, Alert, Divider } from 'antd';
import {
  AudioOutlined,
  AudioMutedOutlined,
  MessageOutlined,
  QuestionOutlined,
  BookOutlined,
  SettingOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  SendOutlined,
  NotificationOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import getSocket, { joinLecture, leaveLecture } from '../../utils/socket';

interface LectureRoomProps {}

export const LectureRoom: React.FC<LectureRoomProps> = () => {
  const { id: lectureId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 狀態管理
  const [isLive] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [subtitles, setSubtitles] = useState<Array<{text: string, timestamp: string}>>([]);
  const [attendanceStatus, setAttendanceStatus] = useState<'pending' | 'responded'>('pending');
  const [showAttendanceAlert, setShowAttendanceAlert] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<{title: string; description?: string; deadline?: string} | null>(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [exerciseAnswer, setExerciseAnswer] = useState('');
  const [exerciseSubmitted, setExerciseSubmitted] = useState(false);

  // WebRTC 狀態
  const [peerConnections, setPeerConnections] = useState<Record<string, RTCPeerConnection>>({});
  const professorStreamRef = useRef<MediaStream | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const subtitleContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 連接 Socket 並加入講堂
    const socket = getSocket();
    const storedUser = localStorage.getItem('user');
    const userObj = storedUser ? JSON.parse(storedUser) : { id: 'student-1', name: '學生', role: 'student' };
    
    if (lectureId) {
      joinLecture(lectureId, userObj.id || 'student-1', { name: userObj.name || '學生', role: 'student' });
    }

    // 監聽點名通知
    socket.on('attendance-check', () => {
      console.log('收到點名通知');
      setShowAttendanceAlert(true);
      message.info('教授正在點名，請確認出席！', 5);
    });

    // 監聽練習題指派
    socket.on('exercise-assigned', (data: { exercise: any; deadline?: string; timestamp: string }) => {
      console.log('收到練習題:', data);
      setCurrentExercise(data.exercise);
      setShowExerciseModal(true);
      setExerciseSubmitted(false);
      message.success('New exercise assigned by the professor!');
    });

    // 監聽新字幕
    socket.on('new-subtitle', (data: { text: string; timestamp: string }) => {
      setSubtitles(prev => [...prev, data]);
    });

    // 模擬即時字幕 (備用)
    const mockSubtitles = [
      { text: "Welcome to today's lecture on algorithms", timestamp: new Date().toISOString() },
      { text: "Let's start with sorting algorithms", timestamp: new Date().toISOString() },
      { text: "Bubble sort is a simple sorting algorithm", timestamp: new Date().toISOString() },
    ];

    const interval = setInterval(() => {
      setSubtitles(prev => {
        const newSubs = [...prev];
        if (newSubs.length < mockSubtitles.length) {
          newSubs.push(mockSubtitles[newSubs.length]);
        }
        return newSubs.slice(-10); // 保留最近10條字幕
      });
    }, 3000);

    return () => {
      clearInterval(interval);
      if (lectureId && userObj?.id) {
        leaveLecture(lectureId, userObj.id);
      }
      socket.off('attendance-check');
      socket.off('exercise-assigned');
      socket.off('new-subtitle');
    };
  }, [lectureId]);

  // 自動滾動字幕
  useEffect(() => {
    if (subtitleContainerRef.current) {
      subtitleContainerRef.current.scrollTop = subtitleContainerRef.current.scrollHeight;
    }
  }, [subtitles]);

  // WebRTC useEffect
  useEffect(() => {
    const socket = getSocket();

    // 監聽新用戶加入，教授發送 offer
    socket.on('user-joined', (data: { userId: string; socketId: string }) => {
      const storedUser = localStorage.getItem('user');
      const userObj = storedUser ? JSON.parse(storedUser) : {};
      
      if (userObj.role === 'professor' && professorStreamRef.current) {
        const peerConnection = createPeerConnection(data.socketId);
        professorStreamRef.current.getTracks().forEach(track => {
          peerConnection.addTrack(track, professorStreamRef.current!);
        });
      }
    });
    
    // 學生端接收 offer
    socket.on('webrtc-offer', async (data: { senderSocketId: string; sdp: any }) => {
      const storedUser = localStorage.getItem('user');
      const userObj = storedUser ? JSON.parse(storedUser) : {};
      
      if (userObj.role === 'student') {
        const peerConnection = createPeerConnection(data.senderSocketId);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('webrtc-answer', { targetSocketId: data.senderSocketId, sdp: answer });
      }
    });

    // 教授端接收 answer
    socket.on('webrtc-answer', async (data: { senderSocketId: string; sdp: any }) => {
      const peerConnection = peerConnections[data.senderSocketId];
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }
    });

    // 接收 ICE candidate
    socket.on('webrtc-ice-candidate', (data: { senderSocketId: string; candidate: any }) => {
      const peerConnection = peerConnections[data.senderSocketId];
      if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    return () => {
      socket.off('user-joined');
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      Object.values(peerConnections).forEach(pc => pc.close());
    };
  }, [peerConnections]);

  const createPeerConnection = (targetSocketId: string) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        getSocket().emit('webrtc-ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    setPeerConnections(prev => ({ ...prev, [targetSocketId]: peerConnection }));
    return peerConnection;
  };

  // 回覆出席
  const respondToAttendance = () => {
    if (!lectureId) return;
    const socket = getSocket();
    const storedUser = localStorage.getItem('user');
    const userObj = storedUser ? JSON.parse(storedUser) : { id: 'student-1' };
    
    socket.emit('attendance-response', { lectureId, userId: userObj.id });
    setAttendanceStatus('responded');
    setShowAttendanceAlert(false);
    message.success('出席確認已發送！');
  };

  // 提交練習答案
  const submitExercise = () => {
    if (!lectureId || !exerciseAnswer.trim()) {
      message.warning('請先輸入答案');
      return;
    }
    
    const socket = getSocket();
    const storedUser = localStorage.getItem('user');
    const userObj = storedUser ? JSON.parse(storedUser) : { id: 'student-1' };
    
    socket.emit('submit-exercise', { 
      lectureId, 
      userId: userObj.id, 
      answer: exerciseAnswer 
    });
    
    setExerciseSubmitted(true);
    setShowExerciseModal(false);
    message.success('練習答案已提交！');
  };

  const handleRaiseHand = () => {
    message.success('已舉手，等待教授允許發問');
  };

  const handleVote = (option: string) => {
    message.success(`已投票選擇 ${option}`);
  };

  const handleTakeNotes = () => {
    message.info('筆記功能開發中...');
  };

  const handlePracticeQuiz = () => {
    if (currentExercise) {
      setShowExerciseModal(true);
    } else {
      message.info('目前沒有練習題');
    }
  };

  const handleLeaveLecture = () => {
    Modal.confirm({
      title: '確認離開',
      content: '確定要離開講堂嗎？',
      onOk: () => {
        navigate('/lectures');
      }
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* 出席通知 Alert */}
      {showAttendanceAlert && (
        <Alert
          message="📢 Professor is taking attendance"
          description="Please click the confirm button to respond to attendance."
          type="warning"
          showIcon
          closable
          action={
            <Space>
              <Button size="small" type="primary" onClick={respondToAttendance}>
                Confirm Attendance
              </Button>
              <Button size="small" onClick={() => setShowAttendanceAlert(false)}>
                Respond Later
              </Button>
            </Space>
          }
          onClose={() => setShowAttendanceAlert(false)}
          className="m-4"
        />
      )}

      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">
              CS101 - Introduction to Algorithms
            </h1>
            <Badge
              status={isLive ? "processing" : "default"}
              text={isLive ? "🔴 Live" : "⏸️ Paused"}
              className={isLive ? "text-red-600" : "text-gray-600"}
            />
            <Badge
              status={attendanceStatus === 'responded' ? "success" : "warning"}
              text={attendanceStatus === 'responded' ? "✅ Present" : "⏳ Pending"}
              className={attendanceStatus === 'responded' ? "text-green-600" : "text-yellow-600"}
            />
          </div>
          <div className="flex items-center space-x-2">
            {currentExercise && !exerciseSubmitted && (
              <Tooltip title="New exercise available">
                <Button 
                  type="primary" 
                  icon={<NotificationOutlined />}
                  onClick={() => setShowExerciseModal(true)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Exercise
                </Button>
              </Tooltip>
            )}
            <Tooltip title="Settings">
              <Button icon={<SettingOutlined />} />
            </Tooltip>
            <Button
              danger
              onClick={handleLeaveLecture}
              icon={<CloseOutlined />}
            >
              Leave
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* 主要內容區域 */}
        <div className="flex-1 flex flex-col">
          {/* 教授螢幕 */}
          <div className="flex-1 bg-black flex items-center justify-center relative">
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              poster="/api/placeholder/800/600"
              controls
              autoPlay
            >
              Your browser does not support the video tag.
            </video>

            {/* 字幕疊加層 */}
            {subtitles.length > 0 && (
              <div ref={subtitleContainerRef} className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg max-h-32 overflow-y-auto">
                {subtitles.map((sub, index) => (
                  <p key={index} className="mb-1">{sub.text}</p>
                ))}
              </div>
            )}
          </div>

          {/* 底部控制欄 */}
          <div className="bg-gray-800 p-4 flex-shrink-0">
            <div className="flex justify-center items-center space-x-4">
              <Tooltip title={isMuted ? "Unmute" : "Mute"}>
                <Button
                  type="text"
                  shape="circle"
                  size="large"
                  icon={isMuted ? <AudioMutedOutlined /> : <AudioOutlined />}
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-white hover:text-blue-400"
                />
              </Tooltip>

              <Tooltip title="Ask a Question">
                <Button
                  type="text"
                  shape="circle"
                  size="large"
                  icon={<QuestionOutlined />}
                  onClick={() => setShowQuestionModal(true)}
                  className="text-white hover:text-blue-400"
                />
              </Tooltip>

              <Tooltip title="Take Notes">
                <Button
                  type="text"
                  shape="circle"
                  size="large"
                  icon={<BookOutlined />}
                  onClick={handleTakeNotes}
                  className="text-white hover:text-blue-400"
                />
              </Tooltip>

              <Tooltip title="Practice Quiz">
                <Button
                  type="text"
                  shape="circle"
                  size="large"
                  icon={<MessageOutlined />}
                  onClick={handlePracticeQuiz}
                  className="text-white hover:text-blue-400"
                />
              </Tooltip>
            </div>
          </div>
        </div>

        {/* 側邊欄 */}
        <div className="w-80 bg-gray-800 flex flex-col flex-shrink-0">
          {/* 互動面板 */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold mb-3">Interaction Panel</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="primary"
                size="large"
                onClick={handleRaiseHand}
                className="h-16 bg-yellow-600 hover:bg-yellow-700"
              >
                🤚 Raise Hand
              </Button>
              <Button
                size="large"
                onClick={() => handleVote('A')}
                className="h-16 bg-gray-700 hover:bg-gray-600"
              >
                📊 Vote
              </Button>
              <Button
                size="large"
                onClick={handleTakeNotes}
                className="h-16 bg-gray-700 hover:bg-gray-600"
              >
                📝 Notes
              </Button>
              <Button
                size="large"
                onClick={handlePracticeQuiz}
                className="h-16 bg-gray-700 hover:bg-gray-600"
              >
                🧠 Practice
              </Button>
            </div>
          </div>

          {/* 學術詞彙 */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold mb-3">Academic Terms</h3>
            <div className="space-y-2">
              <div className="bg-blue-900 bg-opacity-50 p-3 rounded cursor-pointer hover:bg-opacity-75">
                <div className="text-blue-300 font-medium">algorithm</div>
                <div className="text-blue-200 text-sm">A set of rules for calculations.</div>
              </div>
              <div className="bg-blue-900 bg-opacity-50 p-3 rounded cursor-pointer hover:bg-opacity-75">
                <div className="text-blue-300 font-medium">complexity</div>
                <div className="text-blue-200 text-sm">The measure of resources needed.</div>
              </div>
            </div>
          </div>

          {/* 狀態指示器 */}
          <div className="p-4 flex-1">
            <h3 className="text-white font-semibold mb-3">Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Attendance</span>
                <span className="text-green-400 font-medium">✅ Present</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Position</span>
                <span className="text-blue-400 font-medium flex items-center">
                  <EnvironmentOutlined className="mr-1" />
                  Updated
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Engagement</span>
                <span className="text-yellow-400 font-medium">🟡 Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 提問模態框 */}
      <Modal
        title="Question System"
        open={showQuestionModal}
        onCancel={() => setShowQuestionModal(false)}
        footer={null}
        width={500}
        className="dark-modal"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Question
            </label>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Enter your question here..."
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button onClick={() => setShowQuestionModal(false)}>
              Cancel
            </Button>
            <Button type="primary" className="bg-primary-blue">
              Send Question
            </Button>
          </div>
        </div>
      </Modal>

      {/* 練習題模態框 */}
      <Modal
        title="📝 In-Class Exercise"
        open={showExerciseModal}
        onCancel={() => setShowExerciseModal(false)}
        footer={null}
        width={600}
      >
        {currentExercise && (
          <div className="space-y-4">
            <Card className="bg-blue-50 border-l-4 border-blue-400">
              <h3 className="font-bold text-lg mb-2">{currentExercise.title}</h3>
              {currentExercise.description && (
                <p className="text-gray-700 mb-2">{currentExercise.description}</p>
              )}
              {currentExercise.deadline && (
                <p className="text-sm text-red-600">
                  Deadline: {new Date(currentExercise.deadline).toLocaleString()}
                </p>
              )}
            </Card>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Answer
              </label>
              <Input.TextArea
                value={exerciseAnswer}
                onChange={(e) => setExerciseAnswer(e.target.value)}
                placeholder="Enter your answer here..."
                rows={4}
                disabled={exerciseSubmitted}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button onClick={() => setShowExerciseModal(false)}>
                Answer Later
              </Button>
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                onClick={submitExercise}
                disabled={exerciseSubmitted}
              >
                {exerciseSubmitted ? 'Submitted' : 'Submit Answer'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LectureRoom;
