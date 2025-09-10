import React from 'react';
import { Button, Avatar, Dropdown } from 'antd';
import { BellOutlined, SettingOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface User {
  name: string;
  avatar?: string;
  email: string;
}

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = "DEC SmartLink" }) => {
  const navigate = useNavigate();

  // 模擬用戶狀態（之後會從狀態管理獲取）
  const isLoggedIn = !!localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  const user: User | null = userData ? JSON.parse(userData) : null;

  const handleLogout = () => {
    // 清除用戶狀態
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '個人資料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '設定',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '登出',
      onClick: handleLogout,
    },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo 和標題 */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-primary-blue">
                {title}
              </h1>
            </div>
          </div>

          {/* 右側操作區 */}
          <div className="flex items-center space-x-4">
            {isLoggedIn && user ? (
              <>
                {/* 通知按鈕 */}
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  className="text-gray-600 hover:text-gray-900"
                  size="large"
                />

                {/* 用戶菜單 */}
                <Dropdown
                  menu={{ items: userMenuItems }}
                  placement="bottomRight"
                  arrow
                >
                  <div className="flex items-center space-x-2 cursor-pointer">
                    <Avatar
                      size="small"
                      src={user?.avatar}
                      icon={<UserOutlined />}
                    />
                    <span className="text-sm text-gray-700 hidden sm:block">
                      {user?.name}
                    </span>
                  </div>
                </Dropdown>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  type="text"
                  onClick={() => navigate('/login')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  登入
                </Button>
                <Button
                  type="primary"
                  onClick={() => navigate('/register')}
                  className="bg-primary-blue hover:bg-primary-blue-light"
                >
                  註冊
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
