
const mysql = require('mysql2/promise');

const {
  MYSQL_HOST,
  MYSQL_PORT = 3306,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
} = process.env;

if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) {
  throw new Error('Missing MySQL env vars: MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE');
}

const pool = mysql.createPool({
  host: MYSQL_HOST,
  port: Number(MYSQL_PORT),
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title     VARCHAR(200) NOT NULL,
      course    VARCHAR(50)  NOT NULL,
      content   MEDIUMTEXT   NOT NULL,
      createdAt DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    );
  `);
}
init().catch(err => {
  console.error('MySQL init error:', err);
  process.exit(1);
});

async function all(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function run(sql, params = []) {
  const [result] = await pool.query(sql, params);

  return {
    lastInsertRowid: result.insertId ?? null,
    changes: result.affectedRows ?? 0,
    raw: result,
  };
}

module.exports = { all, run, pool };
