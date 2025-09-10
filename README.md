# 🎓 DEC SmartLink - 智慧課堂互動系統

一個基於 AI 的智慧課堂互動系統，專為香港城市大學設計，解決大學教育的四大核心痛點。

## ✨ 核心功能

### 🎯 即時雙語字幕系統
- **Azure Speech Services**: 語音識別
- **Azure Translator**: 即時翻譯
- **WebSocket**: 即時廣播

### 🧠 AI學術詞彙解釋
- **OpenAI GPT-4**: 智能解釋
- **pgvector**: 向量搜尋
- **快取機制**: 提升效能

### 💬 智慧互動提問系統
- **位置追蹤**: BLE信標定位
- **即時通訊**: Socket.IO
- **教授管理**: 優先級排序

### 📍 自動出席記錄
- **藍牙信號檢測**: BLE信標
- **GPS定位**: 精確位置
- **自動記錄**: 無縫體驗

## 🏗️ 技術架構

### 前端技術棧
```json
{
  "framework": "React 18 + TypeScript",
  "ui": "Tailwind CSS + Ant Design",
  "state": "Zustand",
  "real_time": "Socket.IO Client",
  "build": "Vite"
}
```

### 後端技術棧
```json
{
  "runtime": "Node.js 20 + TypeScript",
  "framework": "Express.js + Socket.IO",
  "database": "PostgreSQL + pgvector",
  "cache": "Redis",
  "ai": "Azure + OpenAI"
}
```

### 部署架構
```json
{
  "platform": "Cloud Studio",
  "container": "Docker + Docker Compose",
  "reverse_proxy": "Nginx",
  "monitoring": "PM2"
}
```

## 🚀 快速開始

### 📋 環境需求
- Node.js 20+
- Docker Desktop（用於 PostgreSQL + Redis）
- Git

### 🔧 本機安裝步驟

#### 1. 複製專案
```bash
git clone https://github.com/your-repo/dec-smartlink.git
cd dec-smartlink
```

#### 2. 啟動資料庫服務（Docker）
```bash
# Windows PowerShell
docker compose up -d postgres redis

# 驗證容器啟動
docker ps
# 應看到 postgres:15 與 redis:7-alpine
```

#### 3. 環境配置
```bash
# 後端配置
cd backend
Copy-Item .env.example .env -Force

# 前端配置
cd ../frontend
Copy-Item .env.example .env -Force
```

#### 4. 安裝依賴
```bash
# 後端
cd ../backend
npm install

# 前端
cd ../frontend
npm install
```

#### 5. 啟動服務
```bash
# 後端（自動建表）
cd backend
npm run dev

# 前端（新終端）
cd frontend
npm start
```

#### 6. 填充測試資料（可選）
```bash
# 在後端目錄
npm run db:seed
```

### 🌐 訪問應用
- **前端**: http://localhost:3000
- **後端 API**: http://localhost:3001
- **健康檢查**: http://localhost:3001/health

### 🔑 AI 服務配置

#### Mock 模式（預設）
系統預設使用 Mock 模式，無需任何金鑰即可 demo：
```bash
# backend/.env
GENAI_PROVIDER=mock
ENABLE_AI_MOCK=true
```

#### Google Gemini 模式
1. 訪問 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 建立 API Key
3. 在 `backend/.env` 設定：
```bash
GENAI_PROVIDER=gemini
GEMINI_API_KEY=你的金鑰
```

#### OpenAI 模式
```bash
# 安裝 OpenAI 套件
npm install openai

# 設定環境變數
GENAI_PROVIDER=openai
OPENAI_API_KEY=你的金鑰
```

#### Azure 語音/翻譯（可選）
```bash
# 安裝 Azure 套件
npm install @azure/ai-translation-text

# 設定環境變數
AZURE_SPEECH_KEY=你的金鑰
AZURE_SPEECH_REGION=eastasia
AZURE_TRANSLATOR_KEY=你的金鑰
```

## 📊 資料庫結構

### 核心資料表
- `users` - 用戶資訊
- `courses` - 課程資訊
- `lectures` - 講堂資訊
- `lecture_participants` - 參與記錄
- `questions` - 提問記錄
- `polls` - 投票記錄
- `transcripts` - 字幕記錄
- `academic_terms` - 學術詞彙
- `practice_questions` - 練習題

詳細結構請參考 [`Planning/Technical-Architecture.md`](./Planning/Technical-Architecture.md)

## 🔑 API 文檔

### 認證 API
```typescript
POST /api/auth/login      // 用戶登入
POST /api/auth/register   // 用戶註冊
GET  /api/auth/me         // 獲取當前用戶
```

### 講堂 API
```typescript
GET  /api/lectures        // 獲取講堂列表
GET  /api/lectures/today  // 獲取今日課程
POST /api/lectures        // 創建講堂
GET  /api/lectures/:id    // 獲取講堂詳情
```

### WebSocket 事件
```typescript
join-lecture      // 加入講堂
leave-lecture     // 離開講堂
subtitle-update   // 字幕更新
question-submit   // 提交提問
vote              // 投票
```

## 🧪 測試

```bash
# 運行所有測試
npm test

# 運行測試並監視變化
npm run test:watch

# 生成測試覆蓋率報告
npm run test:coverage
```

## 🚀 部署

### 🐳 Docker 完整部署
```bash
# 建置並啟動所有服務
docker compose up -d

# 查看服務狀態
docker compose ps

# 查看日誌
docker compose logs -f backend frontend
```

### ☁️ 雲端部署（推薦）

#### 1. Cloud Studio / Render / Railway
```bash
# 建置前端
cd frontend
npm run build

# 設定環境變數（在雲端平台）
REACT_APP_API_BASE=https://your-backend.com/api/v1
```

#### 2. VPS 部署（Ubuntu/CentOS）
```bash
# 安裝 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 部署應用
git clone your-repo
cd dec-smartlink
docker compose up -d

# 設定 Nginx 反向代理
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

## 🎯 專案目標

### 📈 成功指標
- **用戶參與度**: 學生平均提問數 > 2次/堂課
- **學習效果**: 學生理解度評分 > 4.0/5.0
- **系統效能**: 字幕延遲 < 2秒
- **用戶留存**: 每日活躍用戶 > 80%

### 🏆 競賽亮點
- ✅ **創新性**: 結合香港本土教育特色
- ✅ **技術性**: Cloud Studio GPU 算力應用
- ✅ **實用性**: 解決實際教學痛點
- ✅ **可擴展性**: 模組化架構設計

## 📞 聯絡方式

- **專案負責人**: DEC SmartLink Team
- **技術支援**: tech@dec-smartlink.com
- **專案首頁**: https://dec-smartlink.cloudstudio.net

## 📄 授權

此專案採用 MIT 授權 - 查看 [LICENSE](LICENSE) 文件獲取詳情。

---

**🎓 DEC SmartLink** - 讓學習更智慧，讓互動更即時！
