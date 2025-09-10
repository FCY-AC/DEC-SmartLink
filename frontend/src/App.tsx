import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

// Components
import Header from './components/Layout/Header';
import Login from './components/Auth/Login';
import LectureHall from './components/Student/LectureHall';
import LectureRoom from './components/Student/LectureRoom';
import ProfessorDashboard from './components/Professor/ProfessorDashboard';
import LectureControl from './components/Professor/LectureControl';

// Styles
import './App.css';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route path="/lectures" element={<LectureHall />} />
              <Route path="/lecture/:id" element={<LectureRoom />} />
              <Route path="/professor" element={<ProfessorDashboard />} />
              <Route path="/professor/lecture/:id" element={<LectureControl />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ConfigProvider>
  );
}

export default App;
