import { Pool, PoolClient } from 'pg';
import { createTables } from './schema';

let pool: Pool | null = null;

// 資料庫連線配置
const createPool = (): Pool => {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    client_encoding: 'UTF8',
  });
};

// 初始化資料庫
export const initializeDatabase = async (): Promise<void> => {
  try {
    if (!pool) {
      pool = createPool();
    }

    // 測試連線
    const client = await pool!.connect();
    console.log('✅ 資料庫連線成功');

    // 創建資料表
    await createTables(client);

    client.release();

    // 設定連線事件監聽
    pool!.on('connect', (client: PoolClient) => {
      console.log('🔗 新資料庫連線已建立');
      client.query(`SET TIME ZONE 'Asia/Hong_Kong';`);
    });

    pool!.on('error', (err: Error, client: PoolClient) => {
      console.error('❌ 資料庫連線錯誤:', err);
    });

  } catch (error) {
    console.error('❌ 資料庫初始化失敗:', error);
    throw error;
  }
};

// 關閉資料庫連線
export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool!.end();
    console.log('📴 資料庫連線已關閉');
  }
};

// 查詢輔助函數
export const query = async (text: string, params?: any[]): Promise<any> => {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// 事務處理輔助函數
export const transaction = async <T>(
  callback: (client: any) => Promise<T>
): Promise<T> => {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// 安全的 pool 訪問器
export const getPool = (): Pool => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      client_encoding: 'UTF8',
    });

    pool.on('connect', (client) => {
      console.log('🔗 新資料庫連線已建立');
      client.query(`SET TIME ZONE 'Asia/Hong_Kong';`);
    });

    pool.on('error', (err, _client) => {
      console.error('❌ 資料庫連線錯誤:', err);
    });
  }
  return pool;
};

export default pool;
