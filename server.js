const express = require('express');
const cors = require('cors');
const db = require('./db'); // better-sqlite3

const app = express();
const PORT = process.env.PORT || 8199;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'studylink-api', timestamp: new Date().toISOString() });
});

// List notes (optional ?course=)
app.get('/api/notes', (req, res) => {
  const { course } = req.query;
  const rows = course
    ? db.prepare('SELECT * FROM notes WHERE course = ? ORDER BY id DESC').all(course)
    : db.prepare('SELECT * FROM notes ORDER BY id DESC').all();
  res.json(rows);
});

// Create note
app.post('/api/notes', (req, res) => {
  const { title, course, content } = req.body || {};
  if (!title || !course || !content) {
    return res.status(400).json({ error: 'title, course, content required' });
  }
  const createdAt = new Date().toISOString();
  const info = db
    .prepare('INSERT INTO notes (title, course, content, createdAt) VALUES (?, ?, ?, ?)')
    .run(title, course, content, createdAt);
  res.status(201).json({ id: info.lastInsertRowid, title, course, content, createdAt });
});

// Delete note by id
app.delete('/api/notes/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'invalid id' });
  }
  const info = db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'not found' });
  }
  res.status(204).end();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API listening on http://0.0.0.0:${PORT}`);
});
