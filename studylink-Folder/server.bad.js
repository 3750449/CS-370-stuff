const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const useMySQL = !!process.env.MYSQL_HOST;
const db = useMySQL ? require('./db.mysql') : require('./db');

const app = express();
const PORT = process.env.PORT || 8199;
const distDir = path.join(__dirname, 'studylink-frontend', 'dist');

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(distDir));

// --- API ---
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'studylink-api',
    driver: useMySQL ? 'mysql' : 'sqlite',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/notes', async (req, res) => {
  try {
    const { course } = req.query;
    const sql = course
      ? 'SELECT * FROM notes WHERE course = ? ORDER BY id DESC'
      : 'SELECT * FROM notes ORDER BY id DESC';
    const rows = await db.all(sql, course ? [course] : []);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/notes failed:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const { title, course, content } = req.body || {};
    if (!title || !course || !content) {
      return res.status(400).json({ error: 'title, course, content required' });
    }
    const createdAt = new Date().toISOString();
    const info = await db.run(
      'INSERT INTO notes (title, course, content, createdAt) VALUES (?,?,?,?)',
      [title, course, content, createdAt]
    );
    res.status(201).json({
      id: info.lastInsertRowid,
      title, course, content, createdAt
    });
  } catch (err) {
    console.error('POST /api/notes failed:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid id' });
    }
    const info = await db.run('DELETE FROM notes WHERE id = ?', [id]);
    if (info.changes === 0) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  } catch (err) {
    console.error('DELETE /api/notes/:id failed:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// --- SPA fallback (regex, not '*') ---
// This serves index.html for any non-API route.
// Regex avoids the path-to-regexp string parser completely.
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(` API listening on http://0.0.0.0:${PORT}`);
  console.log(` Frontend served from ${distDir}`);
});
