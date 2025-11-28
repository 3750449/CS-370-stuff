# Railway Deployment Guide

Quick guide to deploy StudyLink to Railway for teammate testing.

## Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (free)
3. Authorize Railway to access your repositories

## Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository: `lynnkhaing/CS-370-stuff`
4. Select branch: **`deploy/railway-test`**

## Step 3: Add MySQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add MySQL"**
3. Railway will automatically create a MySQL database
4. Wait for it to provision (~1-2 minutes)

## Step 4: Configure Web Service

1. Railway should have auto-detected your web service
2. Click on your web service
3. Go to **"Settings"** tab

### Set Root Directory:
- **Root Directory**: `studylink-Folder`

### Set Build & Start Commands:
- **Build Command**: 
  ```bash
  npm install && cd studylink-frontend && npm install && npm run build
  ```
- **Start Command**: 
  ```bash
  node server.js
  ```

## Step 5: Set Environment Variables

1. Go to your **web service** (not the database)
2. Click **"Variables"** tab
3. Click **"+ New Variable"** for each:

### Required Variables:

```env
NODE_ENV=production
PORT=${{PORT}}
JWT_SECRET=<generate-this-below>
```

### MySQL Connection Variables:

Railway automatically provides MySQL connection variables. Add these:

```env
MYSQL_HOST=${{MySQL.MYSQLHOST}}
MYSQL_PORT=${{MySQL.MYSQLPORT}}
MYSQL_USER=${{MySQL.MYSQLUSER}}
MYSQL_PASSWORD=${{MySQL.MYSQLPASSWORD}}
MYSQL_DATABASE=${{MySQL.MYSQLDATABASE}}
```

**Note**: Railway's variable names might be slightly different. Check your MySQL service's "Variables" tab to see the exact names.

**Alternative if automatic doesn't work:**
1. Go to your MySQL database service → **"Variables"** tab
2. Copy each value manually
3. In your web service → **"Variables"** tab, add them directly:
   ```env
   MYSQL_HOST=<paste-host-value>
   MYSQL_PORT=3306
   MYSQL_USER=<paste-user-value>
   MYSQL_PASSWORD=<paste-password-value>
   MYSQL_DATABASE=<paste-database-value>
   ```

### Generate JWT_SECRET:

Run this locally:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and set it as `JWT_SECRET` in Railway.

## Step 6: Generate Public URL

1. Go to your web service → **"Settings"** tab
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"**
4. Railway will create a public URL like: `https://your-app-name.up.railway.app`

## Step 7: Deploy!

Railway will automatically:
- Build your frontend
- Install dependencies
- Start your server
- Deploy to the public URL

Check the **"Deployments"** tab to see the build progress.

## Step 8: Test Your Deployment

1. **Health Check**: 
   ```
   https://your-app-name.up.railway.app/api/health
   ```
   Should return: `{"ok":true,"service":"studylink-api","driver":"mysql",...}`

2. **Test Registration**:
   - Go to your app URL
   - Try registering with a `.edu` email
   - Test login
   - Test file upload

## Troubleshooting

### Build Fails
- Check build logs in Railway dashboard
- Make sure `studylink-frontend` directory exists
- Verify Node.js version (Railway auto-detects)

### Database Connection Fails
- Verify all MySQL environment variables are set
- Check MySQL service is running (green status)
- Verify variable names match exactly

### App Won't Start
- Check logs in Railway dashboard
- Verify `JWT_SECRET` is set
- Make sure all environment variables are correct

### Frontend Not Loading
- Check if `studylink-frontend/dist` folder exists after build
- Verify build command completed successfully
- Check server.js is serving from correct `distDir` path

## Sharing with Teammates

Once deployed, share the Railway URL with your teammates:
```
https://your-app-name.up.railway.app
```

They can:
- Register with `.edu` emails
- Upload files
- Browse and download files
- Test all features

## Notes

- Railway free tier includes $5 credit/month (usually enough for testing)
- The database persists data between deployments
- Auto-deploys on every push to `deploy/railway-test` branch
- Check usage in Railway dashboard to monitor credit usage

## Cleanup

When done testing, you can:
- Delete the Railway project (stops billing)
- Or pause the service to save credits
- Keep it running for ongoing testing

---

**Branch**: `deploy/railway-test`  
**Purpose**: Test deployment for teammate demonstration

