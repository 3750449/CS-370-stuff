const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
require('dotenv').config();

// Use MySQL database (production) - DO NOT use db.js (SQLite)
let db;
try {
  // Explicitly require MySQL database module
  const dbPath = path.join(__dirname, 'db.mysql.js');
  db = require(dbPath);
  console.log('✅ Loaded MySQL database module');
} catch (err) {
  console.error('❌ ERROR: Failed to load MySQL database module');
  console.error('   Error:', err.message);
  console.error('   Make sure db.mysql.js exists and MySQL environment variables are set');
  console.error('   Required env vars: MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE');
  console.error('   Current working directory:', __dirname);
  console.error('   Attempted path:', path.join(__dirname, 'db.mysql.js'));
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 8199;
const distDir = path.join(__dirname, 'studylink-frontend', 'dist');

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased for file uploads
app.use(express.static(distDir));

// JWT configuration
if (!process.env.JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET environment variable is required');
  console.error('   Please set JWT_SECRET in your .env file');
  console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d'; // 7 days

// Guards protected routes by requiring a valid bearer token.
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

// User table configuration
const USER_TABLE = 'User';
const EMAIL_COL = 'email'; // email is now the primary key
const PASSWORD_COL = 'passwordhash';

/**
 * Health check endpoint to verify API and database connectivity.
 * 
 * Returns basic service information including database driver and current timestamp.
 * Useful for monitoring, load balancers, and deployment verification.
 * 
 * @route GET /api/health
 * @access Public
 * @returns {Object} 200 - Service health status
 * @returns {boolean} 200.ok - Service is running
 * @returns {string} 200.service - Service name
 * @returns {string} 200.driver - Database driver in use
 * @returns {string} 200.timestamp - Current ISO timestamp
 * 
 * @example
 * // Response
 * {
 *   "ok": true,
 *   "service": "studylink-api",
 *   "driver": "mysql",
 *   "timestamp": "2024-01-15T10:30:00.000Z"
 * }
 * 
 * @since 1.0.0
 */
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'studylink-api',
    driver: 'mysql',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Validates that an email address is a valid .edu email address.
 * 
 * Checks both basic email format and ensures the domain ends with .edu.
 * Used for user registration to restrict access to educational institutions.
 * 
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email is valid and ends with .edu, false otherwise
 * 
 * @example
 * isEduEmail('student@university.edu'); // true
 * isEduEmail('user@gmail.com'); // false
 * isEduEmail('invalid-email'); // false
 * 
 * @since 1.0.0
 */
function isEduEmail(email) {
  const basicPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!basicPattern.test(email)) return false;
  return /\.edu$/i.test(email);
}

/**
 * Register a new user account with .edu email validation.
 * 
 * Creates a new user account after validating email format (.edu only),
 * password requirements (minimum 8 characters), and checking for duplicates.
 * Password is hashed using bcrypt before storage. Returns JWT token for immediate authentication.
 * 
 * @route POST /api/auth/register
 * @access Public
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's .edu email address
 * @param {string} req.body.password - User's password (minimum 8 characters)
 * @returns {Object} 201 - User created successfully
 * @returns {string} 201.token - JWT authentication token
 * @returns {Object} 201.user - User information
 * @returns {string} 201.user.id - User ID (email address)
 * @returns {string} 201.user.email - User's email address
 * @returns {Object} 400 - Invalid input (email format, password length)
 * @returns {Object} 409 - Account already exists
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * // Request
 * POST /api/auth/register
 * {
 *   "email": "student@university.edu",
 *   "password": "password123"
 * }
 * 
 * // Response (201)
 * {
 *   "token": "eyJhbGc...",
 *   "user": {
 *     "id": "student@univer",
 *     "email": "student@university.edu"
 *   }
 * }
 * 
 * @since 1.0.0
 */
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
      `SELECT ${EMAIL_COL} FROM \`${USER_TABLE}\` WHERE ${EMAIL_COL} = ?`,
      [email.toLowerCase()]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'account already exists' });
    }
    
    // Hash password and insert into User table
    const passwordHash = await bcrypt.hash(password, 10);
    
    await db.run(
      `INSERT INTO \`${USER_TABLE}\` (${EMAIL_COL}, ${PASSWORD_COL}) VALUES (?, ?)`,
      [email.toLowerCase(), passwordHash]
    );
    
    // Fetch the created user
    const rows = await db.all(
      `SELECT ${EMAIL_COL} AS email FROM \`${USER_TABLE}\` WHERE ${EMAIL_COL} = ?`,
      [email.toLowerCase()]
    );
    
    const user = rows[0];
    const userEmail = user.email;
    
    // Create JWT token (email is now the id)
    const token = jwt.sign(
      { id: userEmail, email: userEmail },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    return res.status(201).json({ 
      token,
      user: {
        id: userEmail,
        email: userEmail
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

/**
 * Authenticate an existing user and return JWT token.
 * 
 * Validates user credentials by comparing provided password with stored bcrypt hash.
 * Returns JWT token for authenticated session management. Token expires in 7 days.
 * 
 * @route POST /api/auth/login
 * @access Public
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password
 * @returns {Object} 200 - Login successful
 * @returns {string} 200.token - JWT authentication token (expires in 7 days)
 * @returns {Object} 200.user - User information
 * @returns {string} 200.user.id - User ID
 * @returns {string} 200.user.email - User's email address
 * @returns {Object} 400 - Missing email or password
 * @returns {Object} 401 - Invalid credentials (wrong email or password)
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * // Request
 * POST /api/auth/login
 * {
 *   "email": "student@university.edu",
 *   "password": "password123"
 * }
 * 
 * // Response (200)
 * {
 *   "token": "eyJhbGc...",
 *   "user": {
 *     "id": "student@univer",
 *     "email": "student@university.edu"
 *   }
 * }
 * 
 * @since 1.0.0
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'email and password are required' });
    }
    
    // Find user in User table
    const rows = await db.all(
      `SELECT ${EMAIL_COL} AS email, ${PASSWORD_COL} AS passwordHash FROM \`${USER_TABLE}\` WHERE ${EMAIL_COL} = ?`,
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
    
    // Create JWT token (email is now the id)
    const userEmail = record.email;
    const token = jwt.sign(
      { id: userEmail, email: userEmail },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    return res.json({ 
      token,
      user: {
        id: userEmail,
        email: userEmail
      }
    });
  } catch (err) {
    console.error('POST /api/auth/login failed:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

/**
 * Delete a user account after verifying credentials.
 * 
 * Permanently deletes user account from the database. Requires email and password
 * verification for security. This action cannot be undone.
 * 
 * @route DELETE /api/auth/account
 * @access Public (requires email + password verification)
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password for verification
 * @returns {Object} 200 - Account deleted successfully
 * @returns {string} 200.message - Success message
 * @returns {string} 200.email - Deleted user's email
 * @returns {Object} 400 - Missing email or password
 * @returns {Object} 401 - Invalid credentials
 * @returns {Object} 404 - Account not found
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * // Request
 * DELETE /api/auth/account
 * {
 *   "email": "student@university.edu",
 *   "password": "password123"
 * }
 * 
 * // Response (200)
 * {
 *   "message": "Account deleted successfully",
 *   "email": "student@university.edu"
 * }
 * 
 * @since 1.0.0
 */
app.delete('/api/auth/account', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'email and password are required' });
    }
    
    // Find user and verify credentials
    const rows = await db.all(
      `SELECT ${EMAIL_COL} AS email, ${PASSWORD_COL} AS passwordHash FROM \`${USER_TABLE}\` WHERE ${EMAIL_COL} = ?`,
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

/**
 * Change password for authenticated user.
 * 
 * Allows logged-in users to change their password by providing their current password
 * and a new password. Requires JWT authentication and current password verification.
 * 
 * @route PUT /api/auth/password
 * @access Private (requires JWT token)
 * @param {Object} req.user - User information from JWT (set by authenticateToken middleware)
 * @param {string} req.user.id - User ID (email address)
 * @param {Object} req.body - Request body
 * @param {string} req.body.currentPassword - User's current password for verification
 * @param {string} req.body.newPassword - New password (minimum 8 characters)
 * @returns {Object} 200 - Password changed successfully
 * @returns {string} 200.message - Success message
 * @returns {Object} 400 - Missing current password or new password, or password too short
 * @returns {Object} 401 - Not authenticated or invalid current password
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * // Request
 * PUT /api/auth/password
 * Headers: { "Authorization": "Bearer <token>" }
 * {
 *   "currentPassword": "oldpassword123",
 *   "newPassword": "newpassword456"
 * }
 * 
 * // Response (200)
 * {
 *   "message": "Password changed successfully"
 * }
 * 
 * @since 1.0.0
 */
app.put('/api/auth/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'current password and new password are required' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'new password must be at least 8 characters' });
    }
    
    const userId = req.user.id; // email address
    
    // Find user and verify current password
    const rows = await db.all(
      `SELECT ${EMAIL_COL} AS email, ${PASSWORD_COL} AS passwordHash FROM \`${USER_TABLE}\` WHERE ${EMAIL_COL} = ?`,
      [userId]
    );
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'user not found' });
    }
    
    const record = rows[0];
    const ok = await bcrypt.compare(currentPassword, record.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'invalid current password' });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Update user password
    await db.run(
      `UPDATE \`${USER_TABLE}\` SET ${PASSWORD_COL} = ? WHERE ${EMAIL_COL} = ?`,
      [newPasswordHash, userId]
    );
    
    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('PUT /api/auth/password failed:', err);
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

/**
 * Upload a file to the system with optional class association.
 * 
 * Accepts file uploads via multipart/form-data. Files are stored in the database
 * as BLOBs in the image_store table. Metadata is stored in Note_Files table.
 * Maximum file size is 50MB. Requires JWT authentication.
 * 
 * @route POST /api/files/upload
 * @access Private (requires JWT token)
 * @param {Object} req.user - User information from JWT (set by authenticateToken middleware)
 * @param {string} req.user.id - User ID of the uploader
 * @param {Object} req.file - Uploaded file object (from multer)
 * @param {string} req.file.originalname - Original filename
 * @param {Buffer} req.file.buffer - File content as buffer
 * @param {number} req.file.size - File size in bytes
 * @param {string} req.file.mimetype - MIME type of the file
 * @param {Object} req.body - Form data
 * @param {string} [req.body.classId] - Optional class ID to associate file with
 * @returns {Object} 201 - File uploaded successfully
 * @returns {number} 201.id - File ID in database
 * @returns {string} 201.originalName - Original filename
 * @returns {number} 201.size - File size in bytes
 * @returns {string} 201.fileType - MIME type of the file
 * @returns {number|null} 201.classId - Associated class ID (if provided)
 * @returns {Object|null} 201.class - Class information (if classId provided)
 * @returns {string} 201.uploadedAt - ISO timestamp of upload
 * @returns {Object} 400 - No file uploaded, invalid classId, or class not found
 * @returns {Object} 401 - Not authenticated
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * // Request (multipart/form-data)
 * POST /api/files/upload
 * Headers: { "Authorization": "Bearer <token>" }
 * Form Data:
 *   - file: <file binary>
 *   - classId: "123" (optional)
 * 
 * // Response (201)
 * {
 *   "id": 456,
 *   "originalName": "assignment.pdf",
 *   "size": 524288,
 *   "fileType": "application/pdf",
 *   "classId": 123,
 *   "class": {
 *     "id": 123,
 *     "subject": "CS",
 *     "catalog": "370",
 *     "title": "Software Engineering",
 *     "csNumber": "CS370"
 *   },
 *   "uploadedAt": "2024-01-15T10:30:00.000Z"
 * }
 * 
 * @since 1.0.0
 */
app.post('/api/files/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'no file uploaded' });
    }

    const { classId, fileName } = req.body || {};
    const file = req.file;
    const userId = req.user.id;

    // Use custom filename if provided, otherwise use original filename
    const displayName = (fileName && fileName.trim()) ? fileName.trim() : file.originalname;

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

    // Store file in image_store table (use displayName for image_name)
    const imageResult = await db.run(
      'INSERT INTO image_store (image_name, image_data) VALUES (?, ?)',
      [displayName, file.buffer]
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
      LEFT JOIN classes c ON nf.classId COLLATE utf8mb4_unicode_ci = CAST(c.id AS CHAR) COLLATE utf8mb4_unicode_ci
      WHERE i.id = ?`,
      [fileId]
    );

    const fileData = fileRows[0] || { id: fileId, image_name: displayName };

    return res.status(201).json({
      id: fileId,
      originalName: displayName,
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
    console.error('Error details:', err.message, err.code, err.sqlMessage);
    return res.status(500).json({ 
      error: 'internal server error',
      details: err.message || err.sqlMessage || 'Unknown error'
    });
  }
});

/**
 * List all uploaded files with optional search and class filtering.
 * 
 * Returns a paginated list of all files in the system. Supports searching by filename
 * and filtering by class ID. This endpoint is publicly accessible (no authentication required).
 * Files are returned with their metadata including class information if associated.
 * 
 * @route GET /api/files
 * @access Public
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.search] - Search term to filter files by filename (case-insensitive partial match)
 * @param {string} [req.query.classId] - Filter files by class ID (must be valid integer)
 * @returns {Array<Object>} 200 - Array of file objects
 * @returns {number} 200[].id - File ID
 * @returns {string} 200[].originalName - Original filename
 * @returns {string} 200[].size - File size as string
 * @returns {string} 200[].fileType - MIME type
 * @returns {string} 200[].uploadedAt - ISO timestamp of upload
 * @returns {Object|null} 200[].class - Class information if file is associated with a class
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * // Request
 * GET /api/files?search=assignment&classId=123
 * 
 * // Response (200)
 * [
 *   {
 *     "id": 456,
 *     "originalName": "assignment1.pdf",
 *     "size": "524288",
 *     "fileType": "application/pdf",
 *     "uploadedAt": "2024-01-15T10:30:00.000Z",
 *     "class": {
 *       "id": 123,
 *       "subject": "CS",
 *       "catalog": "370",
 *       "title": "Software Engineering",
 *       "csNumber": "CS370"
 *     }
 *   }
 * ]
 * 
 * @since 1.0.0
 */
app.get('/api/files', async (req, res) => {
  try {
    const { search, classId } = req.query;
    
    // Join image_store with Note_Files and classes using fileID
    const hasClassFilter = classId !== undefined && classId !== null && classId !== '';
    let classIds = [];
    
    if (hasClassFilter) {
      // Support both single classId and comma-separated multiple classIds
      classIds = Array.isArray(classId) 
        ? classId 
        : typeof classId === 'string' 
          ? classId.split(',').map(id => id.trim()).filter(id => id)
          : [classId.toString()];
    }
    
    // "no-class" is a sentinel ID coming from the UI – keep track so we can include uploads without associations.
    const hasNoClassFilter = classIds.some(id => String(id).toLowerCase() === 'no-class');
    const numericClassIds = classIds
      .filter(id => String(id).toLowerCase() !== 'no-class')
      .map(id => Number(id))
      .filter(id => Number.isInteger(id) && id > 0);
    
    // INNER JOIN is only safe when every requested class ID exists; once "no-class" is requested
    // we must keep the LEFT JOIN so uploads without class metadata stay visible.
    const useInnerJoinForClass = hasClassFilter && numericClassIds.length > 0 && !hasNoClassFilter;
    
    let sql = `
      SELECT 
        i.id,
        i.image_name AS originalName,
        COALESCE(nf.size, '0') AS size,
        COALESCE(nf.fileType, 'application/octet-stream') AS fileType,
        COALESCE(nf.LastUpdated, DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s.%fZ')) AS uploadedAt,
        nf.ownerID AS ownerId,
        c.id AS classId,
        c.Subject1 AS subject,
        c.Catalog1 AS catalog,
        c.Long_Title AS classTitle,
        c.CS_Number AS csNumber
      FROM image_store i
      INNER JOIN Note_Files nf ON CAST(i.id AS CHAR) = nf.fileID
      ${useInnerJoinForClass ? 'INNER' : 'LEFT'} JOIN classes c ON nf.classId = CAST(c.id AS CHAR)
    `;
    
    const params = [];
    const conditions = [];

    if (search && typeof search === 'string') {
      const normalizedSearch = search.trim().toLowerCase();
      if (normalizedSearch) {
        const searchLike = `%${normalizedSearch}%`;
        // Support both "AMCS 301" and "amcs301" style inputs.
        const compactSearch = normalizedSearch.replace(/\s+/g, '');
        const compactLike = `%${compactSearch}%`;
        const searchClauses = [
          'LOWER(i.image_name) LIKE ?',
          'LOWER(COALESCE(nf.fileType, "")) LIKE ?',
          'LOWER(COALESCE(c.Subject1, "")) LIKE ?',
          'LOWER(COALESCE(c.Catalog1, "")) LIKE ?',
          'LOWER(COALESCE(c.Long_Title, "")) LIKE ?',
          'LOWER(CONCAT_WS(" ", COALESCE(c.Subject1, ""), COALESCE(c.Catalog1, ""))) LIKE ?'
        ];

        searchClauses.forEach(() => params.push(searchLike));

        if (compactSearch) {
          searchClauses.push(`LOWER(REPLACE(CONCAT(COALESCE(c.Subject1, ''), COALESCE(c.Catalog1, '')), ' ', '')) LIKE ?`);
          params.push(compactLike);
        }

        conditions.push(`(${searchClauses.join(' OR ')})`);
      }
    }

    if (hasClassFilter && (hasNoClassFilter || numericClassIds.length > 0)) {
      const classConditions = [];
      
      // Add filter for files with no class association
      if (hasNoClassFilter) {
        classConditions.push('(c.id IS NULL OR nf.classId IS NULL OR nf.classId = "")');
      }
      
      // Add filter for files with specific class IDs
      if (numericClassIds.length > 0) {
        if (numericClassIds.length === 1) {
          classConditions.push('c.id = ?');
          params.push(numericClassIds[0]);
        } else {
          const placeholders = numericClassIds.map(() => '?').join(',');
          classConditions.push(`c.id IN (${placeholders})`);
          params.push(...numericClassIds);
        }
      }
      
      if (classConditions.length > 0) {
        conditions.push(`(${classConditions.join(' OR ')})`);
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
      ownerId: row.ownerId || null,
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

/**
 * Get list of available classes with optional search and subject filtering.
 * 
 * Returns all classes from the classes table. Supports searching by class name,
 * CS number, or subject+catalog combination. Also supports filtering by subject code.
 * This endpoint is publicly accessible.
 * 
 * @route GET /api/classes
 * @access Public
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.search] - Search term to filter classes by name, CS number, or subject+catalog
 * @param {string} [req.query.subject] - Filter classes by subject code (e.g., "CS", "MATH")
 * @returns {Array<Object>} 200 - Array of class objects
 * @returns {number} 200[].id - Class ID
 * @returns {string} 200[].subject - Subject code (e.g., "CS")
 * @returns {string} 200[].catalog - Catalog number (e.g., "370")
 * @returns {string} 200[].title - Full class title
 * @returns {string} 200[].csNumber - CS course number
 * @returns {number} 200[].minUnits - Minimum units
 * @returns {number} 200[].maxUnits - Maximum units
 * @returns {number} 200[].compUnits - Completion units
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * // Request
 * GET /api/classes?search=CS370&subject=CS
 * 
 * // Response (200)
 * [
 *   {
 *     "id": 123,
 *     "subject": "CS",
 *     "catalog": "370",
 *     "title": "Software Engineering",
 *     "csNumber": "CS370",
 *     "minUnits": 3.0,
 *     "maxUnits": 3.0,
 *     "compUnits": 3.0
 *   }
 * ]
 * 
 * @since 1.0.0
 */
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

app.get('/api/files/bookmarks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

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
      LEFT JOIN classes c ON nf.classId COLLATE utf8mb4_unicode_ci = CAST(c.id AS CHAR) COLLATE utf8mb4_unicode_ci
      WHERE b.userId = ?
      ORDER BY b.createdAt DESC
    `;

    const rows = await db.all(sql, [userId]);

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

/**
 * Get all files uploaded by the authenticated user.
 * 
 * Returns a list of all files uploaded by the current user. Requires JWT authentication.
 * Files are returned with their metadata including class information if associated.
 * 
 * @route GET /api/files/my-uploads
 * @access Private (requires JWT token)
 * @returns {Array<Object>} 200 - Array of file objects
 * @returns {number} 200[].id - File ID
 * @returns {string} 200[].originalName - Original filename
 * @returns {string} 200[].size - File size as string
 * @returns {string} 200[].fileType - MIME type
 * @returns {string} 200[].uploadedAt - ISO timestamp of upload
 * @returns {Object|null} 200[].class - Class information if file is associated with a class
 * @returns {Object} 401 - Not authenticated
 * @returns {Object} 500 - Internal server error
 */
app.get('/api/files/my-uploads', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT 
        i.id,
        i.image_name AS originalName,
        COALESCE(nf.size, '0') AS size,
        COALESCE(nf.fileType, 'application/octet-stream') AS fileType,
        COALESCE(nf.LastUpdated, DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s.%fZ')) AS uploadedAt,
        nf.ownerID AS ownerId,
        c.id AS classId,
        c.Subject1 AS subject,
        c.Catalog1 AS catalog,
        c.Long_Title AS classTitle,
        c.CS_Number AS csNumber
      FROM image_store i
      INNER JOIN Note_Files nf ON CAST(i.id AS CHAR) = nf.fileID
      LEFT JOIN classes c ON nf.classId COLLATE utf8mb4_unicode_ci = CAST(c.id AS CHAR) COLLATE utf8mb4_unicode_ci
      WHERE nf.ownerID = ?
      ORDER BY nf.LastUpdated DESC
    `;

    const rows = await db.all(sql, [userId]);

    const formattedRows = rows.map(row => ({
      id: row.id,
      originalName: row.originalName,
      size: row.size,
      fileType: row.fileType,
      uploadedAt: row.uploadedAt,
      ownerId: row.ownerId || null,
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
    console.error('GET /api/files/my-uploads failed:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

/**
 * Download a file by its ID.
 * 
 * Retrieves file binary data from the database and streams it to the client
 * with appropriate headers for file download. This endpoint is publicly accessible.
 * 
 * @route GET /api/files/:id
 * @access Public
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - File ID (must be positive integer)
 * @returns {Buffer} 200 - File binary data
 * @returns {Object} 400 - Invalid file ID format
 * @returns {Object} 404 - File not found
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * // Request
 * GET /api/files/456
 * 
 * // Response Headers
 * Content-Type: application/octet-stream
 * Content-Disposition: attachment; filename="assignment.pdf"
 * Content-Length: 524288
 * 
 * // Response Body: Binary file data
 * 
 * @since 1.0.0
 */
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

/**
 * Get file preview (for inline display, not download).
 * 
 * Similar to GET /api/files/:id but without Content-Disposition: attachment header,
 * allowing files to be displayed inline in browsers (e.g., PDFs in iframes, images in img tags).
 * 
 * @route GET /api/files/:id/preview
 * @access Public
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - File ID (must be positive integer)
 * @returns {Buffer} 200 - File binary data with inline disposition
 * @returns {Object} 400 - Invalid file ID format
 * @returns {Object} 404 - File not found
 * @returns {Object} 500 - Internal server error
 * 
 * @since 1.0.0
 */
app.get('/api/files/:id/preview', async (req, res) => {
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
    
    // Get file type from Note_Files if available
    const fileMetaRows = await db.all(
      'SELECT fileType FROM Note_Files WHERE fileID = ?',
      [id.toString()]
    );
    const fileType = fileMetaRows.length > 0 && fileMetaRows[0].fileType 
      ? fileMetaRows[0].fileType 
      : 'application/octet-stream';
    
    // Set headers for inline display (no attachment header)
    res.setHeader('Content-Type', fileType);
    res.setHeader('Content-Length', file.image_data.length);
    // No Content-Disposition header = inline display

    return res.send(file.image_data);
  } catch (err) {
    console.error('GET /api/files/:id/preview failed:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

/**
 * Delete a file from the system (only file owner can delete).
 * 
 * Permanently removes a file from both image_store and Note_Files tables.
 * Also removes all bookmarks associated with the file. Only the file owner
 * (user who uploaded it) can delete the file. Requires JWT authentication.
 * 
 * @route DELETE /api/files/:id
 * @access Private (requires JWT token, owner only)
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - File ID (must be positive integer)
 * @param {Object} req.user - User information from JWT
 * @param {string} req.user.id - User ID (must match file owner)
 * @returns {void} 204 - File deleted successfully (no content)
 * @returns {Object} 400 - Invalid file ID format
 * @returns {Object} 401 - Not authenticated
 * @returns {Object} 403 - Not authorized (not the file owner)
 * @returns {Object} 404 - File not found
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * // Request
 * DELETE /api/files/456
 * Headers: { "Authorization": "Bearer <token>" }
 * 
 * // Response (204 No Content)
 * 
 * @since 1.0.0
 */
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

/**
 * Bookmark a file for the authenticated user.
 * 
 * Adds a file to the user's bookmarks list. Each user can bookmark a file only once.
 * Requires JWT authentication. Returns error if file is already bookmarked.
 * 
 * @route POST /api/files/:id/bookmark
 * @access Private (requires JWT token)
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - File ID to bookmark (must be positive integer)
 * @param {Object} req.user - User information from JWT
 * @param {string} req.user.id - User ID
 * @returns {Object} 201 - File bookmarked successfully
 * @returns {string} 201.message - Success message
 * @returns {number} 201.fileId - Bookmarked file ID
 * @returns {Object} 400 - Invalid file ID format
 * @returns {Object} 401 - Not authenticated
 * @returns {Object} 404 - File not found
 * @returns {Object} 409 - File already bookmarked
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * // Request
 * POST /api/files/456/bookmark
 * Headers: { "Authorization": "Bearer <token>" }
 * 
 * // Response (201)
 * {
 *   "message": "File bookmarked successfully",
 *   "fileId": 456
 * }
 * 
 * @since 1.0.0
 */
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

/**
 * Remove a file from the user's bookmarks.
 * 
 * Removes a bookmark association between the authenticated user and a file.
 * Requires JWT authentication. Returns 404 if bookmark doesn't exist.
 * 
 * @route DELETE /api/files/:id/bookmark
 * @access Private (requires JWT token)
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - File ID to unbookmark (must be positive integer)
 * @param {Object} req.user - User information from JWT
 * @param {string} req.user.id - User ID
 * @returns {void} 204 - Bookmark removed successfully (no content)
 * @returns {Object} 400 - Invalid file ID format
 * @returns {Object} 401 - Not authenticated
 * @returns {Object} 404 - Bookmark not found
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * // Request
 * DELETE /api/files/456/bookmark
 * Headers: { "Authorization": "Bearer <token>" }
 * 
 * // Response (204 No Content)
 * 
 * @since 1.0.0
 */
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

/**
 * List all notes with optional course filtering.
 * 
 * Returns all notes from the notes table. Supports optional filtering by course.
 * Results are ordered by ID in descending order (newest first). This endpoint is publicly accessible.
 * 
 * @route GET /api/notes
 * @access Public
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.course] - Filter notes by course code
 * @returns {Array<Object>} 200 - Array of note objects
 * @returns {number} 200[].id - Note ID
 * @returns {string} 200[].title - Note title
 * @returns {string} 200[].course - Course code
 * @returns {string} 200[].content - Note content
 * @returns {string} 200[].createdAt - ISO timestamp of creation
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * // Request
 * GET /api/notes?course=CS370
 * 
 * // Response (200)
 * [
 *   {
 *     "id": 1,
 *     "title": "Lecture Notes",
 *     "course": "CS370",
 *     "content": "Note content...",
 *     "createdAt": "2024-01-15T10:30:00.000Z"
 *   }
 * ]
 * 
 * @since 1.0.0
 */
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
    return res.status(500).json({ error: 'internal server error' });
  }
});
/**
 * Delete a note by its ID.
 * 
 * Permanently removes a note from the notes table. This action cannot be undone.
 * This endpoint is publicly accessible.
 * 
 * @route DELETE /api/notes/:id
 * @access Public
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Note ID (must be positive integer)
 * @returns {void} 204 - Note deleted successfully (no content)
 * @returns {Object} 400 - Invalid note ID format
 * @returns {Object} 404 - Note not found
 * @returns {Object} 500 - Internal server error
 * 
 * @example
 * // Request
 * DELETE /api/notes/1
 * 
 * // Response (204 No Content)
 * 
 * @since 1.0.0
 */
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
