const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
require('dotenv').config();

// Use MySQL database
const db = require('./db.mysql');

const app = express();
const PORT = process.env.PORT || 8199;
const distDir = path.join(__dirname, 'studylink-frontend', 'dist');

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased for file uploads
app.use(express.static(distDir));

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // 7 days

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'authentication required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'invalid or expired token' });
    }
    req.user = user; // Attach user info to request
    next();
  });
}

// Optional authentication middleware (for routes that work with or without login)
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
      // Continue even if token is invalid or missing
      next();
    });
  } else {
    next();
  }
}

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
    
    const user = rows[0];
    
    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    return res.status(201).json({ 
      token,
      user: {
        id: user.id,
        email: user.email
      }
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
    
    // Create JWT token
    const token = jwt.sign(
      { id: record.id, email: record.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    return res.json({ 
      token,
      user: {
        id: record.id,
        email: record.email
      }
    });
  } catch (err) {
    console.error('POST /api/auth/login failed:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

app.delete('/api/auth/account', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'email and password are required' });
    }
    
    // Find user and verify credentials
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
    
    // Delete the user account
    const info = await db.run(
      `DELETE FROM \`${USER_TABLE}\` WHERE ${EMAIL_COL} = ?`,
      [email.toLowerCase()]
    );
    
    if (info.changes === 0 && !info.affectedRows) {
      return res.status(404).json({ error: 'account not found' });
    }
    
    return res.status(200).json({ 
      message: 'Account deleted successfully',
      email: record.email
    });
  } catch (err) {
    console.error('DELETE /api/auth/account failed:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// --- File Upload/Download ---
// Configure multer for file uploads (store in memory to save to database)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types for MVP
    cb(null, true);
  },
});

// Upload file - requires login
app.post('/api/files/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'no file uploaded' });
    }

    const { classId } = req.body || {};
    const file = req.file;
    const userId = req.user.id;

    // Validate classId if provided
    if (classId !== undefined && classId !== null && classId !== '') {
      const classIdNum = Number(classId);
      if (!Number.isInteger(classIdNum) || classIdNum <= 0) {
        return res.status(400).json({ error: 'invalid classId' });
      }
      
      // Verify class exists
      const classRows = await db.all(
        'SELECT id FROM classes WHERE id = ?',
        [classIdNum]
      );
      
      if (classRows.length === 0) {
        return res.status(400).json({ error: 'class not found' });
      }
    }

    // Store file in image_store table
    const imageResult = await db.run(
      'INSERT INTO image_store (image_name, image_data) VALUES (?, ?)',
      [file.originalname, file.buffer]
    );

    const fileId = imageResult.insertId || imageResult.lastInsertRowid;

    // Get file size in bytes
    const fileSize = file.size.toString();
    const fileType = file.mimetype || 'application/octet-stream';
    const lastUpdated = new Date().toISOString();

    // Store metadata in Note_Files table
    // ownerID = userId, fileID = image_store.id, classId = classes.id (optional)
    const classIdValue = classId && classId !== '' ? classId.toString() : null;
    await db.run(
      'INSERT INTO Note_Files (ownerID, fileID, fileType, size, LastUpdated, classId) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, fileId.toString(), fileType.substring(0, 16), fileSize.substring(0, 16), lastUpdated, classIdValue]
    );

    // Fetch the created file metadata with class info
    const fileRows = await db.all(
      `SELECT 
        i.id,
        i.image_name,
        c.id AS classId,
        c.Subject1 AS subject,
        c.Catalog1 AS catalog,
        c.Long_Title AS classTitle,
        c.CS_Number AS csNumber
      FROM image_store i
      LEFT JOIN Note_Files nf ON CAST(i.id AS CHAR) = nf.fileID
      LEFT JOIN classes c ON nf.classId = CAST(c.id AS CHAR)
      WHERE i.id = ?`,
      [fileId]
    );

    const fileData = fileRows[0] || { id: fileId, image_name: file.originalname };

    return res.status(201).json({
      id: fileId,
      originalName: file.originalname,
      size: file.size,
      fileType: fileType,
      classId: fileData.classId ? Number(fileData.classId) : null,
      class: fileData.classId ? {
        id: Number(fileData.classId),
        subject: fileData.subject,
        catalog: fileData.catalog,
        title: fileData.classTitle,
        csNumber: fileData.csNumber
      } : null,
      uploadedAt: lastUpdated,
    });
  } catch (err) {
    console.error('POST /api/files/upload failed:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// List all files with search and class filtering - open to anyone
app.get('/api/files', async (req, res) => {
  try {
    const { search, classId } = req.query;
    
    // Join image_store with Note_Files and classes using fileID
    let sql = `
      SELECT 
        i.id,
        i.image_name AS originalName,
        COALESCE(nf.size, '0') AS size,
        COALESCE(nf.fileType, 'application/octet-stream') AS fileType,
        COALESCE(nf.LastUpdated, DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s.%fZ')) AS uploadedAt,
        c.id AS classId,
        c.Subject1 AS subject,
        c.Catalog1 AS catalog,
        c.Long_Title AS classTitle,
        c.CS_Number AS csNumber
      FROM image_store i
      LEFT JOIN Note_Files nf ON CAST(i.id AS CHAR) = nf.fileID
      LEFT JOIN classes c ON nf.classId = CAST(c.id AS CHAR)
    `;
    
    const params = [];
    const conditions = [];

    if (search && typeof search === 'string') {
      conditions.push('i.image_name LIKE ?');
      params.push(`%${search}%`);
    }

    if (classId !== undefined && classId !== null && classId !== '') {
      const classIdNum = Number(classId);
      if (Number.isInteger(classIdNum) && classIdNum > 0) {
        conditions.push('c.id = ?');
        params.push(classIdNum);
      }
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY i.id DESC';

    const rows = await db.all(sql, params);

    // Format response with class info
    const formattedRows = rows.map(row => ({
      id: row.id,
      originalName: row.originalName,
      size: row.size,
      fileType: row.fileType,
      uploadedAt: row.uploadedAt,
      class: row.classId ? {
        id: Number(row.classId),
        subject: row.subject,
        catalog: row.catalog,
        title: row.classTitle,
        csNumber: row.csNumber
      } : null
    }));

    return res.json(formattedRows);
  } catch (err) {
    console.error('GET /api/files failed:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// Get list of available classes - open to anyone
app.get('/api/classes', async (req, res) => {
  try {
    const { search, subject } = req.query;
    
    let sql = `
      SELECT 
        id,
        Subject1 AS subject,
        Catalog1 AS catalog,
        Long_Title AS title,
        CS_Number AS csNumber,
        Min_Units AS minUnits,
        Max_Units AS maxUnits,
        Comp_Units AS compUnits
      FROM classes
    `;
    
    const params = [];
    const conditions = [];

    if (search && typeof search === 'string') {
      conditions.push('(Long_Title LIKE ? OR CS_Number LIKE ? OR CONCAT(Subject1, Catalog1) LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (subject && typeof subject === 'string') {
      conditions.push('Subject1 = ?');
      params.push(subject.toUpperCase());
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY Subject1, Catalog1';

    const rows = await db.all(sql, params);

    return res.json(rows);
  } catch (err) {
    console.error('GET /api/classes failed:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// Download file by ID - open to anyone
app.get('/api/files/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid file id' });
    }

    const rows = await db.all(
      'SELECT id, image_name, image_data FROM image_store WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'file not found' });
    }

    const file = rows[0];
    
    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.image_name}"`);
    res.setHeader('Content-Length', file.image_data.length);

    return res.send(file.image_data);
  } catch (err) {
    console.error('GET /api/files/:id failed:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// Delete file - only owner can delete
app.delete('/api/files/:id', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid file id' });
    }

    const userId = req.user.id;

    // Check if file exists
    const fileRows = await db.all(
      'SELECT id FROM image_store WHERE id = ?',
      [id]
    );

    if (fileRows.length === 0) {
      return res.status(404).json({ error: 'file not found' });
    }

    // Check if user is the owner using fileID relationship
    const ownerRows = await db.all(
      'SELECT ownerID FROM Note_Files WHERE fileID = ? AND ownerID = ?',
      [id.toString(), userId]
    );

    if (ownerRows.length === 0) {
      return res.status(403).json({ error: 'not authorized to delete this file' });
    }

    // Delete from both tables
    await db.run('DELETE FROM Note_Files WHERE fileID = ?', [id.toString()]);
    await db.run('DELETE FROM image_store WHERE id = ?', [id]);
    
    // Also delete any bookmarks for this file
    await db.run('DELETE FROM bookmarks WHERE fileId = ?', [id.toString()]);

    return res.status(204).end();
  } catch (err) {
    console.error('DELETE /api/files/:id failed:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// Bookmark a file - logged-in users only
app.post('/api/files/:id/bookmark', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid file id' });
    }

    const userId = req.user.id;

    // Check if file exists
    const fileRows = await db.all(
      'SELECT id FROM image_store WHERE id = ?',
      [id]
    );

    if (fileRows.length === 0) {
      return res.status(404).json({ error: 'file not found' });
    }

    // Check if already bookmarked
    const existingBookmark = await db.all(
      'SELECT id FROM bookmarks WHERE userId = ? AND fileId = ?',
      [userId, id.toString()]
    );

    if (existingBookmark.length > 0) {
      return res.status(409).json({ error: 'file already bookmarked' });
    }

    // Add bookmark
    await db.run(
      'INSERT INTO bookmarks (userId, fileId) VALUES (?, ?)',
      [userId, id.toString()]
    );

    return res.status(201).json({ 
      message: 'File bookmarked successfully',
      fileId: id
    });
  } catch (err) {
    console.error('POST /api/files/:id/bookmark failed:', err);
    // Handle duplicate bookmark error
    if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
      return res.status(409).json({ error: 'file already bookmarked' });
    }
    return res.status(500).json({ error: 'internal server error' });
  }
});

// Get bookmarked files - logged-in users only
app.get('/api/files/bookmarks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all bookmarked files for this user with class info
    const sql = `
      SELECT 
        i.id,
        i.image_name AS originalName,
        COALESCE(nf.size, '0') AS size,
        COALESCE(nf.fileType, 'application/octet-stream') AS fileType,
        COALESCE(nf.LastUpdated, DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s.%fZ')) AS uploadedAt,
        b.createdAt AS bookmarkedAt,
        c.id AS classId,
        c.Subject1 AS subject,
        c.Catalog1 AS catalog,
        c.Long_Title AS classTitle,
        c.CS_Number AS csNumber
      FROM bookmarks b
      INNER JOIN image_store i ON CAST(i.id AS CHAR) = b.fileId
      LEFT JOIN Note_Files nf ON CAST(i.id AS CHAR) = nf.fileID
      LEFT JOIN classes c ON nf.classId = CAST(c.id AS CHAR)
      WHERE b.userId = ?
      ORDER BY b.createdAt DESC
    `;

    const rows = await db.all(sql, [userId]);
    
    // Format response with class info
    const formattedRows = rows.map(row => ({
      id: row.id,
      originalName: row.originalName,
      size: row.size,
      fileType: row.fileType,
      uploadedAt: row.uploadedAt,
      bookmarkedAt: row.bookmarkedAt,
      class: row.classId ? {
        id: Number(row.classId),
        subject: row.subject,
        catalog: row.catalog,
        title: row.classTitle,
        csNumber: row.csNumber
      } : null
    }));

    return res.json(formattedRows);
  } catch (err) {
    console.error('GET /api/files/bookmarks failed:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// Unbookmark a file - logged-in users only
app.delete('/api/files/:id/bookmark', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid file id' });
    }

    const userId = req.user.id;

    // Remove bookmark
    const info = await db.run(
      'DELETE FROM bookmarks WHERE userId = ? AND fileId = ?',
      [userId, id.toString()]
    );

    if (info.changes === 0 && !info.affectedRows) {
      return res.status(404).json({ error: 'bookmark not found' });
    }

    return res.status(204).end();
  } catch (err) {
    console.error('DELETE /api/files/:id/bookmark failed:', err);
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
