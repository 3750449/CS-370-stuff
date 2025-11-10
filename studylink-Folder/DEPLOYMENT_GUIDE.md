# Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [Production Configuration](#production-configuration)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **Node.js**: v18.0.0 or higher (v24.10.0 recommended)
- **MySQL**: v8.0 or higher
- **npm**: v9.0.0 or higher
- **Operating System**: Linux, macOS, or Windows Server

### Required Software
- Node.js runtime
- MySQL server
- Git (for version control)
- PM2 or similar process manager (for production)

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/3750449/CS-370-stuff.git
cd CS-370-stuff/studylink-Folder
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the `studylink-Folder` directory:

```env
# Server Configuration
PORT=8199
NODE_ENV=production

# JWT Configuration
JWT_SECRET=your-very-secure-random-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d

# MySQL Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=your_mysql_username
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=studylink_db

# Optional: SQLite (for development)
SQLITE_FILE=studylink.db
```

**Security Note**: 
- Never commit `.env` file to version control
- Use strong, random JWT_SECRET in production
- Rotate secrets regularly
- Use environment-specific secrets

### 4. Generate Secure JWT Secret

```bash
# Generate a secure random secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output to `JWT_SECRET` in your `.env` file.

---

## Database Setup

### 1. MySQL Database Creation

```sql
CREATE DATABASE studylink_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Create Database User (Optional - for security)

```sql
CREATE USER 'studylink_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON studylink_db.* TO 'studylink_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Required Tables

The application requires the following tables:
- `User` - User accounts
- `image_store` - File storage (BLOBs)
- `Note_Files` - File metadata
- `bookmarks` - User bookmarks
- `classes` - Class/course information
- `notes` - Text notes (legacy)

**Note**: Tables are created automatically by `db.mysql.js` on first run, or you can create them manually using your database schema.

### 4. Verify Database Connection

```bash
# Test connection
node -e "require('dotenv').config(); const db = require('./db.mysql'); db.all('SELECT 1').then(() => console.log('✅ Connected')).catch(e => console.error('❌ Error:', e));"
```

---

## Application Deployment

### Option 1: PM2 (Recommended for Production)

#### Install PM2

```bash
npm install -g pm2
```

#### Start Application

```bash
# Start the application
pm2 start server.js --name studylink

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

#### PM2 Commands

```bash
# View logs
pm2 logs studylink

# Restart application
pm2 restart studylink

# Stop application
pm2 stop studylink

# View status
pm2 status

# Monitor resources
pm2 monit
```

### Option 2: Systemd Service (Linux)

Create `/etc/systemd/system/studylink.service`:

```ini
[Unit]
Description=StudyLink API Server
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/studylink-Folder
Environment=NODE_ENV=production
EnvironmentFile=/path/to/studylink-Folder/.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable studylink
sudo systemctl start studylink
sudo systemctl status studylink
```

### Option 3: Docker (Containerized Deployment)

#### Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8199

CMD ["node", "server.js"]
```

#### Create docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8199:8199"
    environment:
      - NODE_ENV=production
      - PORT=8199
    env_file:
      - .env
    depends_on:
      - mysql
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql_data:
```

#### Deploy with Docker

```bash
docker-compose up -d
docker-compose logs -f
```

---

## Production Configuration

### 1. Security Hardening

#### Update JWT Secret
```env
JWT_SECRET=<strong-random-secret-generated-above>
```

#### Enable HTTPS (Recommended)
Use a reverse proxy (nginx/Apache) with SSL certificate:

**nginx example:**
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8199;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Firewall Configuration
```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 80/tcp    # HTTP (redirect to HTTPS)
sudo ufw enable
```

### 2. Performance Optimization

#### Enable Compression
Add to `server.js`:
```javascript
const compression = require('compression');
app.use(compression());
```

#### Database Connection Pooling
Already configured in `db.mysql.js`:
- Connection limit: 10
- Queue limit: 0 (unlimited)

#### File Upload Limits
- Current: 50MB per file
- Adjust in `server.js` if needed:
```javascript
limits: {
  fileSize: 50 * 1024 * 1024, // 50MB
}
```

### 3. Logging

#### Production Logging
Consider using a logging library:
```bash
npm install winston
```

Example configuration:
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

### 4. Monitoring

#### Health Check Endpoint
```bash
curl http://localhost:8199/api/health
```

#### Set up Monitoring
- **Uptime monitoring**: UptimeRobot, Pingdom
- **Application monitoring**: New Relic, Datadog
- **Error tracking**: Sentry, Rollbar

---

## Frontend Deployment

### 1. Build Frontend

```bash
cd studylink-frontend
npm install
npm run build
```

This creates the `dist` folder that the backend serves.

### 2. Verify Build

```bash
# Check dist folder exists
ls -la dist/

# Should contain:
# - index.html
# - assets/ (JS and CSS files)
```

### 3. Update Backend

The backend automatically serves files from `studylink-frontend/dist` directory.

---

## Monitoring & Maintenance

### 1. Regular Backups

#### Database Backup Script

```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="studylink_db"
DB_USER="your_user"
DB_PASS="your_password"

mysqldump -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete
```

#### Schedule with Cron

```bash
# Add to crontab (daily at 2 AM)
0 2 * * * /path/to/backup-db.sh
```

### 2. Log Rotation

#### PM2 Log Rotation
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

#### Systemd Log Rotation
Configure in `/etc/logrotate.d/studylink`:
```
/path/to/studylink-Folder/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
}
```

### 3. Performance Monitoring

#### Check Application Status
```bash
# PM2
pm2 status
pm2 monit

# Systemd
systemctl status studylink
```

#### Database Monitoring
```sql
-- Check connection count
SHOW PROCESSLIST;

-- Check table sizes
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.TABLES
WHERE table_schema = 'studylink_db'
ORDER BY size_mb DESC;
```

---

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

**Error**: `Error: Missing MySQL env vars`
- **Solution**: Check `.env` file exists and has all required variables

**Error**: `ECONNREFUSED`
- **Solution**: Verify MySQL is running and connection details are correct

#### 2. Database Connection Issues

```bash
# Test MySQL connection
mysql -h localhost -u your_user -p your_database

# Check MySQL is running
sudo systemctl status mysql  # Linux
brew services list           # macOS
```

#### 3. Port Already in Use

```bash
# Find process using port 8199
lsof -i :8199  # macOS/Linux
netstat -ano | findstr :8199  # Windows

# Kill process
kill -9 <PID>
```

#### 4. File Upload Fails

**Error**: `File too large`
- **Solution**: Check file size limit (50MB) and increase if needed

**Error**: `Memory error`
- **Solution**: Increase Node.js memory limit:
```bash
node --max-old-space-size=4096 server.js
```

#### 5. JWT Token Issues

**Error**: `invalid or expired token`
- **Solution**: 
  - Check JWT_SECRET matches between environments
  - Verify token hasn't expired (7 days)
  - Ensure token is sent in correct format: `Bearer <token>`

---

## Production Checklist

Before going live:

- [ ] Environment variables configured
- [ ] JWT_SECRET is strong and unique
- [ ] Database is backed up
- [ ] HTTPS/SSL configured
- [ ] Firewall rules set
- [ ] Monitoring set up
- [ ] Logging configured
- [ ] Error tracking enabled
- [ ] Health check endpoint working
- [ ] Frontend built and deployed
- [ ] Database indexes created
- [ ] Backup strategy in place
- [ ] Process manager (PM2/systemd) configured
- [ ] Auto-restart on failure enabled
- [ ] Load testing completed
- [ ] Security audit performed

---

## Rollback Procedure

### 1. Application Rollback

```bash
# PM2
pm2 restart studylink --update-env

# Git rollback
git checkout <previous-commit>
npm install
pm2 restart studylink
```

### 2. Database Rollback

```bash
# Restore from backup
mysql -u user -p studylink_db < backup_YYYYMMDD_HHMMSS.sql
```

---

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer**: Use nginx or AWS ELB
2. **Multiple Instances**: Run multiple Node.js instances
3. **Session Management**: Use Redis for shared sessions (if needed)
4. **Database**: Consider read replicas for heavy read loads

### Vertical Scaling

1. **Increase Memory**: For large file uploads
2. **Database Optimization**: Add indexes, optimize queries
3. **Caching**: Implement Redis for frequently accessed data

---

## Support

For issues or questions:
- Check logs: `pm2 logs studylink`
- Review error messages in console
- Check database connectivity
- Verify environment variables

---

## Version History

- **v1.0.0** - Initial production release
  - JWT authentication
  - File upload/download
  - Class filtering
  - Bookmark functionality

