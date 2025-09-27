const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Switch driver based on env
const useMySQL = !!process.env.MYSQL_HOST;
const db = useMySQL ? require('./db.mysql') : require('./db'); // db.mysql.js or db.js (sqlite)

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
