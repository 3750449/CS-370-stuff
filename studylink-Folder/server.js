const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Use MySQL database
const db = require('./db.mysql');

const app = express();
const PORT = process.env.PORT || 8199;
const distDir = path.join(__dirname, 'studylink-frontend', 'dist');

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(distDir));

// User table configuration
const USER_TABLE = 'User';
const USER_ID_COL = 'UserNameID';
const EMAIL_COL = 'email';
const PASSWORD_COL = 'passwordhash';

// --- API ---
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'studylink-api',
    driver: 'mysql',
    timestamp: new Date().toISOString(),
  });
});

// --- Authentication ---
function isEduEmail(email) {
  const basicPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!basicPattern.test(email)) return false;
  return /\.edu$/i.test(email);
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (!isEduEmail(email)) {
      return res.status(400).json({ error: 'email must be a valid .edu address' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }
    
    // Check if user already exists
    const existingUsers = await db.all(
      `SELECT ${USER_ID_COL} FROM \`${USER_TABLE}\` WHERE ${EMAIL_COL} = ?`,
      [email.toLowerCase()]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'account already exists' });
    }
    
    // Hash password and insert into User table
    const passwordHash = await bcrypt.hash(password, 10);
    const userNameId = email.toLowerCase().substring(0, 16); // varchar(16) limit for UserNameID
    
    await db.run(
      `INSERT INTO \`${USER_TABLE}\` (${USER_ID_COL}, ${EMAIL_COL}, ${PASSWORD_COL}) VALUES (?, ?, ?)`,
      [userNameId, email.toLowerCase(), passwordHash]
    );
    
    // Fetch the created user
    const rows = await db.all(
      `SELECT ${USER_ID_COL} AS id, ${EMAIL_COL} AS email FROM \`${USER_TABLE}\` WHERE ${EMAIL_COL} = ?`,
      [email.toLowerCase()]
    );
    
    return res.status(201).json({ 
      id: rows[0].id,
      email: rows[0].email
    });
  } catch (err) {
    console.error('POST /api/auth/register failed:', err);
    console.error('Error details:', err.message, err.code, err.errno);
    // Handle MySQL duplicate entry error
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      return res.status(409).json({ error: 'account already exists' });
    }
    return res.status(500).json({ error: 'internal server error', details: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'email and password are required' });
    }
    
    // Find user in User table
    const rows = await db.all(
      `SELECT ${USER_ID_COL} AS id, ${EMAIL_COL} AS email, ${PASSWORD_COL} AS passwordHash FROM \`${USER_TABLE}\` WHERE ${EMAIL_COL} = ?`,
      [email.toLowerCase()]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'invalid credentials' });
    }
    
    const record = rows[0];
    const ok = await bcrypt.compare(password, record.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'invalid credentials' });
    }
    
    return res.json({ 
      id: record.id,
      email: record.email
    });
  } catch (err) {
    console.error('POST /api/auth/login failed:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// List notes (optionally by course)
app.get('/api/notes', async (req, res) => {
  try {
    const { course } = req.query;
    const base =
      'SELECT id, title, course, content, DATE_FORMAT(createdAt, "%Y-%m-%dT%H:%i:%s.%fZ") AS createdAt FROM notes';
    const sql = course
      ? `${base} WHERE course = ? ORDER BY id DESC`
      : `${base} ORDER BY id DESC`;
    const rows = await db.all(sql, course ? [course] : []);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/notes failed:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// Create a new note
app.post('/api/notes', async (req, res) => {
  try {
    const { title, course, content } = req.body || {};
    if (!title || !course || !content) {
      return res
        .status(400)
        .json({ error: 'title, course, content required' });
    }

    // Insert without createdAt — MySQL sets it
    const info = await db.run(
      'INSERT INTO notes (title, course, content) VALUES (?,?,?)',
      [title, course, content]
    );

    // Fetch the new row to return with proper ISO timestamp
    const rows = await db.all(
      'SELECT id, title, course, content, DATE_FORMAT(createdAt, "%Y-%m-%dT%H:%i:%s.%fZ") AS createdAt FROM notes WHERE id = ?',
      [info.lastInsertRowid || info.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/notes failed:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// Delete note by ID
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid id' });
    }
    const info = await db.run('DELETE FROM notes WHERE id = ?', [id]);
    if (info.changes === 0 && !info.affectedRows) {
      return res.status(404).json({ error: 'not found' });
    }
    res.status(204).end();
  } catch (err) {
    console.error('DELETE /api/notes/:id failed:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// --- SPA fallback ---
// Send index.html for all non-API routes
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API listening on http://0.0.0.0:${PORT}`);
  console.log(`✅ Frontend served from ${distDir}`);
});
