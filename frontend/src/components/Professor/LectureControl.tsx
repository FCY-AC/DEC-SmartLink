import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Typography, Row, Col, List, Badge, Modal, Input, message, Space, Statistic, Tabs, Form, DatePicker, Divider } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  StopOutlined,
  QuestionCircleOutlined,
  VideoCameraOutlined,
  SendOutlined,
  TeamOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import getSocket, { joinLecture, leaveLecture, professorControl } from '../../utils/socket';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Student {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  joinTime: string;
  questions: number;
}

interface Question {
  id: string;
  student: string;
  content: string;
  timestamp: string;
  status: 'pending' | 'answered';
}

export const LectureControl: React.FC = () => {
  const { id: lectureId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [isLive, setIsLive] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [attendance, setAttendance] = useState<Array<{ userId: string; name: string; joinedAt?: string; lastActivity?: string }>>([]);
  const [attendanceRequestedAt, setAttendanceRequestedAt] = useState<string | null>(null);
  const [exAssigned, setExAssigned] = useState<Array<{ userId: string; answer?: string; submittedAt?: string }>>([]);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [lectureMode, setLectureMode] = useState<'live' | 'video'>('live');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const professorStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // 從導航狀態獲取螢幕串流
    const state = (navigate as any).location?.state;
    if (state?.stream) {
      setScreenStream(state.stream);
      setLectureMode('live');
      
      // 設定影片元素顯示螢幕串流
      if (videoRef.current) {
        videoRef.current.srcObject = state.stream;
      }
    }

    // 檢查 URL 參數
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const videoFile = urlParams.get('file');
    
    if (mode === 'video' && videoFile) {
      setLectureMode('video');
      setCurrentVideo(decodeURIComponent(videoFile));
    }

    // 模擬學生資料
    setStudents([
      { id: '1', name: 'Student One', status: 'active', joinTime: '10:00', questions: 2 },
      { id: '2', name: '王小明', status: 'active', joinTime: '10:01', questions: 1 },
      { id: '3', name: '李小華', status: 'inactive', joinTime: '10:02', questions: 0 }
    ]);

    // 模擬提問
    setQuestions([
      { id: '1', student: 'Student One', content: '請問這個演算法的時間複雜度是多少？', timestamp: '10:15', status: 'pending' },
      { id: '2', student: '王小明', content: '能否再解釋一下遞迴的概念？', timestamp: '10:20', status: 'pending' }
    ]);
    // Socket 事件
    const socket = getSocket();
    const storedUser = localStorage.getItem('user');
    const userObj = storedUser ? JSON.parse(storedUser) : { id: 'prof-1', name: 'Professor', role: 'professor' };
    if (lectureId) {
      joinLecture(lectureId, userObj.id || 'prof-1', { name: userObj.name, role: 'professor' });
    }

    socket.on('active-users-list', (data: { users: any[] }) => {
      setAttendance(data.users.map(u => ({
        userId: u.userId,
        name: u.userInfo?.name || '學生',
        joinedAt: u.joinedAt,
        lastActivity: u.lastActivity
      })));
    });

    socket.on('attendance-response', (data: { userId: string; name?: string; timestamp: string }) => {
      setAttendance(prev => {
        const exists = prev.find(p => p.userId === data.userId);
        if (exists) return prev;
        return [...prev, { userId: data.userId, name: data.name || '學生', joinedAt: data.timestamp }];
      });
    });

    socket.on('exercise-submitted', (data: { userId: string; answer: string; submittedAt: string }) => {
      setExAssigned(prev => {
        const idx = prev.findIndex(p => p.userId === data.userId);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], answer: data.answer, submittedAt: data.submittedAt };
          return copy;
        }
        return [...prev, { userId: data.userId, answer: data.answer, submittedAt: data.submittedAt }];
      });
    });

    return () => {
      if (lectureId && userObj?.id) {
        leaveLecture(lectureId, userObj.id);
      }
      socket.off('active-users-list');
      socket.off('attendance-response');
      socket.off('exercise-submitted');
    };
  }, [navigate, lectureId]);

  const handleStartLecture = async () => {
    if (lectureMode === 'live' && !screenStream) {
      // 如果是即時模式但沒有螢幕串流，重新請求
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        setScreenStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        // 監聽串流結束事件
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          handleStopScreenShare();
        });

        // 開始傳送音訊串流至後端
        startAudioStreaming(stream);
        
      } catch (error) {
        message.error('無法獲取螢幕串流，請重新嘗試');
        return;
      }
    }

    setIsLive(true);
    setIsRecording(true);
    message.success('講課已開始！學生現在可以看到您的內容');
    
    // 通知後端講課已開始
    if (lectureId) {
      try {
        const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api/v1';
        await fetch(`${apiBase}/lectures/${lectureId}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        });
        console.log('講堂狀態已更新為 ongoing');
      } catch (err) {
        console.warn('更新講堂開始狀態失敗:', err);
      }
    }
    
    // 開始錄製（如果是即時模式）
    if (lectureMode === 'live') {
      const st = screenStream || (videoRef.current?.srcObject as MediaStream | null);
      if (st) {
        professorStreamRef.current = st;
        // 通知所有已在房間的學生
        const socket = getSocket();
        socket.emit('start-sharing', { lectureId });
        try {
          startRecordingCompat(st);
          // 如果音訊串流尚未啟動，再次啟動
          if (!audioMediaRecorderRef.current || audioMediaRecorderRef.current.state === 'inactive') {
            startAudioStreaming(st);
          }
        } catch (e) {
          console.warn('錄製啟動失敗:', e);
        }
      }
    }
  };

  const handleStopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    setIsLive(false);
    setIsRecording(false);
    message.warning('螢幕分享已停止。您可以重新開始或結束講課');
  };

  const startRecordingCompat = (stream: MediaStream) => {
    try {
      const candidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm'
      ];
      const picked = candidates.find((t) => {
        try { return (window as any).MediaRecorder?.isTypeSupported(t); } catch { return false; }
      });
      const options = picked ? { mimeType: picked } as MediaRecorderOptions : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('MediaRecorder 停止，開始處理錄影...');
        const blob = new Blob(chunks, { type: picked || 'video/webm' });
        console.log('錄影 Blob 大小:', blob.size, 'bytes');
        
        if (blob.size === 0) {
          console.warn('錄影 Blob 為空');
          message.warning('錄影內容為空，可能錄製時間太短');
          return;
        }
        
        // 上傳至後端
        const form = new FormData();
        form.append('file', blob, `lecture-${lectureId || 'unknown'}-${Date.now()}.webm`);
        const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api/v1';
        
        try {
          console.log('開始上傳錄影到:', `${apiBase}/uploads/recording`);
          const response = await fetch(`${apiBase}/uploads/recording`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token') || ''}`
            },
            body: form
          });
          
          console.log('上傳回應狀態:', response.status);
          const data = await response.json();
          console.log('上傳回應數據:', data);
          
          if (data.url) {
            message.success(`錄影已上傳！檔案: ${data.filename}`);
            console.log('🎥 錄影 URL:', `http://localhost:3001${data.url}`);
            console.log('📁 直接存取:', `http://localhost:3001${data.url}`);
            
            // 記錄錄影 URL，但不自動開啟
            console.log('📁 Recording available at:', `http://localhost:3001${data.url}`);
            
            // 將錄影 URL 保存到講堂記錄並更新狀態
            if (lectureId) {
              try {
                const endResponse = await fetch(`${apiBase}/lectures/${lectureId}/end`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token') || ''}`
                  },
                  body: JSON.stringify({ recordingUrl: data.url })
                });
                
                if (endResponse.ok) {
                  console.log('講堂狀態已更新為 completed，錄影 URL 已保存');
                  message.success('講課已結束，錄影已保存到雲端');
                } else {
                  console.warn('更新講堂狀態失敗:', await endResponse.text());
                }
              } catch (err) {
                console.warn('保存錄影 URL 到講堂記錄失敗:', err);
              }
            }
          } else {
            console.error('上傳失敗，回應:', data);
            message.warning('錄影已保存但上傳失敗');
          }
        } catch (error) {
          console.error('上傳錄影時發生錯誤:', error);
          message.warning('錄影已保存但上傳失敗');
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      console.log('開始錄製講課內容...');
    } catch (err) {
      console.warn('此瀏覽器不支援 MediaRecorder 或啟動失敗:', err);
      message.warning('此瀏覽器不支援錄影，將僅進行螢幕分享');
    }
  };

  const handlePauseLecture = () => {
    setIsLive(false);
    message.info('講課已暫停');
  };

  const handleEndLecture = () => {
    console.log('handleEndLecture 被點擊了');
    
    // 直接執行結束邏輯，不使用 Modal
    const doEndLecture = () => {
      console.log('開始執行結束講課邏輯');
      
      // 停止錄製並觸發上傳
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          message.loading({ content: '正在結束並上傳錄影...', key: 'ending', duration: 0 });
          mediaRecorderRef.current.onstop = mediaRecorderRef.current.onstop; // 保留上傳流程
          mediaRecorderRef.current.stop();
          // 稍等上傳觸發
          setTimeout(() => message.destroy('ending'), 2000);
        } catch (e) {
          message.warning('結束錄影時發生問題');
        }
      } else {
        message.info('沒有錄影或瀏覽器不支援錄影');
      }

      // 停止音訊串流
      if (audioMediaRecorderRef.current && audioMediaRecorderRef.current.state !== 'inactive') {
        audioMediaRecorderRef.current.stop();
        getSocket().emit('stop-audio-stream');
      }

      handleStopScreenShare();
      setIsLive(false);
      message.success('Lecture ended successfully');
      
      console.log('Lecture ended, staying on current page');
      // 不再自動跳轉，留在當前頁面
    };

    // 先試試直接執行，如果需要確認再用 Modal
    if (window.confirm('End this lecture? Students will no longer be able to participate.')) {
      doEndLecture();
    }
  };

  const startAudioStreaming = (stream: MediaStream) => {
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      console.warn('No audio track found in the stream.');
      return;
    }
    const audioStream = new MediaStream([audioTrack]);
    const socket = getSocket();

    socket.emit('start-audio-stream', { lectureId });
    
    try {
      const mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm; codecs=opus' });

      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          socket.emit('audio-chunk', event.data);
        }
      });
      
      mediaRecorder.start(1000); // Send chunks every second
      audioMediaRecorderRef.current = mediaRecorder;
      console.log('🎤 Audio streaming to backend has started.');
    } catch (err) {
      console.error('Failed to start audio MediaRecorder:', err);
      message.error('Could not start audio streaming for transcription.');
    }
  };

  // 觸發點名（請求出席）
  const triggerAttendanceCheck = () => {
    if (!lectureId) return;
    const storedUser = localStorage.getItem('user');
    const userObj = storedUser ? JSON.parse(storedUser) : { id: 'prof-1' };
    professorControl(lectureId, userObj.id, 'request-attendance');
    setAttendanceRequestedAt(new Date().toISOString());
    // 同時請求活躍名單
    getSocket().emit('get-active-users', { lectureId });
    message.success('已發送點名通知');
  };

  // 指派練習題
  const [exerciseForm] = Form.useForm();
  const assignExercise = async () => {
    if (!lectureId) return;
    const storedUser = localStorage.getItem('user');
    const userObj = storedUser ? JSON.parse(storedUser) : { id: 'prof-1' };
    const values = await exerciseForm.validateFields();
    professorControl(lectureId, userObj.id, 'assign-exercise', { exercise: values });
    message.success('練習題已指派給所有學生');
  };

  const handleVideoUpload = (file: File) => {
    const videoUrl = URL.createObjectURL(file);
    setCurrentVideo(videoUrl);
    message.success('影片已載入，點擊開始講課來播放給學生！');
    return false;
  };

  const handleAnswerQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setShowQuestionModal(true);
  };

  const submitAnswer = () => {
    if (selectedQuestion && answer.trim()) {
      message.success(`已回答 ${selectedQuestion.student} 的問題`);
      setQuestions(prev => 
        prev.map(q => 
          q.id === selectedQuestion.id 
            ? { ...q, status: 'answered' as const }
            : q
        )
      );
      setShowQuestionModal(false);
      setAnswer('');
      setSelectedQuestion(null);
    }
  };

  const stats = {
    activeStudents: students.filter(s => s.status === 'active').length,
    totalStudents: students.length,
    pendingQuestions: questions.filter(q => q.status === 'pending').length,
    totalQuestions: questions.length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 控制面板標題 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <Title level={2} className="mb-1">
              🎓 Lecture Control Panel
            </Title>
            <Text className="text-gray-600">CS101 - Introduction to Algorithms - Lecture 1</Text>
          </div>
          
          {/* 講課控制按鈕 */}
          <Space size="large">
            {!isLive ? (
              <Space>
                <Button
                  type="primary"
                  size="large"
                  icon={<PlayCircleOutlined />}
                  onClick={handleStartLecture}
                  className="bg-green-600 hover:bg-green-700 px-8"
                >
                  {lectureMode === 'live' ? 'Start Live Lecture' : 'Play Uploaded Video'}
                </Button>
                {lectureMode === 'live' && !screenStream && (
                  <Button
                    size="large"
                    icon={<VideoCameraOutlined />}
                    onClick={async () => {
                      try {
                        const stream = await navigator.mediaDevices.getDisplayMedia({
                          video: true,
                          audio: true
                        });
                        setScreenStream(stream);
                        if (videoRef.current) {
                          videoRef.current.srcObject = stream;
                        }
                        message.success('Screen sharing connected!');
                      } catch (error) {
                        message.error('Failed to connect screen sharing');
                      }
                    }}
                  >
                    Reconnect Screen
                  </Button>
                )}
              </Space>
            ) : (
              <Space>
                <Button
                  size="large"
                  icon={<PauseCircleOutlined />}
                  onClick={handlePauseLecture}
                  className="px-6"
                >
                  Pause Lecture
                </Button>
                <Button
                  danger
                  size="large"
                  icon={<StopOutlined />}
                  onClick={handleEndLecture}
                  className="px-6"
                >
                  End Lecture
                </Button>
              </Space>
            )}
          </Space>
        </div>

        {/* 狀態指示 */}
        <div className="mb-6">
          <Space size="large">
            <Badge 
              status={isLive ? "processing" : "default"} 
              text={
                <span className={`font-medium text-lg ${isLive ? 'text-red-600' : 'text-gray-600'}`}>
                  {isLive ? '🔴 Live' : '⏸️ Paused'}
                </span>
              }
            />
            <Badge 
              status={screenStream ? "success" : "default"} 
              text={
                <span className={`font-medium ${screenStream ? 'text-green-600' : 'text-gray-600'}`}>
                  {screenStream ? '📺 Screen Connected' : '📺 Screen Disconnected'}
                </span>
              }
            />
            <Badge 
              status={isRecording ? "processing" : "default"} 
              text={
                <span className={`font-medium ${isRecording ? 'text-red-600' : 'text-gray-600'}`}>
                  {isRecording ? '🔴 Recording' : '⏹️ Not Recording'}
                </span>
              }
            />
          </Space>
        </div>

        <Tabs defaultActiveKey="control" className="mb-4" destroyInactiveTabPane={false}
          items={[
            { key: 'control', label: 'Screen & Controls', children: (
        <Row gutter={[24, 24]}>
          {/* 左側：影片控制 */}
          <Col xs={24} lg={16}>
            <Card 
              title={`${lectureMode === 'live' ? 'Live Screen Sharing' : 'Video Playback'}`}
              className="mb-6"
            >
              <div className="space-y-4">
                <div className="bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    controls={lectureMode === 'video'}
                    autoPlay={lectureMode === 'live'}
                    muted={false}
                    className="w-full h-64 object-contain"
                    src={lectureMode === 'video' ? (currentVideo ?? undefined) : undefined}
                  />
                  <div className="p-4 bg-gray-800 text-white flex justify-between items-center">
                    <div>
                      <Text className="text-white block">
                        {lectureMode === 'live' 
                          ? (screenStream ? '✅ Screen sharing connected' : '❌ Please reconnect screen sharing')
                          : (currentVideo ? '✅ Video loaded' : '❌ No video selected')
                        }
                      </Text>
                      <Text className="text-gray-300 text-sm">
                        Mode: {lectureMode === 'live' ? 'Live Screen Recording' : 'Video Playback'}
                      </Text>
                    </div>
                    
                    {lectureMode === 'live' && (
                      <div className="text-right">
                        <Text className="text-gray-300 text-sm block">
                          {isRecording ? '🔴 Recording' : '⏹️ Not Recording'}
                        </Text>
                        <Text className="text-gray-400 text-xs">
                          Recording will be saved automatically
                        </Text>
                      </div>
                    )}
                  </div>
                </div>

                {lectureMode === 'live' && !screenStream && (
                  <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
                    <Text className="text-yellow-800">
                      ⚠️ Screen sharing is disconnected. Please click "Reconnect Screen" to resume.
                    </Text>
                  </div>
                )}
              </div>
            </Card>

            {/* 實時統計 */}
            <Card title="Real-time Statistics">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="Online Students" value={stats.activeStudents} suffix={`/ ${stats.totalStudents}`} />
                </Col>
                <Col span={6}>
                  <Statistic title="Pending Questions" value={stats.pendingQuestions} />
                </Col>
                <Col span={6}>
                  <Statistic title="Total Questions" value={stats.totalQuestions} />
                </Col>
                <Col span={6}>
                  <Statistic title="Engagement" value={85} suffix="%" />
                </Col>
              </Row>
            </Card>
          </Col>

          {/* 右側：學生管理 */}
          <Col xs={24} lg={8}>
            {/* 學生列表 */}
            <Card title={`Student List (${stats.totalStudents})`} className="mb-6">
              <List
                size="small"
                dataSource={students}
                renderItem={(student) => (
                  <List.Item className="flex justify-between">
                    <div className="flex items-center">
                      <Badge 
                        status={student.status === 'active' ? 'success' : 'default'} 
                        className="mr-2"
                      />
                      <Text>{student.name}</Text>
                    </div>
                    <Text className="text-gray-500 text-xs">
                      {student.joinTime} | {student.questions} Qs
                    </Text>
                  </List.Item>
                )}
              />
            </Card>

            {/* 學生提問 */}
            <Card 
              title={`Student Questions (${stats.pendingQuestions})`}
              extra={
                <Badge count={stats.pendingQuestions} showZero={false}>
                  <QuestionCircleOutlined style={{ fontSize: 16 }} />
                </Badge>
              }
            >
              <List
                size="small"
                dataSource={questions.filter(q => q.status === 'pending')}
                renderItem={(question) => (
                  <List.Item
                    actions={[
                      <Button 
                        type="primary" 
                        size="small"
                        onClick={() => handleAnswerQuestion(question)}
                      >
                        Answer
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={<Text strong>{question.student}</Text>}
                      description={
                        <div>
                          <Text className="text-sm">{question.content}</Text>
                          <br />
                          <Text className="text-xs text-gray-500">{question.timestamp}</Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
            )},
            { key: 'attendance', label: 'Attendance', children: (
              <Card title="Attendance Management" className="mb-6">
                <Space className="mb-4">
                  <Button icon={<TeamOutlined />} onClick={triggerAttendanceCheck}>Request Attendance</Button>
                  {attendanceRequestedAt && <span className="text-gray-500 text-sm">Sent at {new Date(attendanceRequestedAt).toLocaleTimeString()}</span>}
                </Space>
                <List
                  dataSource={attendance}
                  renderItem={(item) => (
                    <List.Item>
                      <Space>
                        <CheckCircleOutlined className="text-green-600" />
                        <Text>{item.name}</Text>
                        <Text className="text-gray-500 text-xs">Joined at {item.joinedAt ? new Date(item.joinedAt).toLocaleTimeString() : '-'}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            )},
            { key: 'exercise', label: 'Exercise Assignment', children: (
              <Card title="Assign Exercise">
                <Form layout="vertical" form={exerciseForm}>
                  <Form.Item name="title" label="Question" rules={[{ required: true, message: 'Please enter a question' }]}>
                    <Input placeholder="e.g., What is the time complexity of quicksort?" />
                  </Form.Item>
                  <Form.Item name="description" label="Description">
                    <Input.TextArea rows={3} placeholder="Provide additional details or hints" />
                  </Form.Item>
                  <Form.Item name="deadline" label="Deadline">
                    <DatePicker showTime />
                  </Form.Item>
                  <Button type="primary" icon={<SendOutlined />} onClick={assignExercise}>Send Exercise</Button>
                </Form>
                <Divider />
                <List
                  header={<Text strong>Student Submissions</Text>}
                  dataSource={exAssigned}
                  renderItem={(s) => (
                    <List.Item>
                      <div className="w-full">
                        <Text className="block">{s.userId}</Text>
                        <Text className="text-gray-500 text-xs">Submitted at {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '-'}</Text>
                        {s.answer && <div className="mt-1 text-sm">Answer: {s.answer}</div>}
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            )}
          ]}
        />

        {/* 回答問題模態框 */}
        <Modal
          title="Answer Student Question"
          open={showQuestionModal}
          onOk={submitAnswer}
          onCancel={() => {
            setShowQuestionModal(false);
            setAnswer('');
            setSelectedQuestion(null);
          }}
          okText="Send Answer"
          cancelText="Cancel"
        >
          {selectedQuestion && (
            <div className="space-y-4">
              <div>
                <Text strong>Student's Question:</Text>
                <div className="mt-2 p-3 bg-gray-100 rounded">
                  <Text>{selectedQuestion.content}</Text>
                </div>
                <Text className="text-sm text-gray-500">
                  From: {selectedQuestion.student} | {selectedQuestion.timestamp}
                </Text>
              </div>
              
              <div>
                <Text strong>Your Answer:</Text>
                <TextArea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Enter your answer here..."
                  rows={4}
                  className="mt-2"
                />
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default LectureControl;
