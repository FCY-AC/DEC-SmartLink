import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge, List, Typography, Empty, Spin, Skeleton, Alert, Row, Col, Space, Divider, Statistic } from 'antd';
import { ClockCircleOutlined, EnvironmentOutlined, UserOutlined, PlayCircleOutlined, HistoryOutlined, ReloadOutlined, WifiOutlined, FilterOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

interface Lecture {
  id: string;
  title: string;
  professor: string;
  courseCode: string;
  time: string;
  location: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  participants: number;
  description?: string;
}

export const LectureHall: React.FC = () => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [todayLectures, setTodayLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'upcoming' | 'completed'>('all');
  const navigate = useNavigate();

  // 網路狀態監控
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchLectures = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // 實際API調用
      const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api/v1';
      const response = await fetch(`${apiBase}/lectures`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // 轉換API數據格式
      const formattedLectures: Lecture[] = data.lectures.map((lecture: any) => ({
        id: lecture.id,
        title: lecture.title,
        professor: lecture.professor_name,
        courseCode: lecture.course_code,
        time: new Date(lecture.scheduled_at).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }),
        location: lecture.room_location || 'Online Lecture',
        status: lecture.status === 'in_progress' ? 'ongoing' :
                lecture.status === 'scheduled' ? 'upcoming' : 'completed',
        participants: lecture.participant_count || 0,
        description: lecture.description
      }));

      setLectures(formattedLectures);
      setTodayLectures(formattedLectures.filter(l => l.status !== 'completed'));

    } catch (error) {
      console.error('獲取課程失敗:', error);
      setError('無法載入課程列表，請檢查網路連線');

      // 不使用模擬資料，從 API 取得真實資料
      if (!isRefresh) {
        const mockLectures: Lecture[] = [];

        setLectures(mockLectures);
        setTodayLectures(mockLectures.filter(l => l.status !== 'completed'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLectures();
  }, [fetchLectures]);

  const handleRefresh = () => {
    if (isOnline) {
      fetchLectures(true);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ongoing':
        return (
          <Badge
            status="processing"
            text={<span className="text-green-600 font-medium">🔴 Live</span>}
          />
        );
      case 'upcoming':
        return (
          <Badge
            status="warning"
            text={<span className="text-orange-600 font-medium">🟡 Upcoming</span>}
          />
        );
      case 'completed':
        return (
          <Badge
            status="default"
            text={<span className="text-gray-600 font-medium">⚪ Completed</span>}
          />
        );
      default:
        return <Badge status="default" text="Unknown Status" />;
    }
  };

  const getActionButton = (lecture: Lecture) => {
    switch (lecture.status) {
      case 'ongoing':
        return (
          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={() => handleJoinLecture(lecture.id)}
            className="bg-primary-blue hover:bg-primary-blue-light shadow-md hover:shadow-lg transition-all duration-300"
            disabled={!isOnline}
          >
            Join Lecture
          </Button>
        );
      case 'upcoming':
        return (
          <Button
            type="default"
            size="large"
            onClick={() => handleJoinLecture(lecture.id)}
            disabled
            className="opacity-60"
          >
            Prepare to Join
          </Button>
        );
      case 'completed':
        return (
          <Button
            type="default"
            size="large"
            icon={<HistoryOutlined />}
            onClick={() => handleViewRecording(lecture.id)}
            className="hover:bg-gray-50 transition-all duration-300"
          >
            View Recording
          </Button>
        );
      default:
        return null;
    }
  };

  const handleJoinLecture = async (lectureId: string) => {
    if (!isOnline) {
      console.warn('網路連線中斷，無法進入講堂');
      return;
    }

    try {
      // 加入講堂的API調用
      const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api/v1';
      const response = await fetch(`${apiBase}/lectures/${lectureId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
          }
        })
      });

      if (response.ok) {
        navigate(`/lecture/${lectureId}`);
      } else {
        console.error('加入講堂失敗');
      }
    } catch (error) {
      console.error('加入講堂錯誤:', error);
      // 即使API調用失敗，仍允許進入講堂（離線模式）
      navigate(`/lecture/${lectureId}`);
    }
  };

  const handleViewRecording = (lectureId: string) => {
    navigate(`/lecture/${lectureId}/recording`);
  };

  // 篩選講堂
  const getFilteredLectures = (lectures: Lecture[]) => {
    if (filter === 'all') return lectures;
    return lectures.filter(lecture => lecture.status === filter);
  };

  // 統計數據
  const stats = {
    total: lectures.length,
    ongoing: lectures.filter(l => l.status === 'ongoing').length,
    upcoming: lectures.filter(l => l.status === 'upcoming').length,
    completed: lectures.filter(l => l.status === 'completed').length,
    totalParticipants: lectures.reduce((sum, l) => sum + l.participants, 0)
  };

  // 載入狀態
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Skeleton.Avatar size="large" active className="mb-4" />
          <Skeleton active paragraph={{ rows: 2 }} className="mb-4" />
          <Spin size="large" tip="載入課程中..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 頁面標題和狀態 */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <Title level={1} className="mb-2 flex items-center">
                🎓 DEC SmartLink Lecture Hall
                {!isOnline && (
                  <WifiOutlined className="ml-3 text-red-500" title="網路連線中斷" />
                )}
                {isOnline && (
                  <WifiOutlined className="ml-3 text-green-500" title="網路連線正常" />
                )}
              </Title>
              <Text className="text-gray-600">
                Smart learning, making every class interactive and full of discovery
              </Text>
            </div>
            <Button
              icon={<ReloadOutlined spin={refreshing} />}
              onClick={handleRefresh}
              disabled={!isOnline || refreshing}
              className="mt-4 sm:mt-0"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {/* 錯誤提示 */}
          {error && (
            <Alert
              message="載入失敗"
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              className="mb-6"
            />
          )}

          {/* 統計卡片 */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={12} md={6}>
              <Card className="text-center">
                <Statistic
                  title="Total Lectures"
                  value={stats.total}
                  prefix="📚"
                  valueStyle={{ color: '#1E40AF' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="text-center">
                <Statistic
                  title="Ongoing"
                  value={stats.ongoing}
                  prefix="🔴"
                  valueStyle={{ color: '#059669' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="text-center">
                <Statistic
                  title="Upcoming"
                  value={stats.upcoming}
                  prefix="🟡"
                  valueStyle={{ color: '#D97706' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="text-center">
                <Statistic
                  title="Total Participants"
                  value={stats.totalParticipants}
                  prefix="👥"
                  valueStyle={{ color: '#7C3AED' }}
                />
              </Card>
            </Col>
          </Row>
        </div>

        {/* 今日課程 */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <Title level={2} className="flex items-center mb-4 sm:mb-0">
              <PlayCircleOutlined className="mr-2 text-primary-blue" />
              Today's Lectures ({todayLectures.length})
            </Title>

            {/* 篩選器 */}
            <Space className="flex-wrap">
              <Button
                type={filter === 'all' ? 'primary' : 'default'}
                onClick={() => setFilter('all')}
                icon={<FilterOutlined />}
              >
                All ({lectures.length})
              </Button>
              <Button
                type={filter === 'ongoing' ? 'primary' : 'default'}
                onClick={() => setFilter('ongoing')}
              >
                Ongoing ({stats.ongoing})
              </Button>
              <Button
                type={filter === 'upcoming' ? 'primary' : 'default'}
                onClick={() => setFilter('upcoming')}
              >
                Upcoming ({stats.upcoming})
              </Button>
            </Space>
          </div>

          {getFilteredLectures(todayLectures).length === 0 ? (
            <Empty
              description={
                filter === 'all'
                  ? "No lectures scheduled for today"
                  : `No ${filter === 'ongoing' ? 'ongoing' : 'upcoming'} lectures`
              }
              className="py-16"
            />
          ) : (
            <Row gutter={[24, 24]}>
              {getFilteredLectures(todayLectures).map((lecture) => (
                <Col xs={24} lg={12} key={lecture.id}>
                  <Card
                    hoverable
                    className="shadow-md hover:shadow-xl transition-all duration-300 border-l-4 border-l-primary-blue"
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0">
                          <Title level={4} className="mb-2 line-clamp-2" title={lecture.title}>
                            {lecture.title}
                          </Title>
                          <Text className="text-gray-600 block mb-2 text-sm">
                            {lecture.courseCode} • {lecture.professor}
                          </Text>
                          <div className="mb-3">
                            {getStatusBadge(lecture.status)}
                          </div>
                          {lecture.description && (
                            <Text className="text-sm text-gray-500 block mb-3 line-clamp-2">
                              {lecture.description}
                            </Text>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600 mb-6 flex-grow">
                        <div className="flex items-center">
                          <ClockCircleOutlined className="mr-2 text-primary-blue" />
                          <span className="font-medium">{lecture.time}</span>
                        </div>
                        <div className="flex items-center">
                          <EnvironmentOutlined className="mr-2 text-green-600" />
                          <span>{lecture.location}</span>
                        </div>
                        <div className="flex items-center">
                          <UserOutlined className="mr-2 text-purple-600" />
                          <span>{lecture.participants} participants</span>
                        </div>
                      </div>

                      <div className="flex justify-end mt-auto">
                        {getActionButton(lecture)}
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>

        <Divider />

        {/* 歷史記錄 */}
        <div>
          <Title level={2} className="mb-6 flex items-center">
            <HistoryOutlined className="mr-2 text-primary-blue" />
            History ({stats.completed})
          </Title>

          {stats.completed === 0 ? (
            <Empty
              description="No historical lecture records yet"
              className="py-16"
            />
          ) : (
            <List
              dataSource={lectures.filter(l => l.status === 'completed')}
              renderItem={(lecture) => (
                <List.Item
                  className="hover:bg-white p-6 rounded-lg border border-gray-200 mb-4 shadow-sm hover:shadow-md transition-all duration-300"
                  actions={[getActionButton(lecture)]}
                >
                  <List.Item.Meta
                    title={
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <Text strong className="text-lg mr-3">{lecture.title}</Text>
                          <Text className="text-gray-500">
                            {lecture.courseCode} • {lecture.professor}
                          </Text>
                        </div>
                        <div className="mt-2 sm:mt-0">
                          {getStatusBadge(lecture.status)}
                        </div>
                      </div>
                    }
                    description={
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <ClockCircleOutlined className="mr-2 text-primary-blue" />
                          {lecture.time}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <EnvironmentOutlined className="mr-2 text-green-600" />
                          {lecture.location}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <UserOutlined className="mr-2 text-purple-600" />
                          {lecture.participants} participants
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default LectureHall;
