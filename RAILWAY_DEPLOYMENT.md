# Railway Deployment Guide

This guide will help you deploy Playlist Studio on Railway.

## Prerequisites

1. Railway account (sign up at https://railway.app)
2. GitHub account with your code pushed

## Step-by-Step Deployment

### Step 1: Deploy Backend Service

1. **Go to Railway Dashboard**
   - Visit https://railway.app
   - Sign up/Login with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add Backend Service**
   - Click "+ New" → "GitHub Repo"
   - Select the same repository
   - Railway will create a service

4. **Configure Backend Service** ⚠️ **CRITICAL STEP**
   - Click on the backend service
   - Go to "Settings" tab
   - **MUST SET:** **Root Directory:** `backend` ← This is essential!
   - **Build Command:** (leave empty - nixpacks.toml will handle it)
   - **Start Command:** (leave empty - nixpacks.toml will handle it)
   
   **If Root Directory is not set to `backend`, Railway will fail with "Missing script: start" error!**

5. **Set Environment Variables**
   - Go to "Variables" tab
   - Add these variables:
     ```
     NODE_ENV=production
     PORT=3001
     JWT_SECRET=<generate-with-openssl-rand-base64-32>
     DATABASE_PATH=./data/playlist-studio.db
     ALLOWED_ORIGINS=https://your-frontend-url.up.railway.app
     MAX_FILE_SIZE=104857600
     UPLOAD_DIR=./uploads
     ```

6. **Get Backend URL**
   - Go to "Settings" → "Networking"
   - Enable "Generate Domain"
   - Copy the generated URL (e.g., `https://backend-production-xxxx.up.railway.app`)

### Step 2: Deploy Frontend Service

1. **Add Frontend Service**
   - In the same Railway project, click "+ New"
   - Select "GitHub Repo"
   - Choose the same repository

2. **Configure Frontend Service** ⚠️ **CRITICAL STEP**
   - Click on the frontend service
   - Go to "Settings" tab
   - **MUST SET:** **Root Directory:** `playlist-studio-react` ← This is essential!
   - **Build Command:** (leave empty - nixpacks.toml will handle it)
   - **Start Command:** (leave empty - nixpacks.toml will handle it)
   
   **If Root Directory is not set to `playlist-studio-react`, Railway will fail with "Missing script: start" error!**

3. **Set Environment Variables**
   - Go to "Variables" tab
   - Add:
     ```
     VITE_API_BASE_URL=https://your-backend-url.up.railway.app
     PORT=3000
     ```
     (Use the backend URL from Step 1.6)

4. **Get Frontend URL**
   - Go to "Settings" → "Networking"
   - Enable "Generate Domain"
   - Copy the generated URL (e.g., `https://frontend-production-xxxx.up.railway.app`)

### Step 3: Update Backend CORS

1. Go back to backend service → "Variables"
2. Update `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://your-frontend-url.up.railway.app
   ```
3. Railway will automatically redeploy

## Configuration Files

The project includes Railway-specific configuration:

- **`backend/nixpacks.toml`**: Backend build configuration
- **`playlist-studio-react/nixpacks.toml`**: Frontend build configuration

These files tell Railway:
- Which Node.js version to use (20)
- How to install dependencies
- How to build the frontend
- How to start each service

**IMPORTANT:** Make sure you set the **Root Directory** correctly in Railway settings:
- Backend service: Root Directory = `backend`
- Frontend service: Root Directory = `playlist-studio-react`

Without the correct Root Directory, Railway will try to run commands from the root, which will fail.

## Auto-Deployment

Railway automatically deploys when you push to your GitHub repository's main branch.

## Troubleshooting

### Build Fails / "Missing script: start" Error
- **Most Common Issue:** Root Directory is not set correctly!
  - Backend service MUST have Root Directory = `backend`
  - Frontend service MUST have Root Directory = `playlist-studio-react`
- Check build logs in Railway dashboard
- Verify nixpacks.toml files are in the correct directories
- Ensure you're not using the root directory (which has no start script)

### Port Errors
- Railway automatically sets `PORT` environment variable
- Your code should use `process.env.PORT` (already configured)

### Frontend Can't Connect to Backend
- Verify `VITE_API_BASE_URL` matches your backend URL
- Check `ALLOWED_ORIGINS` includes your frontend URL
- Ensure both services are deployed and running

## Cost

Railway offers $5 free credit per month, which is usually enough for small applications.

## Quick Checklist

- [ ] Backend service created with Root Directory: `backend`
- [ ] Backend environment variables set
- [ ] Backend URL copied
- [ ] Frontend service created with Root Directory: `playlist-studio-react`
- [ ] Frontend environment variables set (with backend URL)
- [ ] Backend `ALLOWED_ORIGINS` updated with frontend URL
- [ ] Both services deployed successfully
- [ ] Test frontend and backend connection

