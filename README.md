# 🎓 DEC SmartLink - AI-Powered Real-Time Classroom Interaction System

An innovative AI-powered classroom interaction system designed for City University of Hong Kong, addressing four core pain points in university education with real-time speech recognition, intelligent Q&A, and seamless professor-student interaction.

## 🏆 Cloud Studio AI Coding Challenge 2024 Submission

**Track**: Teaching-oriented Practical AI Application  
**Team**: DEC SmartLink Development Team  
**University**: City University of Hong Kong

## ✨ Core Features

### 🎤 Real-Time Speech Recognition & Live Subtitles
- **Azure Speech Services**: Advanced speech-to-text conversion
- **Live Broadcasting**: WebSocket-powered real-time subtitle delivery
- **Multi-language Support**: English with Chinese translation capabilities
- **Professor Screen Sharing**: WebRTC-based live screen streaming

### 🧠 AI-Powered Academic Assistant
- **Smart Term Explanation**: GPT-4 powered academic vocabulary explanations
- **Practice Questions**: Auto-generated exercises based on lecture content
- **Learning Analytics**: Personalized learning progress tracking
- **Vector Search**: pgvector-powered semantic content search

### 💬 Interactive Classroom Features
- **Live Attendance**: Real-time attendance checking and response system
- **Exercise Assignment**: In-lecture practice questions with instant feedback
- **Professor Control Panel**: Complete lecture management interface
- **Student Interaction**: Real-time Q&A and participation tracking

### 📊 Comprehensive Management System
- **Course Management**: Full CRUD operations for courses and lectures
- **Recording & Playback**: Automatic lecture recording with cloud storage
- **Analytics Dashboard**: Detailed participation and performance metrics
- **Role-Based Access**: Separate interfaces for professors and students

## 🏗️ Technical Architecture

### Frontend Stack
```json
{
  "framework": "React 18 + TypeScript",
  "ui": "Tailwind CSS 3.4 + Ant Design 5.x",
  "state_management": "Zustand",
  "real_time": "Socket.IO Client + WebRTC",
  "build_tool": "Vite",
  "routing": "React Router 6"
}
```

### Backend Stack
```json
{
  "runtime": "Node.js 20 + TypeScript",
  "framework": "Express.js 4.x + Socket.IO 4.x",
  "database": "PostgreSQL 15 + pgvector",
  "cache": "Redis 7",
  "ai_services": "Azure Speech + GPT-4 + Gemini",
  "authentication": "JWT + bcryptjs"
}
```

### Deployment & Infrastructure
```json
{
  "platform": "Cloud Studio / Docker",
  "containerization": "Docker + Docker Compose",
  "reverse_proxy": "Nginx",
  "file_storage": "Local + Cloud Upload",
  "monitoring": "PM2 + Logging"
}
```

## 🚀 Quick Start

### 📋 Prerequisites
- Node.js 20+
- Docker Desktop (for PostgreSQL + Redis)
- Git

### 🔧 Local Development Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/FCY-AC/DEC-SmartLink.git
cd DEC-SmartLink
```

#### 2. Start Database Services (Docker)
```bash
# Windows PowerShell / Linux / macOS
docker compose up -d postgres redis

# Verify containers are running
docker ps
# Should see postgres:15 and redis:7-alpine
```

#### 3. Environment Configuration
```bash
# Backend configuration
cd backend
cp .env.example .env

# Frontend configuration  
cd ../frontend
cp .env.example .env
```

#### 4. Install Dependencies
```bash
# Backend dependencies
cd ../backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

#### 5. Start Development Servers
```bash
# Backend (auto-creates database tables)
cd backend
npm run dev

# Frontend (in a new terminal)
cd frontend
npm start
```

#### 6. Seed Test Data (Optional)
```bash
# In backend directory
npm run db:seed
```

### 🌐 Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### 🔑 AI Services Configuration

#### Demo Mode (Default)
The system runs in demo mode by default, no API keys required:
```bash
# backend/.env
GENAI_PROVIDER=mock
ENABLE_AI_MOCK=true
ENABLE_SPEECH_MOCK=true
```

#### Google Gemini Mode (Recommended)
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API Key
3. Configure in `backend/.env`:
```bash
GENAI_PROVIDER=gemini
GEMINI_API_KEY=your_api_key_here
ENABLE_AI_MOCK=false
```

#### Azure Speech Services (For Real-time Subtitles)
```bash
# Configure in backend/.env
AZURE_SPEECH_KEY=your_speech_key
AZURE_SPEECH_REGION=brazilsouth
ENABLE_SPEECH_MOCK=false
```

#### OpenAI Mode (Alternative)
```bash
# Install OpenAI package
npm install openai

# Configure environment variables
GENAI_PROVIDER=openai
OPENAI_API_KEY=your_openai_key
```

## 📊 Database Schema

### Core Tables
- `users` - User profiles and authentication
- `courses` - Course information and management
- `lectures` - Lecture sessions and metadata
- `lecture_participants` - Attendance and participation tracking
- `interactions` - Student questions and responses
- `ai_contents` - AI-generated explanations and questions
- `academic_terms` - Vocabulary database with explanations
- `practice_questions` - Auto-generated exercise content

For detailed schema information, see [`Planning/Technical-Architecture.md`](./Planning/Technical-Architecture.md)

## 🔑 API Documentation

### Authentication Endpoints
```typescript
POST /api/auth/login      // User login
POST /api/auth/register   // User registration  
GET  /api/auth/me         // Get current user profile
```

### Lecture Management
```typescript
GET  /api/lectures        // Get lecture list
GET  /api/lectures/today  // Get today's lectures
POST /api/lectures        // Create new lecture
GET  /api/lectures/:id    // Get lecture details
POST /api/lectures/:id/start  // Start lecture
POST /api/lectures/:id/end    // End lecture
```

### AI Services
```typescript
POST /api/ai/explain      // Get term explanation
POST /api/ai/questions    // Generate practice questions
POST /api/ai/translate    // Real-time translation
```

### WebSocket Events
```typescript
join-lecture          // Join lecture room
leave-lecture         // Leave lecture room
new-subtitle          // Real-time subtitle broadcast
attendance-check      // Attendance verification
exercise-assigned     // Practice exercise distribution
webrtc-offer/answer   // Screen sharing signaling
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage report
npm run test:coverage
```

## 🎯 Demo Credentials

### Professor Account
- **Email**: `professor@cityu.edu.hk`
- **Password**: `password123` (or universal dev password)

### Student Account  
- **Student ID**: `student1`
- **Email**: `student1@my.cityu.edu.hk`
- **Password**: `password123` (or universal dev password)

## 🚀 Deployment

### 🐳 Full Docker Deployment
```bash
# Build and start all services
docker compose up -d

# Check service status
docker compose ps

# View logs
docker compose logs -f backend frontend
```

### ☁️ Cloud Deployment (Recommended)

#### 1. Cloud Studio / Render / Railway
```bash
# Build frontend
cd frontend
npm run build

# Set environment variables (on cloud platform)
REACT_APP_API_BASE=https://your-backend.com/api
```

#### 2. VPS Deployment (Ubuntu/CentOS)
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Deploy application
git clone https://github.com/FCY-AC/DEC-SmartLink.git
cd DEC-SmartLink
docker compose up -d

# Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/dec-smartlink
```

#### 3. 最小 Nginx 配置
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端靜態檔案
    location / {
        root /var/www/dec-smartlink/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # 後端 API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 🤝 開發指南

### 📁 專案結構
```
dec-smartlink/
├── frontend/              # React 前端應用
│   ├── src/
│   │   ├── components/    # React 組件
│   │   ├── hooks/         # 自訂 Hooks
│   │   ├── utils/         # 工具函數
│   │   └── types/         # TypeScript 類型
│   └── public/
├── backend/               # Node.js 後端服務
│   ├── src/
│   │   ├── routes/        # API 路由
│   │   ├── services/      # 業務邏輯
│   │   ├── database/      # 資料庫相關
│   │   ├── middleware/    # 中間件
│   │   └── utils/         # 工具函數
│   └── dist/              # 編譯輸出
├── database/              # 資料庫腳本
├── docker/                # Docker 配置
└── docs/                  # 文檔
```

### 🔄 開發工作流
1. 建立功能分支: `git checkout -b feature/new-feature`
2. 編寫程式碼並提交: `git commit -m "Add new feature"`
3. 推送到遠端: `git push origin feature/new-feature`
4. 建立 Pull Request

### 📝 程式碼規範
- 使用 TypeScript 進行類型檢查
- 遵循 ESLint 配置
- 編寫有意義的提交訊息
- 添加適當的程式碼註釋

## 🎯 Project Objectives

### 📈 Success Metrics
- **Student Engagement**: Average 2+ questions per lecture
- **Learning Effectiveness**: Student comprehension score > 4.0/5.0
- **System Performance**: Subtitle latency < 2 seconds
- **User Retention**: Daily active users > 80%

### 🏆 Competition Highlights
- ✅ **Innovation**: Addresses real Hong Kong university education challenges
- ✅ **Technical Excellence**: Advanced AI integration with Cloud Studio GPU
- ✅ **Practical Impact**: Solves actual classroom pain points
- ✅ **Scalability**: Modular architecture for institutional deployment

## 🌟 Key Achievements

### ✅ Fully Functional Features
- **Real-time Speech Recognition**: Azure Speech Services integration
- **Live Screen Sharing**: WebRTC-based professor screen broadcasting
- **Interactive Attendance**: Real-time student check-in system
- **Practice Exercises**: AI-generated in-lecture questions
- **Recording & Playback**: Automatic lecture capture and storage
- **Responsive Design**: Modern UI with Tailwind CSS + Ant Design

### 🔧 Technical Implementation
- **62 Files**: Complete full-stack application
- **33,281+ Lines**: Production-ready codebase
- **TypeScript**: Type-safe development
- **Docker Ready**: Containerized deployment
- **Cloud Optimized**: Designed for Cloud Studio deployment

## 📞 Contact Information

- **Project Team**: DEC SmartLink Development Team
- **University**: City University of Hong Kong
- **GitHub Repository**: https://github.com/FCY-AC/DEC-SmartLink
- **Competition**: Cloud Studio AI Coding Challenge 2024

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**🎓 DEC SmartLink** - Making Learning Smarter, Making Interaction Real-time!

*Submitted for Cloud Studio AI Coding Challenge 2024 - Teaching-oriented Practical AI Application Track*
