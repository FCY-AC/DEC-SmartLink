import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Row, Col, Statistic, List, Badge, Modal, Upload, message, Space, Divider, Tabs } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  StopOutlined,
  UploadOutlined,
  UserOutlined,
  QuestionCircleOutlined,
  BarChartOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  BookOutlined,
  SettingOutlined
} from '@ant-design/icons';
import CourseManagement from './CourseManagement';
import { useNavigate, useLocation } from 'react-router-dom';

const { Title, Text } = Typography;

interface Lecture {
  id: string;
  title: string;
  course_title: string;
  course_code: string;
  scheduled_at: string;
  status: 'scheduled' | 'ongoing' | 'completed';
  participant_count: number;
  room_location: string;
}

export const ProfessorDashboard: React.FC = () => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchLectures();
  }, [location]);

  const fetchLectures = async () => {
    try {
      const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api/v1';
      const response = await fetch(`${apiBase}/lectures`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLectures(data.lectures || []);
      }
    } catch (error) {
      console.error('Failed to fetch lectures:', error);
      // 使用模擬資料
      setLectures([]);
    } finally {
      setLoading(false);
    }
  };

  // 方案 A：開始即時講課（螢幕錄製）
  const startLiveLecture = async (lecture: Lecture) => {
    try {
      // 檢查瀏覽器是否支援螢幕錄製
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        message.error('您的瀏覽器不支援螢幕錄製功能，請使用 Chrome 或 Firefox');
        return;
      }

      message.loading('正在啟動螢幕錄製...', 0);

      // 請求螢幕錄製權限
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      message.destroy();
      message.success('螢幕錄製已開始！學生現在可以看到您的畫面');
      
      // 跳轉到講課控制介面，並傳遞串流
      navigate(`/professor/lecture/${lecture.id}?mode=live`, { 
        state: { stream, lectureMode: 'live' }
      });

    } catch (error) {
      message.destroy();
      const err = error as Error & { name?: string };
      if (err && err.name === 'NotAllowedError') {
        message.error('需要允許螢幕錄製權限才能開始講課');
      } else {
        console.error('開始講課錯誤:', error);
        message.error('開始講課失敗，請重試');
      }
    }
  };

  // 方案 B：上傳影片（備用方案）
  const handleUploadVideoMode = (lecture: Lecture) => {
    setSelectedLecture(lecture);
    setUploadModalVisible(true);
  };

  const handleUploadVideo = (lecture: Lecture) => {
    setSelectedLecture(lecture);
    setUploadModalVisible(true);
  };

  // 新增其他處理函數
  const handleEndLecture = async (lecture: Lecture) => {
    Modal.confirm({
      title: '確認結束講課',
      content: '結束後學生將無法繼續觀看，錄影將自動保存。確定要結束嗎？',
      onOk: async () => {
        try {
          const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api/v1';
          const response = await fetch(`${apiBase}/lectures/${lecture.id}/end`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({})
          });
          
          if (response.ok) {
            message.success('講課已結束，錄影已保存');
            fetchLectures(); // 刷新列表
          } else {
            message.error('結束講課失敗');
          }
        } catch (error) {
          console.error('結束講課錯誤:', error);
          message.error('結束講課時發生錯誤');
        }
      }
    });
  };

  const handleViewStatistics = (lecture: Lecture) => {
    message.info(`查看 "${lecture.title}" 的統計數據`, 2);
    // 可以跳轉到統計頁面或顯示統計模態框
  };

  const handleViewRecording = async (lecture: Lecture) => {
    try {
      // 獲取講堂詳情以取得錄影 URL
      const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api/v1';
      const response = await fetch(`${apiBase}/lectures/${lecture.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const recordingUrl = data.lecture?.recording_url;
        
        if (recordingUrl) {
          // 在新分頁開啟錄影
          const fullUrl = recordingUrl.startsWith('http') 
            ? recordingUrl 
            : `http://localhost:3001${recordingUrl}`;
          window.open(fullUrl, '_blank');
          message.success('正在開啟課程錄影');
        } else {
          message.warning('此講課沒有可用的錄影');
        }
      } else {
        message.error('無法獲取講課資訊');
      }
    } catch (error) {
      console.error('查看錄影錯誤:', error);
      message.error('播放錄影時發生錯誤');
    }
  };

  const handleVideoUpload = async (file: File) => {
    message.loading('正在上傳影片...', 0);
    
    // 模擬影片上傳與處理
    setTimeout(() => {
      message.destroy();
      message.success(`影片 "${file.name}" 上傳成功！學生現在可以觀看`);
      setUploadModalVisible(false);
      
      // 跳轉到影片播放控制介面
      if (selectedLecture) {
        navigate(`/professor/lecture/${selectedLecture.id}?mode=video&file=${encodeURIComponent(file.name)}`, {
          state: { lectureMode: 'video', videoFile: file.name }
        });
      }
    }, 3000);

    return false; // 阻止默認上傳行為
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ongoing':
        return <Badge status="processing" text="🔴 Ongoing" />;
      case 'scheduled':
        return <Badge status="warning" text="🟡 Scheduled" />;
      case 'completed':
        return <Badge status="success" text="✅ Completed" />;
      default:
        return <Badge status="default" text="Unknown" />;
    }
  };

  const getActionButtons = (lecture: Lecture) => {
    switch (lecture.status) {
      case 'scheduled':
        return (
          <Space direction="vertical" size="small">
            <Space>
              <Button
                type="primary"
                icon={<VideoCameraOutlined />}
                onClick={() => startLiveLecture(lecture)}
                className="bg-red-600 hover:bg-red-700"
                size="large"
              >
                🔴 Start Live Lecture
              </Button>
            </Space>
            <Space>
              <Button
                icon={<UploadOutlined />}
                onClick={() => handleUploadVideoMode(lecture)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                📁 Upload Video (Backup)
              </Button>
            </Space>
          </Space>
        );
      case 'ongoing':
        return (
          <Space>
            <Button
              type="primary"
              icon={<VideoCameraOutlined />}
              onClick={() => navigate(`/professor/lecture/${lecture.id}`)}
              className="bg-green-600 hover:bg-green-700"
            >
              Enter Lecture Control
            </Button>
            <Button
              danger
              icon={<StopOutlined />}
              onClick={() => handleEndLecture(lecture)}
            >
              End Lecture
            </Button>
          </Space>
        );
      case 'completed':
        return (
          <Space>
            <Button
              icon={<BarChartOutlined />}
              onClick={() => handleViewStatistics(lecture)}
            >
              View Statistics
            </Button>
            <Button
              icon={<PlayCircleOutlined />}
              onClick={() => handleViewRecording(lecture)}
            >
              View Recording
            </Button>
          </Space>
        );
      default:
        return null;
    }
  };

  const stats = {
    totalLectures: lectures.length,
    ongoingLectures: lectures.filter(l => l.status === 'ongoing').length,
    scheduledLectures: lectures.filter(l => l.status === 'scheduled').length,
    totalStudents: lectures.reduce((sum, l) => sum + l.participant_count, 0)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <Title level={1} className="mb-2">
            🎓 Professor Dashboard
          </Title>
          <Text className="text-gray-600">
            Manage your lectures, monitor student engagement, and control classroom interactions.
          </Text>
        </div>

        {/* 統計卡片 */}
        <Row gutter={[16, 16]} className="mb-8">
          <Col xs={24} sm={12} md={6}>
            <Card className="text-center">
              <Statistic
                title="Total Lectures"
                value={stats.totalLectures}
                prefix="📚"
                valueStyle={{ color: '#1E40AF' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="text-center">
              <Statistic
                title="Ongoing"
                value={stats.ongoingLectures}
                prefix="🔴"
                valueStyle={{ color: '#059669' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="text-center">
              <Statistic
                title="Scheduled"
                value={stats.scheduledLectures}
                prefix="🟡"
                valueStyle={{ color: '#D97706' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="text-center">
              <Statistic
                title="Total Students"
                value={stats.totalStudents}
                prefix="👥"
                valueStyle={{ color: '#7C3AED' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 主要內容區域 */}
        <Tabs
          defaultActiveKey="lectures"
          items={[
            {
              key: 'lectures',
              label: 'My Lectures',
              children: (
                <Card className="shadow-md">
                  <List
                    loading={loading}
                    dataSource={lectures}
                    renderItem={(lecture) => (
              <List.Item
                className="hover:bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4"
                actions={[getActionButtons(lecture)]}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  // 如果點擊的是右側按鈕區，就不要導向
                  if (target.closest('.ant-list-item-action')) return;
                  navigate(`/professor/lecture/${lecture.id}`);
                }}
                style={{ cursor: 'pointer' }}
              >
                <List.Item.Meta
                  title={
                    <div className="flex justify-between items-center">
                      <div>
                        <Text strong className="text-lg mr-3">{lecture.title}</Text>
                        <Text className="text-gray-500">
                          {lecture.course_code} • {lecture.course_title}
                        </Text>
                      </div>
                      {getStatusBadge(lecture.status)}
                    </div>
                  }
                  description={
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <AudioOutlined className="mr-2 text-blue-500" />
                        {new Date(lecture.scheduled_at).toLocaleString('zh-TW')}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <VideoCameraOutlined className="mr-2 text-green-500" />
                        {lecture.room_location}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <UserOutlined className="mr-2 text-purple-500" />
                        {lecture.participant_count} 位學生
                      </div>
                    </div>
                  }
                />
              </List.Item>
                    )}
                  />
                </Card>
              ),
            },
            {
              key: 'courses',
              label: 'Course Management',
              children: <CourseManagement />,
            },
          ]}
        />

        {/* 影片上傳模態框（方案 B：備用方案） */}
        <Modal
          title="📁 Upload Lecture Video (Backup)"
          open={uploadModalVisible}
          onCancel={() => setUploadModalVisible(false)}
          footer={null}
          width={600}
        >
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
              <Text className="block text-blue-800 font-medium">
                💡 Backup Plan Instructions
              </Text>
              <Text className="block text-blue-700 text-sm mt-1">
                If you are unable to conduct a live lecture, you can upload a pre-recorded video. Students will watch the content you upload.
              </Text>
            </div>
            
            <Upload.Dragger
              name="video"
              accept="video/*"
              beforeUpload={handleVideoUpload}
              showUploadList={false}
            >
              <p className="ant-upload-drag-icon">
                <VideoCameraOutlined style={{ fontSize: 48, color: '#1890ff' }} />
              </p>
              <p className="ant-upload-text">Click or drag video file to this area to upload</p>
              <p className="ant-upload-hint">
                Supports MP4, AVI, MOV formats. Recommended file size up to 1GB.
              </p>
            </Upload.Dragger>

            <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
              <Text className="text-yellow-800 text-sm">
                ⚠️ Note: The uploaded video will replace the live lecture.
              </Text>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ProfessorDashboard;
