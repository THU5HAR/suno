# Deployment Guide

This project is deployed on two platforms:
- **Frontend (React)**: Vercel - https://suno-rho.vercel.app/
- **Backend (Node.js/Express)**: Render - https://music-video-gen.onrender.com

## Frontend Deployment (Vercel)

### Prerequisites
1. Vercel account (sign up at https://vercel.com)
2. GitHub repository connected to Vercel

### Steps

1. **Connect Repository to Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository: `THU5HAR/suno`
   - Select the root directory: `playlist-studio-react`

2. **Configure Build Settings**
   - Framework Preset: Vite
   - Root Directory: `playlist-studio-react`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Set Environment Variables**
   In Vercel dashboard → Settings → Environment Variables, add:
   ```
   VITE_API_BASE_URL=https://music-video-gen.onrender.com
   ```
   (Replace with your actual Render backend URL)

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your frontend
   - Your app will be available at: https://suno-rho.vercel.app/

### Vercel Configuration
The `vercel.json` file is already configured with:
- SPA routing (all routes redirect to index.html)
- Proper headers for WASM files (required for FFmpeg.wasm)
- Cache control for static assets

## Backend Deployment (Render)

### Prerequisites
1. Render account (sign up at https://render.com)
2. GitHub repository connected to Render

### Steps

1. **Create New Web Service**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `THU5HAR/suno`

2. **Configure Service**
   - Name: `playlist-studio-backend`
   - Environment: `Node`
   - Region: Choose closest to your users
   - Branch: `main`
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Set Environment Variables**
   In Render dashboard → Environment, add:
   ```
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=<generate-a-secure-random-string>
   DATABASE_PATH=./data/playlist-studio.db
   ALLOWED_ORIGINS=https://suno-rho.vercel.app,https://music-video-gen.onrender.com
   MAX_FILE_SIZE=104857600
   UPLOAD_DIR=./uploads
   ```

   **Generate JWT_SECRET:**
   ```bash
   openssl rand -base64 32
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your backend
   - Your API will be available at: https://music-video-gen.onrender.com

### Render Configuration
The `render.yaml` file is already configured with all necessary settings. You can use it for automated deployment or manually configure as above.

## Environment Variables Summary

### Frontend (Vercel)
- `VITE_API_BASE_URL`: Backend API URL (e.g., `https://music-video-gen.onrender.com`)

### Backend (Render)
- `NODE_ENV`: `production`
- `PORT`: `3001`
- `JWT_SECRET`: Secure random string (generate with `openssl rand -base64 32`)
- `DATABASE_PATH`: `./data/playlist-studio.db`
- `ALLOWED_ORIGINS`: Comma-separated list of frontend URLs
- `MAX_FILE_SIZE`: `104857600` (100MB)
- `UPLOAD_DIR`: `./uploads`

## Post-Deployment Checklist

- [ ] Verify frontend is accessible at Vercel URL
- [ ] Verify backend health check: `https://music-video-gen.onrender.com/api/health`
- [ ] Test audio extraction from YouTube/Suno
- [ ] Test transcription service
- [ ] Verify CORS is working (frontend can call backend)
- [ ] Check backend logs for any errors
- [ ] Update `ALLOWED_ORIGINS` in backend if frontend URL changes

## Troubleshooting

### CORS Errors
- Ensure `ALLOWED_ORIGINS` in backend includes your Vercel frontend URL
- Check that backend is returning proper CORS headers

### API Connection Issues
- Verify `VITE_API_BASE_URL` in Vercel matches your Render backend URL
- Check backend logs in Render dashboard
- Test backend health endpoint directly

### Build Failures
- Check build logs in Vercel/Render dashboards
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility (>=18.0.0)

## Continuous Deployment

Both platforms support automatic deployments:
- **Vercel**: Automatically deploys on push to `main` branch
- **Render**: Automatically deploys on push to `main` branch (if configured)

## Manual Deployment

If you need to manually trigger deployments:
- **Vercel**: Dashboard → Your Project → Deployments → Redeploy
- **Render**: Dashboard → Your Service → Manual Deploy

