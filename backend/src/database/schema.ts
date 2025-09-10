import { query } from './index';

export const createTables = async (client: any): Promise<void> => {
  try {
    console.log('🔨 正在創建資料庫結構...');

    // 啟用必要的擴展
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await client.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
    
    // 嘗試啟用 vector 擴展（可選）
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "vector"');
      console.log('✅ pgvector 擴展已啟用');
    } catch (error) {
      console.warn('⚠️ pgvector 擴展未安裝，向量搜尋功能將被禁用');
    }

    // 1. 用戶相關表
    await createUserTables(client);

    // 2. 課程相關表
    await createCourseTables(client);

    // 3. 講堂相關表
    await createLectureTables(client);

    // 4. 互動相關表
    await createInteractionTables(client);

    // 5. AI與內容相關表
    await createAIContentTables(client);

    // 6. 創建索引
    await createIndexes(client);

    console.log('✅ 資料庫結構創建完成');
  } catch (error) {
    console.error('❌ 資料庫結構創建失敗:', error);
    throw error;
  }
};

const createUserTables = async (client: any): Promise<void> => {
  // 用戶主表
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'professor', 'admin')),
      name VARCHAR(255) NOT NULL,
      student_id VARCHAR(50),
      department VARCHAR(100),
      avatar_url VARCHAR(500),
      is_active BOOLEAN DEFAULT true,
      last_login_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // 用戶偏好設定表
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      language_preference VARCHAR(10) DEFAULT 'zh',
      notification_enabled BOOLEAN DEFAULT true,
      subtitle_enabled BOOLEAN DEFAULT true,
      auto_translate BOOLEAN DEFAULT true,
      theme VARCHAR(20) DEFAULT 'light',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id)
    )
  `);

  console.log('✅ 用戶表創建完成');
};

const createCourseTables = async (client: any): Promise<void> => {
  // 課程主表
  await client.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      code VARCHAR(20) UNIQUE NOT NULL,
      professor_id UUID REFERENCES users(id),
      department VARCHAR(100),
      semester VARCHAR(20),
      credits INTEGER CHECK (credits > 0),
      max_students INTEGER DEFAULT 100,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // 課程參與者表
  await client.query(`
    CREATE TABLE IF NOT EXISTS course_enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
      student_id UUID REFERENCES users(id) ON DELETE CASCADE,
      enrollment_date TIMESTAMP DEFAULT NOW(),
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
      grade VARCHAR(5),
      UNIQUE(course_id, student_id)
    )
  `);

  console.log('✅ 課程表創建完成');
};

const createLectureTables = async (client: any): Promise<void> => {
  // 講堂主表
  await client.query(`
    CREATE TABLE IF NOT EXISTS lectures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      scheduled_at TIMESTAMP NOT NULL,
      duration_minutes INTEGER CHECK (duration_minutes > 0),
      room_location VARCHAR(100),
      status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
      recording_url VARCHAR(500),
      stream_url VARCHAR(500),
      max_participants INTEGER DEFAULT 200,
      is_recorded BOOLEAN DEFAULT true,
      started_at TIMESTAMP,
      ended_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // 講堂參與記錄表
  await client.query(`
    CREATE TABLE IF NOT EXISTS lecture_participants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      joined_at TIMESTAMP DEFAULT NOW(),
      left_at TIMESTAMP,
      attendance_status VARCHAR(50) DEFAULT 'present' CHECK (attendance_status IN ('present', 'absent', 'late', 'left_early')),
      position_x DECIMAL(5,2),
      position_y DECIMAL(5,2),
      device_info JSONB,
      network_quality VARCHAR(20) DEFAULT 'good',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(lecture_id, user_id)
    )
  `);

  console.log('✅ 講堂表創建完成');
};

const createInteractionTables = async (client: any): Promise<void> => {
  // 提問記錄表
  await client.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      question_type VARCHAR(50) DEFAULT 'text' CHECK (question_type IN ('text', 'voice', 'image')),
      position_x DECIMAL(5,2),
      position_y DECIMAL(5,2),
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'dismissed', 'escalated')),
      priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 10),
      answered_at TIMESTAMP,
      answer_content TEXT,
      answer_by UUID REFERENCES users(id),
      is_anonymous BOOLEAN DEFAULT false,
      upvotes INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // 投票記錄表
  await client.query(`
    CREATE TABLE IF NOT EXISTS polls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      options JSONB NOT NULL,
      is_multiple_choice BOOLEAN DEFAULT false,
      is_anonymous BOOLEAN DEFAULT true,
      allow_custom_option BOOLEAN DEFAULT false,
      duration_minutes INTEGER,
      status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      ended_at TIMESTAMP
    )
  `);

  // 投票結果表
  await client.query(`
    CREATE TABLE IF NOT EXISTS poll_responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      selected_options JSONB NOT NULL,
      custom_option TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(poll_id, user_id)
    )
  `);

  console.log('✅ 互動表創建完成');
};

const createAIContentTables = async (client: any): Promise<void> => {
  // 學術詞彙庫表
  await client.query(`
    CREATE TABLE IF NOT EXISTS academic_terms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      term VARCHAR(255) NOT NULL UNIQUE,
      explanation TEXT NOT NULL,
      category VARCHAR(100),
      language VARCHAR(10) DEFAULT 'en',
      difficulty_level VARCHAR(20) DEFAULT 'intermediate',
      embedding TEXT, -- 改為 TEXT，避免 pgvector 依賴
      usage_count INTEGER DEFAULT 0,
      confidence_score DECIMAL(3,2) DEFAULT 0.8,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // 字幕記錄表
  await client.query(`
    CREATE TABLE IF NOT EXISTS transcripts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
      original_text TEXT NOT NULL,
      translated_text TEXT,
      language VARCHAR(10) DEFAULT 'zh',
      start_time DECIMAL(10,3),
      end_time DECIMAL(10,3),
      confidence DECIMAL(3,2),
      speaker_id VARCHAR(50),
      word_timestamps JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // 練習題庫表
  await client.query(`
    CREATE TABLE IF NOT EXISTS practice_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      question_type VARCHAR(50) DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'short_answer', 'essay', 'code')),
      options JSONB,
      correct_answer VARCHAR(10),
      explanation TEXT,
      hint TEXT,
      difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
      points INTEGER DEFAULT 1,
      time_limit_seconds INTEGER,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // 學生答題記錄表
  await client.query(`
    CREATE TABLE IF NOT EXISTS practice_responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      question_id UUID REFERENCES practice_questions(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      selected_answer VARCHAR(10),
      text_answer TEXT,
      code_answer TEXT,
      is_correct BOOLEAN,
      response_time_seconds INTEGER,
      points_earned INTEGER DEFAULT 0,
      feedback TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(question_id, user_id)
    )
  `);

  console.log('✅ AI內容表創建完成');
};

const createIndexes = async (client: any): Promise<void> => {
  // 效能優化索引
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id)',
    'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',

    'CREATE INDEX IF NOT EXISTS idx_courses_professor_id ON courses(professor_id)',
    'CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code)',
    'CREATE INDEX IF NOT EXISTS idx_courses_department ON courses(department)',

    'CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id)',
    'CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id ON course_enrollments(student_id)',

    'CREATE INDEX IF NOT EXISTS idx_lectures_course_id ON lectures(course_id)',
    'CREATE INDEX IF NOT EXISTS idx_lectures_scheduled_at ON lectures(scheduled_at)',
    'CREATE INDEX IF NOT EXISTS idx_lectures_status ON lectures(status)',

    'CREATE INDEX IF NOT EXISTS idx_lecture_participants_lecture_id ON lecture_participants(lecture_id)',
    'CREATE INDEX IF NOT EXISTS idx_lecture_participants_user_id ON lecture_participants(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_lecture_participants_joined_at ON lecture_participants(joined_at)',

    'CREATE INDEX IF NOT EXISTS idx_questions_lecture_id ON questions(lecture_id)',
    'CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status)',
    'CREATE INDEX IF NOT EXISTS idx_questions_priority ON questions(priority)',

    'CREATE INDEX IF NOT EXISTS idx_polls_lecture_id ON polls(lecture_id)',
    'CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status)',

    'CREATE INDEX IF NOT EXISTS idx_poll_responses_poll_id ON poll_responses(poll_id)',
    'CREATE INDEX IF NOT EXISTS idx_poll_responses_user_id ON poll_responses(user_id)',

    'CREATE INDEX IF NOT EXISTS idx_academic_terms_term ON academic_terms USING gin(term gin_trgm_ops)',
    'CREATE INDEX IF NOT EXISTS idx_academic_terms_category ON academic_terms(category)',
    // 'CREATE INDEX IF NOT EXISTS idx_academic_terms_embedding ON academic_terms USING ivfflat(embedding vector_cosine_ops)', // 需要 pgvector

    'CREATE INDEX IF NOT EXISTS idx_transcripts_lecture_id ON transcripts(lecture_id)',
    'CREATE INDEX IF NOT EXISTS idx_transcripts_start_time ON transcripts(start_time)',

    'CREATE INDEX IF NOT EXISTS idx_practice_questions_lecture_id ON practice_questions(lecture_id)',
    'CREATE INDEX IF NOT EXISTS idx_practice_questions_difficulty ON practice_questions(difficulty)',

    'CREATE INDEX IF NOT EXISTS idx_practice_responses_question_id ON practice_responses(question_id)',
    'CREATE INDEX IF NOT EXISTS idx_practice_responses_user_id ON practice_responses(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_practice_responses_is_correct ON practice_responses(is_correct)'
  ];

  for (const indexQuery of indexes) {
    await client.query(indexQuery);
  }

  console.log('✅ 資料庫索引創建完成');
};
