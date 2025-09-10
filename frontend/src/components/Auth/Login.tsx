import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox, Card, message, Divider, Alert, Spin } from 'antd';
import { LockOutlined, WechatOutlined, MailOutlined, IdcardOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

interface LoginFormData {
  studentId: string;
  password: string;
  rememberMe: boolean;
}

interface ApiError extends Error {
  error: string;
  status?: number;
}

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  // const [showPassword, setShowPassword] = useState(false); // Commented out for future use
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();

  // 檢查是否已登入
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      try {
        const userData = JSON.parse(user);
        if (userData.role) {
          // 已登入，直接跳轉到講堂頁面
          navigate('/lectures', { replace: true });
        }
      } catch (error) {
        // 清除無效的登入資料
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, [navigate]);

  // 從URL參數獲取錯誤訊息
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    if (error) {
      setLoginError(decodeURIComponent(error));
    }
  }, [location]);

  const validateStudentId = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('Please enter your Student ID'));
    }

    // 放寬學號格式驗證 (支援測試帳號如 student1)
    if (value.length < 3) {
      return Promise.reject(new Error('Student ID must be at least 3 characters'));
    }

    return Promise.resolve();
  };

  const validatePassword = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('Please enter your password'));
    }

    if (value.length < 6) {
      return Promise.reject(new Error('Password must be at least 6 characters'));
    }

    // 放寬密碼強度要求（開發模式）
    return Promise.resolve();
  };

  const handleSubmit = async (values: LoginFormData) => {
    setLoading(true);
    setLoginError(null);

    try {
      console.log('登入嘗試:', { studentId: values.studentId, rememberMe: values.rememberMe });

      // 實際API調用
      const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:3001/api/v1';
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: values.studentId,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const apiError: ApiError = new Error(data.message || '登入失敗，請檢查學號和密碼') as ApiError;
        apiError.error = data.error || 'Login Failed';
        apiError.status = response.status;
        throw apiError;
      }

      // 儲存用戶資訊和token
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // 如果選擇記住我，延長token過期時間
      if (values.rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }

      message.success(`Welcome back, ${data.user.name}!`);

      // 根據用戶角色跳轉
      if (data.user.role === 'professor') {
        navigate('/professor', { replace: true });
      } else {
        navigate('/lectures', { replace: true });
      }

    } catch (error) {
      console.error('登入錯誤:', error);

      const apiError = error as ApiError;
      const errorMessage = apiError.message || '登入失敗，請稍後再試';

      setLoginError(errorMessage);
      message.error(errorMessage);

      // 根據錯誤類型提供不同處理
      if (apiError.status === 429) {
        message.warning('登入次數過多，請稍後再試');
      } else if (apiError.status === 401) {
        form.setFields([
          { name: 'studentId', errors: ['學號或密碼錯誤'] },
          { name: 'password', errors: ['學號或密碼錯誤'] }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    message.warning(`${provider}登入功能開發中，請使用學號密碼登入`);
    
    // 提示用戶使用測試帳號
    setTimeout(() => {
      message.info('測試帳號：student1@my.cityu.edu.hk / student123', 5);
    }, 1000);
  };

  const handleForgotPassword = () => {
    message.info('密碼重置功能開發中，請聯絡系統管理員');
  };

  const clearError = () => {
    setLoginError(null);
  };

  // 載入狀態
  if (loading && !loginError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">正在處理登入...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo區域 */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-blue rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white">DEC</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to DEC SmartLink
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            The Smart Classroom Interaction System
          </p>
        </div>

        {/* 錯誤提示 */}
        {loginError && (
          <Alert
            message="Login Failed"
            description={loginError}
            type="error"
            showIcon
            closable
            onClose={clearError}
            className="mb-4"
          />
        )}

        {/* 登入表單 */}
        <Card className="shadow-xl">
          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            layout="vertical"
            initialValues={{
              studentId: '',
              password: '',
              rememberMe: false
            }}
            disabled={loading}
          >
            <Form.Item
              name="studentId"
              label="Student ID / Email"
              rules={[{ validator: validateStudentId }]}
              validateTrigger="onBlur"
            >
              <Input
                prefix={<IdcardOutlined />}
                placeholder="Enter your Student ID or Email"
                size="large"
                maxLength={50}
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ validator: validatePassword }]}
              validateTrigger="onBlur"
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your password"
                size="large"
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item>
              <div className="flex justify-between items-center">
                <Form.Item name="rememberMe" valuePropName="checked" noStyle>
                  <Checkbox disabled={loading}>Remember me (7 days)</Checkbox>
                </Form.Item>
                <Button
                  type="link"
                  className="p-0"
                  onClick={handleForgotPassword}
                  disabled={loading}
                >
                  Forgot password?
                </Button>
              </div>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                className="bg-primary-blue hover:bg-primary-blue-light h-12 text-base font-medium"
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </Form.Item>
          </Form>

          {/* 分隔線 */}
          <Divider className="my-6">Or sign in with</Divider>

          {/* 社交登入按鈕 */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              icon={<WechatOutlined />}
              size="large"
              onClick={() => handleSocialLogin('WeChat')}
              loading={loading}
              className="flex items-center justify-center h-12 hover:bg-green-50 hover:border-green-300"
              disabled={loading}
            >
              WeChat Login
            </Button>
            <Button
              icon={<MailOutlined />}
              size="large"
              onClick={() => handleSocialLogin('Email')}
              loading={loading}
              className="flex items-center justify-center h-12 hover:bg-blue-50 hover:border-blue-300"
              disabled={loading}
            >
              Email Login
            </Button>
          </div>

          {/* 註冊連結 */}
          <div className="mt-6 text-center">
            <span className="text-gray-600">Don't have an account?</span>
            <Button
              type="link"
              onClick={() => navigate('/register')}
              className="p-0 ml-1 font-medium"
              disabled={loading}
            >
              Sign up now
            </Button>
          </div>
        </Card>

        {/* 功能特色展示 */}
        <div className="text-center">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex items-center justify-center p-3 bg-white rounded-lg shadow-sm">
              <span className="text-secondary-green mr-2 text-lg">🎯</span>
              <span>Real-time Subtitles</span>
            </div>
            <div className="flex items-center justify-center p-3 bg-white rounded-lg shadow-sm">
              <span className="text-secondary-green mr-2 text-lg">🧠</span>
              <span>AI Term Explanations</span>
            </div>
            <div className="flex items-center justify-center p-3 bg-white rounded-lg shadow-sm">
              <span className="text-secondary-green mr-2 text-lg">💬</span>
              <span>Interactive Q&A</span>
            </div>
            <div className="flex items-center justify-center p-3 bg-white rounded-lg shadow-sm">
              <span className="text-secondary-green mr-2 text-lg">📍</span>
              <span>Auto Attendance</span>
            </div>
          </div>
        </div>

        {/* 系統狀態提示 */}
        <div className="text-center text-xs text-gray-500">
          <p>© 2025 DEC SmartLink Team</p>
          <p>Version: v1.0.0-beta | Environment: Development</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
