// db.mssql.js
const sql = require('mssql');

const config = {
  server: process.env.MSSQL_SERVER,
  database: process.env.MSSQL_DATABASE,
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  options: {
    encrypt: String(process.env.MSSQL_ENCRYPT).toLowerCase() === 'true',
    trustServerCertificate: String(process.env.MSSQL_TRUST_SERVER_CERT).toLowerCase() === 'true',
  },
  pool: {
    min: Number(process.env.MSSQL_POOL_MIN || 0),
    max: Number(process.env.MSSQL_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.MSSQL_POOL_IDLE || 30000),
  },
};

// Single global pool
let pool;
async function getPool() {
  if (pool?.connected) return pool;
  pool = await sql.connect(config);
  return pool;
}

// Ensure table exists (id INT identity like SQLite autoincrement)
async function ensureSchema() {
  const p = await getPool();
  await p.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='notes' AND xtype='U')
    CREATE TABLE dbo.notes (
      id INT IDENTITY(1,1) PRIMARY KEY,
      title NVARCHAR(200) NOT NULL,
      course NVARCHAR(50) NOT NULL,
      content NVARCHAR(MAX) NOT NULL,
      createdAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
  `);
}

// CRUD
async function listNotes(course) {
  const p = await getPool();
  if (course) {
    const r = await p.request()
      .input('course', sql.NVarChar(50), course)
      .query('SELECT id, title, course, content, createdAt FROM dbo.notes WHERE course = @course ORDER BY id DESC;');
    return r.recordset;
  } else {
    const r = await p.request()
      .query('SELECT id, title, course, content, createdAt FROM dbo.notes ORDER BY id DESC;');
    return r.recordset;
  }
}

async function createNote({ title, course, content }) {
  const p = await getPool();
  const r = await p.request()
    .input('title', sql.NVarChar(200), title)
    .input('course', sql.NVarChar(50), course)
    .input('content', sql.NVarChar(sql.MAX), content)
    .query(`
      INSERT INTO dbo.notes (title, course, content, createdAt)
      OUTPUT INSERTED.id, INSERTED.title, INSERTED.course, INSERTED.content, INSERTED.createdAt
      VALUES (@title, @course, @content, SYSUTCDATETIME());
    `);
  return r.recordset[0]; // inserted row
}

async function deleteNote(id) {
  const p = await getPool();
  const r = await p.request().input('id', sql.Int, id).query('DELETE FROM dbo.notes WHERE id = @id;');
  return r.rowsAffected[0]; // number deleted (0 or 1)
}

module.exports = { ensureSchema, listNotes, createNote, deleteNote };
