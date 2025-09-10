# 🎓 DEC SmartLink - AI-Powered Real-Time Classroom Interaction System

An innovative AI-powered classroom interaction system designed for City University of Hong Kong, addressing four core pain points in university education with real-time speech recognition, intelligent Q&A, and seamless professor-student interaction.

## Problem Statement & Goals

- Reduce passive lectures by enabling governed, fair, and timely interactions
- Provide bilingual accessibility (EN ⇄ ZH) for inclusive learning
- Offer live screen sharing plus real-time context aids (subtitles, terms)
- Simplify attendance and in-lecture practice with minimal friction
- Preserve a reviewable timeline of the session for post-lecture study

These goals aim to turn “listening-only” into discovery-driven engagement.

## 🏆 Cloud Studio AI Coding Challenge 2025 Submission

**Track**: Teaching-oriented Practical AI Application  
**Team**: DEC SmartLink Development Team  
**University**: City University of Hong Kong

## Why “DEC SmartLink” (Name & Alignment)

- DEC stands for Discovery-enriched Curriculum at CityU. The vision is to transform every course into a discovery opportunity.
- “SmartLink” emphasizes intelligent linkage among people, content, and context, forming a living knowledge network that supports communication and continuous learning.
- The app’s governed Q&A and concept scaffolding model reflect DEC’s spirit of discovery, innovation, and knowledge transfer.

## Challenge Fit & Rationale

- Track: Teaching-oriented Practical AI Application
- Focus: Live transcription/translation, concept scaffolding, governed Q&A, and reviewable timelines
- Tools: Cloud Studio + Docker; Socket.IO + WebRTC for real-time; Gemini for AI; PostgreSQL for persistence
- Judging Alignment: Creativity (novel classroom interaction), Technical (real-time + AI), Value (accessibility and engagement), Explanation (clear docs and roadmap)

## Submission Transparency (Read First)

- Completion status: approximately 20% of the planned MVP
- Cloud Studio usage: not used in this prototype yet (local Docker used)
- Primary blockers: end-to-end ASR not working; AI flows depend on ASR output
- Demo scope: prototype UI flows, basic lecture control, basic recording/upload, basic attendance, WebRTC signaling

## ✨ Core Features

### 🎤 Real-Time Speech Recognition & Live Subtitles
- **Azure Speech Services**: Advanced speech-to-text conversion
- **Live Broadcasting**: WebSocket-powered real-time subtitle delivery
- **Multi-language Support**: English with Chinese translation capabilities
- **Professor Screen Sharing**: WebRTC-based live screen streaming

### 🧠 AI-Powered Academic Assistant
- **Smart Term Explanation**: Google Gemini powered academic vocabulary explanations
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
  "ai_services": "Azure Speech + Google Gemini",
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

#### 3. Minimal Nginx Config
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

## 🤝 Development Guide

### 📁 Project Structure
```
dec-smartlink/
├── frontend/              # React app
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── utils/         # Utilities
│   │   └── types/         # TypeScript types
│   └── public/
├── backend/               # Node.js backend service
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── database/      # Database
│   │   ├── middleware/    # Middleware
│   │   └── utils/         # Utilities
│   └── dist/              # 編譯輸出
├── database/              # Database scripts
├── docker/                # Docker configs
└── docs/                  # Docs
```

### 🔄 Development Workflow
1. Create feature branch: `git checkout -b feature/new-feature`
2. Commit changes: `git commit -m "Add new feature"`
3. Push branch: `git push origin feature/new-feature`
4. Open Pull Request

### 📝 Code Guidelines
- Use TypeScript for type-safety
- Follow ESLint configuration
- Write meaningful commit messages
- Add concise and helpful comments

## 🎯 Project Objectives

### 📈 Success Metrics
- **Student Engagement**: Average 2+ questions per lecture
- **Learning Effectiveness**: Student comprehension score > 4.0/5.0
- **System Performance**: Subtitle latency < 2 seconds
- **User Retention**: Daily active users > 80%

### 🧭 Evaluation Considerations (Aspirational)
- We aim to contribute a thoughtful blueprint for practical AI in teaching
- We prioritize inclusivity (bilingual access) and governed interaction
- We choose a modular architecture to allow gradual adoption on campus
- We propose a data-informed loop to improve learning outcomes over time

## 🌟 Prototype Snapshot (What Works Now)

- Live screen sharing (WebRTC signaling; local tests only)
- Basic attendance check (UI + socket events)
- In-lecture exercise UI (basic submission flow)
- Recording and upload (local storage endpoint)
- Responsive UI with Tailwind CSS + Ant Design

### 🔧 Implementation Notes
- TypeScript-based full stack scaffold (frontend + backend)
- Docker Compose for database services (Postgres, Redis)
- Socket.IO for realtime messaging; WebRTC for screen share

## ⚠️ Current Status & Known Limitations

This hackathon submission is a functional prototype with important gaps due to time constraints:

- Sound-to-text (ASR) is not working end-to-end
  - Azure Speech wiring exists but runs in mock mode without valid credentials
  - No stable real-time subtitle broadcasting in production mode yet
- AI-powered processing is not enabled
  - Term extraction, explanations, and practice generation depend on ASR output
  - Google Gemini integration is prepared; flows are currently stubbed for demo
- Student live viewing reliability requires stabilization
  - WebRTC signaling implemented; intermittent connectivity observed locally
- Lecture lifecycle consistency requires refinement
  - Status transitions (scheduled → ongoing → completed) can desync with UI lists
- Recording/upload flow is minimal
  - File is saved locally; cloud storage and access control are pending

For full intent and design scope, see Initial Ideas, UI Design Sketches, and Hackathon planning documents in the `Planning/` directory.

## 🚧 Out-of-Scope in this Submission (from Initial Ideas)

- BLE/Beacon-assisted attendance detection and seat map visualization
- Classroom 2D seat layout with live student position overlay
- Knowledge-graph timeline linking slides, questions, and transcripts
- Automated MCQ generation with rubric-based grading at scale
- Governance/consent flows and anonymized analytics dashboards

## 📞 Contact Information

- **Project Team**: DEC SmartLink Development Team
- **University**: City University of Hong Kong
- **GitHub Repository**: https://github.com/FCY-AC/DEC-SmartLink
- **Competition**: Cloud Studio AI Coding Challenge 2025

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**🎓 DEC SmartLink** - Making Learning Smarter, Making Interaction Real-time!

## 🌈 Vision & Expected Outcomes (What We Want to Achieve Next)

Grounded in the Initial Ideas, UI Design Sketches, and the Hackathon plan, the project aims to deliver:

1) Seamless real-time bilingual subtitles with low latency (<2s)
   - Unblock ASR (Azure/GCP), stabilize subtitle streaming
   - Add opt-in translation (EN ⇄ ZH) with per-user preferences

2) Gemini-powered term explanations tightly coupled to lecture context
   - Lightweight term extraction from transcript
   - Context-aware explanations with citations and course glossary

3) Governed Q&A with equitable participation
   - Time-windowed ask-to-speak; moderation, queueing, and seat-map prompts
   - Anonymous mode with coach prompts that nudge deeper thinking

4) Low-friction attendance + engagement insights
   - BLE/Wi-Fi proximity (opt-in), late/early indicators
   - Class-level dashboards for instructors; privacy-first aggregation

5) Reviewable session timeline for post-lecture study
   - Unify recording, transcript, questions, and exercises
   - Knowledge graph links across terms, slides, and Q&A

We acknowledge this submission is an early milestone (~20%). The roadmap prioritizes stabilizing ASR → AI pipelines, tightening WebRTC reliability, and delivering the governed interaction loop envisioned in the design docs.
