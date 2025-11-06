# Frontend Integration Guide

## Overview
This document provides all the information needed to integrate the frontend with the StudyLink backend API.

## Base URL
- **Development**: `http://localhost:8199`
- **API Base**: `/api`

---

## Authentication (JWT)

### How It Works
1. User logs in/registers → Backend returns JWT token
2. Store token in `localStorage` or React state
3. Send token in `Authorization` header for protected routes

### Token Storage
```typescript
// After successful login/register
localStorage.setItem('token', token);
```

### Token Usage
```typescript
// Include in all authenticated requests
headers: {
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}
```

### Token Expiration
- Tokens expire after 7 days
- Handle 401/403 errors by redirecting to login

---

## API Endpoints

### 1. Authentication Endpoints

#### POST `/api/auth/register`
**Requires:** None (public)  
**Request Body:**
```json
{
  "email": "student@school.edu",
  "password": "password123"
}
```
**Response (201):**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "student@sch",
    "email": "student@school.edu"
  }
}
```
**Errors:**
- `400`: Invalid email format, password too short, missing fields
- `409`: Account already exists

#### POST `/api/auth/login`
**Requires:** None (public)  
**Request Body:**
```json
{
  "email": "student@school.edu",
  "password": "password123"
}
```
**Response (200):**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "student@sch",
    "email": "student@school.edu"
  }
}
```
**Errors:**
- `400`: Missing email/password
- `401`: Invalid credentials

#### DELETE `/api/auth/account`
**Requires:** Email/password in body (not JWT)  
**Request Body:**
```json
{
  "email": "student@school.edu",
  "password": "password123"
}
```
**Response (200):**
```json
{
  "message": "Account deleted successfully",
  "email": "student@school.edu"
}
```

---

### 2. File Upload/Download Endpoints

#### POST `/api/files/upload`
**Requires:** ✅ JWT Token (logged-in users only)  
**Content-Type:** `multipart/form-data`  
**Request:**
- Form field: `file` (the file to upload)
- Optional: `classId` (number)

**Example (JavaScript):**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('classId', '123'); // optional

fetch('/api/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Response (201):**
```json
{
  "id": 123,
  "originalName": "assignment1.pdf",
  "size": 524288,
  "fileType": "application/pdf",
  "classId": 123,
  "class": {
    "id": 123,
    "subject": "CS",
    "catalog": "370",
    "title": "Software Engineering",
    "csNumber": "CS370"
  },
  "uploadedAt": "2024-01-15T10:30:00.000Z"
}
```
**Errors:**
- `400`: No file uploaded
- `401`: Not authenticated

**File Size Limit:** 50MB

---

#### GET `/api/files`
**Requires:** None (public - anyone can view)  
**Query Parameters:**
- `search` (optional): Search by filename
- `classId` (optional): Filter by class ID

**Example:**
```
GET /api/files?search=assignment
GET /api/files?classId=123
```

**Response (200):**
```json
[
  {
    "id": 123,
    "originalName": "assignment1.pdf",
    "size": "524288",
    "fileType": "application/pdf",
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "class": {
      "id": 123,
      "subject": "CS",
      "catalog": "370",
      "title": "Software Engineering",
      "csNumber": "CS370"
    }
  },
  {
    "id": 122,
    "originalName": "notes.pdf",
    "size": "1024000",
    "fileType": "application/pdf",
    "uploadedAt": "2024-01-14T09:15:00.000Z"
  }
]
```

---

#### GET `/api/files/:id`
**Requires:** None (public - anyone can download)  
**Response:** File blob (binary data)

**Example:**
```javascript
fetch(`/api/files/${fileId}`)
  .then(res => res.blob())
  .then(blob => {
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
  });
```

**Response Headers:**
- `Content-Type`: `application/octet-stream`
- `Content-Disposition`: `attachment; filename="filename.pdf"`
- `Content-Length`: File size in bytes

**Errors:**
- `400`: Invalid file ID
- `404`: File not found

---

#### DELETE `/api/files/:id`
**Requires:** ✅ JWT Token (only owner can delete)  
**Response (204):** No content (success)

**Errors:**
- `400`: Invalid file ID
- `401`: Not authenticated
- `403`: Not authorized (not the owner)
- `404`: File not found

---

### 3. Bookmark Endpoints

#### POST `/api/files/:id/bookmark`
**Requires:** ✅ JWT Token (logged-in users only)  
**Response (201):**
```json
{
  "message": "File bookmarked successfully",
  "fileId": 123
}
```
**Errors:**
- `400`: Invalid file ID
- `401`: Not authenticated
- `404`: File not found
- `409`: File already bookmarked

---

#### GET `/api/files/bookmarks`
**Requires:** ✅ JWT Token (logged-in users only)  
**Response (200):**
```json
[
  {
    "id": 123,
    "originalName": "assignment1.pdf",
    "size": "524288",
    "fileType": "application/pdf",
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "bookmarkedAt": "2024-01-16T14:20:00.000Z"
  }
]
```

---

#### DELETE `/api/files/:id/bookmark`
**Requires:** ✅ JWT Token (logged-in users only)  
**Response (204):** No content (success)

**Errors:**
- `400`: Invalid file ID
- `401`: Not authenticated
- `404`: Bookmark not found

---

## Frontend Components Needed

### 1. Authentication Component (Update Existing)
**File:** `AuthForm.tsx`  
**Updates Needed:**
- Store JWT token in `localStorage` after login/register
- Update user state with token
- Handle token expiration (401/403 errors)

**Example:**
```typescript
const handleLogin = async (email: string, password: string) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (res.ok) {
    const { token, user } = await res.json();
    localStorage.setItem('token', token);
    setUser(user);
  }
};
```

---

### 2. File Upload Component (NEW)
**File:** `FileUpload.tsx`  
**Features:**
- File input (accept all file types)
- Optional course selector
- Upload button (disabled if not logged in)
- Progress indicator
- Success/error messages

**Example:**
```typescript
const handleUpload = async (file: File, course?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (course) formData.append('course', course);
  
  const token = localStorage.getItem('token');
  const res = await fetch('/api/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  if (res.ok) {
    const fileData = await res.json();
    // Refresh file list or add to state
  }
};
```

---

### 3. File List Component (NEW)
**File:** `FileList.tsx`  
**Features:**
- Display all files (public access)
- Search bar (filters by filename)
- Course filter (optional)
- Show file metadata (name, size, type, upload date)
- Download button for each file
- Bookmark button (if logged in)
- Delete button (only if owner)

**Example:**
```typescript
const fetchFiles = async (search?: string) => {
  const url = search 
    ? `/api/files?search=${encodeURIComponent(search)}`
    : '/api/files';
  
  const res = await fetch(url);
  const files = await res.json();
  setFiles(files);
};
```

---

### 4. Bookmarks Component (NEW)
**File:** `Bookmarks.tsx`  
**Features:**
- Display user's bookmarked files
- Only visible if logged in
- Remove bookmark button
- Navigate to file details

**Example:**
```typescript
const fetchBookmarks = async () => {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/files/bookmarks', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const bookmarks = await res.json();
  setBookmarks(bookmarks);
};
```

---

## Error Handling

### Authentication Errors (401/403)
```typescript
if (res.status === 401 || res.status === 403) {
  // Token expired or invalid
  localStorage.removeItem('token');
  // Redirect to login
  navigate('/login');
}
```

### Network Errors
```typescript
try {
  const res = await fetch('/api/files');
  if (!res.ok) {
    const error = await res.json();
    setError(error.error || 'Request failed');
  }
} catch (err) {
  setError('Network error - please check your connection');
}
```

---

## Required State Management

### User State
```typescript
interface User {
  id: string;
  email: string;
}

const [user, setUser] = useState<User | null>(null);
const [token, setToken] = useState<string | null>(
  localStorage.getItem('token')
);
```

### File State
```typescript
interface File {
  id: number;
  originalName: string;
  size: string;
  fileType: string;
  uploadedAt: string;
}

const [files, setFiles] = useState<File[]>([]);
const [bookmarks, setBookmarks] = useState<File[]>([]);
```

---

## Testing Checklist

- [ ] User can register with .edu email
- [ ] User can login and receive JWT token
- [ ] Token is stored in localStorage
- [ ] Logged-in user can upload files
- [ ] Non-logged-in user cannot upload (should show error)
- [ ] Anyone can view file list (public)
- [ ] Anyone can download files (public)
- [ ] Search filters files by name
- [ ] Only file owner can delete their files
- [ ] Logged-in users can bookmark files
- [ ] Logged-in users can view their bookmarks
- [ ] Token expiration handled gracefully (401 → redirect to login)

---

## API Response Codes Summary

| Code | Meaning | When It Happens |
|------|---------|----------------|
| 200 | Success | GET/POST requests succeed |
| 201 | Created | File uploaded, bookmark created, account registered |
| 204 | No Content | DELETE requests succeed |
| 400 | Bad Request | Invalid input, missing fields |
| 401 | Unauthorized | Not logged in, missing/invalid token |
| 403 | Forbidden | Not authorized (e.g., deleting someone else's file) |
| 404 | Not Found | File/user doesn't exist |
| 409 | Conflict | Duplicate bookmark, account already exists |
| 500 | Server Error | Internal server error |

---

## Notes

1. **File Size:** Maximum 50MB per file
2. **Token Expiration:** 7 days (user needs to re-login after)
3. **File Types:** All file types accepted (no restrictions)
4. **Public Access:** Anyone can view/download files without login
5. **Upload:** Requires login (use JWT token)
6. **Delete:** Only file owner can delete
7. **Bookmarks:** Only logged-in users can bookmark

---

## Example Complete Flow

```typescript
// 1. User logs in
const loginRes = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { token, user } = await loginRes.json();
localStorage.setItem('token', token);

// 2. User uploads file
const formData = new FormData();
formData.append('file', file);
const uploadRes = await fetch('/api/files/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
const newFile = await uploadRes.json();

// 3. Anyone views file list
const filesRes = await fetch('/api/files');
const files = await filesRes.json();

// 4. User bookmarks file
await fetch(`/api/files/${fileId}/bookmark`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});

// 5. User views bookmarks
const bookmarksRes = await fetch('/api/files/bookmarks', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const bookmarks = await bookmarksRes.json();
```

---

## Questions?

If you need clarification on any endpoint or implementation detail, check the backend code in `server.js` or ask the backend developer.

