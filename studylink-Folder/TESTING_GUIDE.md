# Testing Guide for StudyLink API

## Prerequisites

1. **Database Connection**: Ensure MySQL is connected and SSH tunnel is running (if needed)
2. **Environment Variables**: Set up `.env` file with:
   ```env
   PORT=8199
   JWT_SECRET=your-secret-key-here
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=your_username
   MYSQL_PASSWORD=your_password
   MYSQL_DATABASE=your_database
   ```

3. **Dependencies Installed**: 
   ```bash
   cd studylink-Folder
   npm install
   ```

---

## Starting the Server

```bash
cd studylink-Folder
npm start
```

You should see:
```
✅ API listening on http://0.0.0.0:8199
✅ Frontend served from /path/to/studylink-frontend/dist
```

---

## Testing Methods

### Method 1: Using cURL (Command Line)

### Method 2: Using Browser (for simple GET requests)

---

## Step-by-Step Testing Workflow

### Step 1: Test Health Check

```bash
curl http://localhost:8199/api/health
```

**Expected Response:**
```json
{
  "ok": true,
  "service": "studylink-api",
  "driver": "mysql",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### Step 2: Test User Registration

```bash
curl -X POST http://localhost:8199/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@school.edu",
    "password": "password123"
  }'
```

**Expected Response (201):**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "student@sch",
    "email": "student@school.edu"
  }
}
```

**Save the token** for later use:
```bash
export TOKEN="eyJhbGc..."  # Replace with actual token
```

**Test Error Cases:**
```bash
# Invalid email (not .edu)
curl -X POST http://localhost:8199/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@gmail.com", "password": "password123"}'

# Password too short
curl -X POST http://localhost:8199/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@school.edu", "password": "short"}'
```

---

### Step 3: Test User Login

```bash
curl -X POST http://localhost:8199/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@school.edu",
    "password": "password123"
  }'
```

**Expected Response (200):**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "student@sch",
    "email": "student@school.edu"
  }
}
```

**Test Error Case (Wrong Password):**
```bash
curl -X POST http://localhost:8199/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@school.edu",
    "password": "wrongpassword"
  }'
```

**Expected Response (401):**
```json
{
  "error": "invalid credentials"
}
```

---

### Step 4: Test Get Classes (Optional - for file upload)

```bash
curl http://localhost:8199/api/classes
```

**Expected Response (200):**
```json
[
  {
    "id": 123,
    "subject": "CS",
    "catalog": "370",
    "title": "Software Engineering",
    "csNumber": "CS370",
    "minUnits": 3.0,
    "maxUnits": 3.0,
    "compUnits": 3.0
  }
]
```

**Search Classes:**
```bash
curl "http://localhost:8199/api/classes?search=CS370"
curl "http://localhost:8199/api/classes?subject=CS"
```

---

### Step 5: Test File Upload

**Create a test file first:**
```bash
echo "This is a test file" > test.txt
```

**Upload file (requires JWT token):**
```bash
curl -X POST http://localhost:8199/api/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.txt" \
  -F "classId=123"
```

**Expected Response (201):**
```json
{
  "id": 456,
  "originalName": "test.txt",
  "size": 20,
  "fileType": "text/plain",
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

**Save the file ID:**
```bash
export FILE_ID=456  # Replace with actual file ID
```

**Test Error Cases:**
```bash
# Without token (should fail)
curl -X POST http://localhost:8199/api/files/upload \
  -F "file=@test.txt"

# Invalid classId
curl -X POST http://localhost:8199/api/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.txt" \
  -F "classId=99999"
```

---

### Step 6: Test File List

```bash
# Get all files (public - no token needed)
curl http://localhost:8199/api/files
```

**Expected Response (200):**
```json
[
  {
    "id": 456,
    "originalName": "test.txt",
    "size": "20",
    "fileType": "text/plain",
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "class": {
      "id": 123,
      "subject": "CS",
      "catalog": "370",
      "title": "Software Engineering",
      "csNumber": "CS370"
    }
  }
]
```

**Search Files:**
```bash
curl "http://localhost:8199/api/files?search=test"
```

**Filter by Class:**
```bash
curl "http://localhost:8199/api/files?classId=123"
```

**Combine Filters:**
```bash
curl "http://localhost:8199/api/files?search=test&classId=123"
```

---

### Step 7: Test File Download

```bash
curl http://localhost:8199/api/files/$FILE_ID \
  -o downloaded_file.txt
```

**Verify the file:**
```bash
cat downloaded_file.txt
# Should show: "This is a test file"
```

**Test Error Case:**
```bash
# Invalid file ID
curl http://localhost:8199/api/files/99999
```

**Expected Response (404):**
```json
{
  "error": "file not found"
}
```

---

### Step 8: Test Bookmark File

```bash
curl -X POST http://localhost:8199/api/files/$FILE_ID/bookmark \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (201):**
```json
{
  "message": "File bookmarked successfully",
  "fileId": 456
}
```

**Test Error Case (Already Bookmarked):**
```bash
# Try to bookmark again
curl -X POST http://localhost:8199/api/files/$FILE_ID/bookmark \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (409):**
```json
{
  "error": "file already bookmarked"
}
```

---

### Step 9: Test Get Bookmarks

```bash
curl http://localhost:8199/api/files/bookmarks \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200):**
```json
[
  {
    "id": 456,
    "originalName": "test.txt",
    "size": "20",
    "fileType": "text/plain",
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "bookmarkedAt": "2024-01-16T14:20:00.000Z",
    "class": {
      "id": 123,
      "subject": "CS",
      "catalog": "370",
      "title": "Software Engineering",
      "csNumber": "CS370"
    }
  }
]
```

**Test Error Case (No Token):**
```bash
curl http://localhost:8199/api/files/bookmarks
```

**Expected Response (401):**
```json
{
  "error": "authentication required"
}
```

---

### Step 10: Test Unbookmark File

```bash
curl -X DELETE http://localhost:8199/api/files/$FILE_ID/bookmark \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (204):** No content (success)

---

### Step 11: Test Delete File (Only Owner)

```bash
curl -X DELETE http://localhost:8199/api/files/$FILE_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (204):** No content (success)

**Test Error Cases:**
```bash
# Delete someone else's file (should fail)
# First, login as different user and try to delete $FILE_ID
# Expected: 403 Forbidden

# Delete without token
curl -X DELETE http://localhost:8199/api/files/$FILE_ID
# Expected: 401 Unauthorized
```

---

### Step 12: Test Delete Account

```bash
curl -X DELETE http://localhost:8199/api/auth/account \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@school.edu",
    "password": "password123"
  }'
```

**Expected Response (200):**
```json
{
  "message": "Account deleted successfully",
  "email": "student@school.edu"
}
```

## Testing Checklist

### Authentication
- [ ] Register new user with .edu email
- [ ] Register fails with non-.edu email
- [ ] Register fails with short password (< 8 chars)
- [ ] Register fails with duplicate email
- [ ] Login with correct credentials
- [ ] Login fails with wrong password
- [ ] Login fails with non-existent email
- [ ] Token is returned on successful login/register
- [ ] Delete account with correct credentials

### File Upload
- [ ] Upload file with valid token
- [ ] Upload fails without token (401)
- [ ] Upload fails with invalid token (403)
- [ ] Upload with optional classId
- [ ] Upload fails with invalid classId
- [ ] File size limit enforced (50MB)

### File List/Download
- [ ] List files without token (public access)
- [ ] Search files by filename
- [ ] Filter files by classId
- [ ] Download file without token (public access)
- [ ] Download fails with invalid file ID (404)

### Bookmarks
- [ ] Bookmark file with valid token
- [ ] Bookmark fails without token (401)
- [ ] Bookmark fails with duplicate (409)
- [ ] Get bookmarks list (requires token)
- [ ] Unbookmark file (requires token)

### File Deletion
- [ ] Delete own file (requires token)
- [ ] Delete fails without token (401)
- [ ] Delete fails if not owner (403)
- [ ] Delete fails with invalid file ID (404)

### Classes
- [ ] Get classes list (public)
- [ ] Search classes by name
- [ ] Filter classes by subject

---

## Quick Test Script

Save this as `test.sh` and run: `bash test.sh`

```bash
#!/bin/bash

BASE_URL="http://localhost:8199"

echo "1. Health Check..."
curl -s $BASE_URL/api/health | jq

echo -e "\n2. Register User..."
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@school.edu", "password": "password123"}')
echo $REGISTER_RESPONSE | jq

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token')
echo "Token: $TOKEN"

echo -e "\n3. Get Classes..."
curl -s $BASE_URL/api/classes | jq '.[0:3]'

echo -e "\n4. Upload File..."
echo "Test file content" > /tmp/test.txt
UPLOAD_RESPONSE=$(curl -s -X POST $BASE_URL/api/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test.txt")
echo $UPLOAD_RESPONSE | jq

FILE_ID=$(echo $UPLOAD_RESPONSE | jq -r '.id')
echo "File ID: $FILE_ID"

echo -e "\n5. List Files..."
curl -s $BASE_URL/api/files | jq '.[0:3]'

echo -e "\n6. Download File..."
curl -s $BASE_URL/api/files/$FILE_ID -o /tmp/downloaded.txt
cat /tmp/downloaded.txt

echo -e "\n7. Bookmark File..."
curl -s -X POST $BASE_URL/api/files/$FILE_ID/bookmark \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n8. Get Bookmarks..."
curl -s $BASE_URL/api/files/bookmarks \
  -H "Authorization: Bearer $TOKEN" | jq

echo -e "\n✅ All tests completed!"
```

---

## Troubleshooting

### Server won't start
- Check MySQL connection
- Verify `.env` file exists and has correct values
- Check if port 8199 is already in use

### Authentication fails
- Verify JWT_SECRET is set in `.env`
- Check token is being sent correctly (Bearer format)
- Check token hasn't expired (7 days)

### File upload fails
- Check file size is under 50MB
- Verify token is valid
- Check database connection

### Database errors
- Verify MySQL is running
- Check SSH tunnel if using remote database
- Verify table schemas match code expectations

---

## Next Steps

After testing backend:
1. Test frontend integration
2. Test end-to-end user flows
3. Test error handling in UI
4. Test with multiple users
5. Test concurrent requests



