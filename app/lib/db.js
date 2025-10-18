// app/lib/db.js
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST ,
  user: process.env.DB_USER ,
  password: process.env.DB_PASSWORD ,
  database: process.env.DB_NAME ,
  port: parseInt(process.env.DB_PORT) ,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

const pool = mysql.createPool(dbConfig);

// Test connection
pool.getConnection()
  .then((connection) => {
    console.log('✅ Database connected');
    connection.release();
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error.message);
  });

export async function query(sql, params = []) {
  let connection;
  try {
    const stringParams = params.map((param) =>
      typeof param === 'number' ? param.toString() : param
    );

    const questionMarkCount = (sql.match(/\?/g) || []).length;
    if (stringParams.length !== questionMarkCount) {
      throw new Error(
        `Parameter mismatch: expected ${questionMarkCount}, got ${stringParams.length}`
      );
    }

    connection = await pool.getConnection();
    const [results] = await connection.execute(sql, stringParams);
    return results;
  } catch (error) {
    console.error('❌ Query error:', error.message);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

export { pool };
