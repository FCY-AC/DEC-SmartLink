import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Form, Input, Modal, DatePicker, InputNumber, Select, message, Table, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiRequest, API_BASE } from '../../utils/api';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Course {
  id: string;
  title: string;
  code: string;
  description: string;
  department: string;
  credits: number;
}

interface Lecture {
  id: string;
  title: string;
  description: string;
  scheduled_at: string;
  duration_minutes: number;
  room_location: string;
  status: string;
}

export const CourseManagement: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [lectureModalVisible, setLectureModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [courseForm] = Form.useForm();
  const [lectureForm] = Form.useForm();

  useEffect(() => {
    fetchCourses();
    fetchLectures();
  }, []);

  const fetchCourses = async () => {
    try {
      const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api/v1';
      const response = await fetch(`${apiBase}/courses`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error('獲取課程失敗:', error);
    }
  };

  const fetchLectures = async () => {
    try {
      const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api/v1';
      const response = await fetch(`${apiBase}/lectures`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setLectures(data.lectures || []);
      }
    } catch (error) {
      console.error('獲取講堂失敗:', error);
    }
  };

  const handleCreateCourse = async (values: any) => {
    try {
      const formattedValues = {
        ...values,
        professor_id: 'ce9b723a-592b-4ece-8caf-b0d19a828591', // TODO: Replace with dynamic professor ID
      };
      console.log('正在新增課程:', formattedValues);
      
      const response = await apiRequest('/courses', {
        method: 'POST',
        body: JSON.stringify(formattedValues),
      });

      console.log('新增課程回應:', response);

      if (response.course) {
        message.success('課程新增成功！');
        courseForm.resetFields();
        // TODO: Refresh course list
      } else {
        message.error(response.message || '新增課程失敗');
      }
    } catch (error) {
      console.error('新增課程錯誤:', error);
      message.error('新增課程時發生錯誤');
    }
  };

  const handleCreateLecture = async (values: any) => {
    try {
      const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api/v1';
      const lectureData = {
        ...values,
        scheduledAt: values.scheduled_at.toISOString(),
      };

      const response = await fetch(`${apiBase}/lectures`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lectureData),
      });

      if (response.ok) {
        message.success('講堂建立成功！');
        setLectureModalVisible(false);
        lectureForm.resetFields();
        fetchLectures();
      } else {
        message.error('建立講堂失敗');
      }
    } catch (error) {
      console.error('建立講堂錯誤:', error);
      message.error('建立講堂失敗');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api/v1';
      const response = await fetch(`${apiBase}/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        message.success('課程刪除成功！');
        fetchCourses();
      } else {
        message.error('刪除課程失敗');
      }
    } catch (error) {
      console.error('刪除課程錯誤:', error);
      message.error('刪除課程失敗');
    }
  };

  const courseColumns = [
    {
      title: '課程代碼',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '課程名稱',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '學分',
      dataIndex: 'credits',
      key: 'credits',
    },
    {
      title: '系所',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, course: Course) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setEditingCourse(course);
              courseForm.setFieldsValue(course);
              setCourseModalVisible(true);
            }}
          >
            編輯
          </Button>
          <Popconfirm
            title="確定要刪除這個課程嗎？"
            onConfirm={() => handleDeleteCourse(course.id)}
          >
            <Button danger icon={<DeleteOutlined />}>
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const lectureColumns = [
    {
      title: '講堂標題',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '排程時間',
      dataIndex: 'scheduled_at',
      key: 'scheduled_at',
      render: (date: string) => dayjs(date).format('YYYY/MM/DD HH:mm'),
    },
    {
      title: '時長',
      dataIndex: 'duration_minutes',
      key: 'duration_minutes',
      render: (minutes: number) => `${minutes} 分鐘`,
    },
    {
      title: '地點',
      dataIndex: 'room_location',
      key: 'room_location',
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap = {
          scheduled: '🟡 準備中',
          ongoing: '🔴 進行中',
          completed: '⚪ 已結束',
          cancelled: '❌ 已取消'
        };
        return statusMap[status as keyof typeof statusMap] || status;
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, lecture: Lecture) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setEditingLecture(lecture);
              lectureForm.setFieldsValue({
                ...lecture,
                scheduled_at: dayjs(lecture.scheduled_at),
              });
              setLectureModalVisible(true);
            }}
          >
            編輯
          </Button>
          <Button
            icon={<CalendarOutlined />}
            onClick={() => window.open(`/professor/lecture/${lecture.id}`, '_blank')}
          >
            管理
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 課程管理 */}
      <Card
        title="課程管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingCourse(null);
              courseForm.resetFields();
              setCourseModalVisible(true);
            }}
          >
            新增課程
          </Button>
        }
      >
        <Table
          dataSource={courses}
          columns={courseColumns}
          rowKey="id"
          pagination={{ pageSize: 5 }}
        />
      </Card>

      {/* 講堂管理 */}
      <Card
        title="講堂管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingLecture(null);
              lectureForm.resetFields();
              setLectureModalVisible(true);
            }}
          >
            新增講堂
          </Button>
        }
      >
        <Table
          dataSource={lectures}
          columns={lectureColumns}
          rowKey="id"
          pagination={{ pageSize: 5 }}
        />
      </Card>

      {/* 課程編輯模態框 */}
      <Modal
        title={editingCourse ? '編輯課程' : '新增課程'}
        open={courseModalVisible}
        onCancel={() => setCourseModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={courseForm}
          layout="vertical"
          onFinish={handleCreateCourse}
        >
          <Form.Item
            name="code"
            label="課程代碼"
            rules={[{ required: true, message: '請輸入課程代碼' }]}
          >
            <Input placeholder="例如：CS101" />
          </Form.Item>
          
          <Form.Item
            name="title"
            label="課程名稱"
            rules={[{ required: true, message: '請輸入課程名稱' }]}
          >
            <Input placeholder="例如：演算法導論" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="課程描述"
          >
            <TextArea rows={3} placeholder="課程內容描述..." />
          </Form.Item>
          
          <Form.Item
            name="department"
            label="系所"
            rules={[{ required: true, message: '請選擇系所' }]}
          >
            <Select placeholder="選擇系所">
              <Option value="Computer Science">資訊工程學系</Option>
              <Option value="Mathematics">數學系</Option>
              <Option value="Physics">物理系</Option>
              <Option value="Engineering">工程學院</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="credits"
            label="學分數"
            rules={[{ required: true, message: '請輸入學分數' }]}
          >
            <InputNumber min={1} max={6} placeholder="3" />
          </Form.Item>
          
          <Form.Item className="text-right">
            <Space>
              <Button onClick={() => setCourseModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingCourse ? '更新' : '建立'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 講堂編輯模態框 */}
      <Modal
        title={editingLecture ? '編輯講堂' : '新增講堂'}
        open={lectureModalVisible}
        onCancel={() => setLectureModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form
          form={lectureForm}
          layout="vertical"
          onFinish={handleCreateLecture}
        >
          <Form.Item
            name="courseId"
            label="選擇課程"
            rules={[{ required: true, message: '請選擇課程' }]}
          >
            <Select placeholder="選擇課程">
              {courses.map(course => (
                <Option key={course.id} value={course.id}>
                  {course.code} - {course.title}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="title"
            label="講堂標題"
            rules={[{ required: true, message: '請輸入講堂標題' }]}
          >
            <Input placeholder="例如：第一堂：演算法基礎" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="講堂描述"
          >
            <TextArea rows={3} placeholder="講堂內容描述..." />
          </Form.Item>
          
          <Form.Item
            name="scheduled_at"
            label="排程時間"
            rules={[{ required: true, message: '請選擇排程時間' }]}
          >
            <DatePicker 
              showTime 
              format="YYYY/MM/DD HH:mm"
              placeholder="選擇日期時間"
              className="w-full"
            />
          </Form.Item>
          
          <Form.Item
            name="duration_minutes"
            label="時長（分鐘）"
            rules={[{ required: true, message: '請輸入講堂時長' }]}
          >
            <InputNumber min={30} max={240} placeholder="90" className="w-full" />
          </Form.Item>
          
          <Form.Item
            name="room_location"
            label="教室位置"
            rules={[{ required: true, message: '請輸入教室位置' }]}
          >
            <Input placeholder="例如：Lecture Hall A" />
          </Form.Item>
          
          <Form.Item
            name="max_participants"
            label="最大參與人數"
          >
            <InputNumber min={10} max={500} placeholder="200" className="w-full" />
          </Form.Item>
          
          <Form.Item className="text-right">
            <Space>
              <Button onClick={() => setLectureModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                {editingLecture ? '更新' : '建立'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CourseManagement;
