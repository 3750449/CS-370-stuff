# StudyLink

A secure file-sharing platform designed for educational institutions, allowing students to upload, share, and organize course materials with class-based filtering and bookmarking capabilities.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Deployment](#deployment)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

StudyLink is a full-stack web application that enables students to:
- Securely register and authenticate with .edu email addresses
- Upload and share course files (PDFs, documents, images, etc.)
- Organize files by class/course
- Bookmark important files for quick access
- Search and filter files by name or class

The application follows a client-server architecture with a React frontend, Express.js backend, and MySQL database.

---

## Features

### Authentication & User Management
- ✅ **User Registration**: .edu email validation, password hashing with bcrypt
- ✅ **User Login**: JWT-based authentication with 7-day token expiration
- ✅ **Account Deletion**: Secure account removal with password verification
- ✅ **Password Security**: Minimum 8 characters, bcrypt hashing (10 rounds)

### File Management
- ✅ **File Upload**: Secure file uploads (up to 50MB) with class association
- ✅ **File Download**: Public file access with proper headers
- ✅ **File List**: Search and filter files by name or class
- ✅ **File Deletion**: Owner-only file deletion with authorization checks

### Class Organization
- ✅ **Class Filtering**: Filter files by class
- ✅ **Class Search**: Search available classes by name, CS number, or subject
- ✅ **Class Association**: Link files to specific classes during upload

### Bookmarks
- ✅ **Bookmark Files**: Save files for quick access
- ✅ **Bookmark List**: View all bookmarked files
- ✅ **Unbookmark**: Remove files from bookmarks

### Legacy Features
- ✅ **Notes System**: Text-based notes with class filtering (legacy feature)

---

## Architecture

### System Architecture

```
┌─────────────────┐
│   Frontend      │  React + TypeScript + Vite
│   (React SPA)   │  Bootstrap + React Bootstrap
└────────┬────────┘
         │ HTTP/REST API
         ↓
┌─────────────────┐
│   Backend       │  Express.js + Node.js
│   (REST API)    │  JWT Authentication
└────────┬────────┘
         │ SQL Queries
         ↓
┌─────────────────┐
│   Database      │  MySQL
│   (Data Store)  │  Connection Pooling
└─────────────────┘
```

### Component Layers

1. **Frontend Layer** (`studylink-frontend/`)
   - React components for UI
   - TypeScript for type safety
   - Vite for build tooling
   - Bootstrap for styling

2. **Backend Layer** (`server.js`)
   - Express.js REST API
   - JWT authentication middleware
   - File upload handling (multer)
   - Database abstraction layer

3. **Database Layer** (`db.mysql.js`)
   - MySQL connection pooling
   - Query abstraction
   - Automatic table initialization

---

## Technology Stack

### Backend
- **Runtime**: Node.js v24.10.0
- **Framework**: Express.js v5.1.0
- **Database**: MySQL v8.0+ (via mysql2)
- **Authentication**: JWT (jsonwebtoken)
- **File Upload**: Multer v2.0.2
- **Password Hashing**: bcryptjs v2.4.3

### Frontend
- **Framework**: React v19.1.1
- **Language**: TypeScript v5.8.3
- **Build Tool**: Vite v7.1.2
- **UI Library**: React Bootstrap v2.10.10
- **Styling**: Bootstrap v5.3.8

### Development Tools
- **Testing**: Jest v30.2.0, Supertest v7.1.4
- **Linting**: ESLint v9.33.0
- **Type Checking**: TypeScript

---

## Quick Start

### Prerequisites

- Node.js v18+ installed
- MySQL v8.0+ installed and running
- Git installed

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/3750449/CS-370-stuff.git
   cd CS-370-stuff/studylink-Folder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` with your actual values:
   ```env
   PORT=8199
   JWT_SECRET=your-secret-key-here
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=your_username
   MYSQL_PASSWORD=your_password
   MYSQL_DATABASE=studylink_db
   ```
   
   **Important**: Generate a secure JWT_SECRET:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

4. **Set up database**
   ```sql
   CREATE DATABASE studylink_db;
   ```
   Tables are created automatically on first run.

5. **Build frontend** (optional - for production)
   ```bash
   cd studylink-frontend
   npm install
   npm run build
   cd ..
   ```

6. **Start the server**
   ```bash
   npm start
   ```

7. **Verify installation**
   ```bash
   curl http://localhost:8199/api/health
   ```

The API will be available at `http://localhost:8199` and the frontend at `http://localhost:8199`.

---

## API Documentation

### Base URL
- **Development**: `http://localhost:8199`
- **API Prefix**: `/api`

### Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Endpoints

#### Health Check
- `GET /api/health` - Service health status

#### Authentication
- `POST /api/auth/register` - Register new user (.edu email required)
- `POST /api/auth/login` - Authenticate user
- `DELETE /api/auth/account` - Delete user account

#### Files
- `POST /api/files/upload` - Upload file (requires authentication)
- `GET /api/files` - List all files (public, supports search & classId filter)
- `GET /api/files/:id` - Download file by ID (public)
- `DELETE /api/files/:id` - Delete file (owner only, requires authentication)

#### Classes
- `GET /api/classes` - List available classes (public, supports search & subject filter)

#### Bookmarks
- `POST /api/files/:id/bookmark` - Bookmark a file (requires authentication)
- `GET /api/files/bookmarks` - Get user's bookmarks (requires authentication)
- `DELETE /api/files/:id/bookmark` - Unbookmark a file (requires authentication)

#### Notes (Legacy)
- `GET /api/notes` - List notes (optional course filter)
- `POST /api/notes` - Create note
- `DELETE /api/notes/:id` - Delete note

### Detailed API Documentation

See [FRONTEND_INTEGRATION.md](studylink-Folder/FRONTEND_INTEGRATION.md) for complete API documentation with request/response examples.

---

## Development

### Project Structure

```
studylink-Folder/
├── server.js              # Express.js API server
├── db.mysql.js            # MySQL database connection
├── package.json            # Backend dependencies
├── .env                    # Environment variables (not in git)
├── studylink-frontend/     # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── package.json       # Frontend dependencies
│   └── vite.config.ts     # Vite configuration
├── FRONTEND_INTEGRATION.md # Frontend API guide
├── TESTING_GUIDE.md       # Testing documentation
└── DEPLOYMENT_GUIDE.md    # Deployment instructions
```

### Development Workflow

1. **Start backend server**
   ```bash
   npm start
   ```

2. **Start frontend dev server** (in separate terminal)
   ```bash
   cd studylink-frontend
   npm run dev
   ```

3. **Make changes**
   - Backend changes require server restart
   - Frontend changes hot-reload automatically

### Code Style

- Follow existing code patterns
- Use JSDoc comments for functions
- Follow ESLint rules
- See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines

### Testing

See [TESTING_GUIDE.md](studylink-Folder/TESTING_GUIDE.md) for comprehensive testing instructions.

Quick test:
```bash
# Health check
curl http://localhost:8199/api/health

# Register user
curl -X POST http://localhost:8199/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@school.edu", "password": "password123"}'
```

---

## Deployment

For production deployment instructions, see [DEPLOYMENT_GUIDE.md](studylink-Folder/DEPLOYMENT_GUIDE.md).

### Quick Production Setup

1. **Set environment variables** (production values)
2. **Build frontend**: `cd studylink-frontend && npm run build`
3. **Use PM2**: `pm2 start server.js --name studylink`
4. **Enable HTTPS** (recommended)
5. **Set up monitoring** and backups

---

## Security

### Security Features

- ✅ **Password Hashing**: bcrypt with 10 rounds
- ✅ **JWT Authentication**: Secure token-based sessions
- ✅ **.edu Email Validation**: Restricts registration to educational institutions
- ✅ **SQL Injection Prevention**: Parameterized queries
- ✅ **File Size Limits**: 50MB maximum per file
- ✅ **CORS Configuration**: Configurable cross-origin policies
- ✅ **Input Validation**: Server-side validation for all inputs

### Security Best Practices

1. **Never commit `.env` file** to version control
2. **Use strong JWT_SECRET** in production
3. **Enable HTTPS** in production
4. **Regular security updates** for dependencies
5. **Database backups** on regular schedule
6. **Monitor logs** for suspicious activity

### Known Limitations

- File uploads stored in database (consider file system or cloud storage for scale)
- No rate limiting implemented (consider adding for production)
- No file type validation (accepts all file types)

---

## Database Schema

### Key Tables

- **User**: User accounts with email and password hash
- **image_store**: File binary data (BLOBs)
- **Note_Files**: File metadata (owner, type, size, classId)
- **bookmarks**: User bookmarks (userId, fileId)
- **classes**: Class/course information
- **notes**: Text notes (legacy feature)

See database schema documentation for complete table structures.

---

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## Team

- **Desmond Farley-Williams**
- **Jonas Setzer**
- **Emilio Orozco**
- **Lynn Khaing**

---

## Support

For issues, questions, or contributions:
- Check [TESTING_GUIDE.md](studylink-Folder/TESTING_GUIDE.md) for troubleshooting
- Review [FRONTEND_INTEGRATION.md](studylink-Folder/FRONTEND_INTEGRATION.md) for API details
- See [DEPLOYMENT_GUIDE.md](studylink-Folder/DEPLOYMENT_GUIDE.md) for deployment help

---

## Changelog

### v1.0.0 (Current)
- Initial MVP release
- JWT authentication
- File upload/download
- Class filtering
- Bookmark functionality
- Password confirmation on registration

---

## Roadmap

### Future Features
- Password reset via email
- File type validation
- Rate limiting
- File versioning
- Comments on files
- Voting system
- User profiles
- Advanced search
- File sharing permissions

---

## Acknowledgments

Built with:
- Express.js
- React
- MySQL
- JWT
- Multer
- Bootstrap
