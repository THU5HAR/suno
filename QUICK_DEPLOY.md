# Quick Deployment Guide

## 🚀 Deploy to Vercel (Frontend)

### Option 1: Using Vercel CLI (Recommended)
```bash
cd playlist-studio-react
npm install -g vercel
vercel login
vercel --prod
```

When prompted:
- Set up and deploy? **Yes**
- Which scope? **Your account**
- Link to existing project? **No** (first time) or **Yes** (if updating)
- Project name: **suno-rho** (or your preferred name)
- Directory: **./playlist-studio-react**
- Override settings? **No**

### Option 2: Using Vercel Dashboard
1. Go to https://vercel.com/new
2. Import GitHub repository: `THU5HAR/suno`
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `playlist-studio-react`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://music-video-gen.onrender.com`
5. Click **Deploy**

## 🔧 Deploy to Render (Backend)

### Option 1: Using Render Dashboard (Recommended)
1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Connect GitHub repository: `THU5HAR/suno`
4. Configure:
   - **Name**: `playlist-studio-backend`
   - **Environment**: Node
   - **Region**: Oregon (or closest to you)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add Environment Variables:
   ```
   NODE_ENV=production
   JWT_SECRET=<generate with: openssl rand -base64 32>
   DATABASE_PATH=./data/playlist-studio.db
   ALLOWED_ORIGINS=https://suno-rho.vercel.app,https://music-video-gen.onrender.com
   MAX_FILE_SIZE=104857600
   UPLOAD_DIR=./uploads
   ```
6. Click **Create Web Service**

### Option 2: Using render.yaml (Blueprints)
1. Go to https://dashboard.render.com
2. Click **New +** → **Blueprint**
3. Connect GitHub repository: `THU5HAR/suno`
4. Render will automatically detect `render.yaml` and configure the service
5. Review and adjust environment variables if needed
6. Click **Apply**

## ✅ Post-Deployment Checklist

### Frontend (Vercel)
- [ ] Visit https://suno-rho.vercel.app/ and verify it loads
- [ ] Check browser console for errors
- [ ] Verify API calls are going to correct backend URL

### Backend (Render)
- [ ] Visit https://music-video-gen.onrender.com/api/health
- [ ] Should return: `{"status":"ok","timestamp":"...","version":"1.0.0"}`
- [ ] Check Render logs for any startup errors
- [ ] Verify CORS allows your Vercel frontend URL

### Integration Test
1. Open https://suno-rho.vercel.app/
2. Try adding a song with YouTube URL
3. Try extracting audio
4. Check browser Network tab - API calls should go to Render backend

## 🔄 Update Deployments

### Update Frontend
```bash
cd playlist-studio-react
git add .
git commit -m "Update frontend"
git push origin main
# Vercel auto-deploys on push
```

### Update Backend
```bash
cd backend
git add .
git commit -m "Update backend"
git push origin main
# Render auto-deploys on push (if auto-deploy enabled)
```

## 🐛 Troubleshooting

### Frontend can't connect to backend
- Check `VITE_API_BASE_URL` in Vercel environment variables
- Verify backend URL is correct (no trailing slash)
- Check backend CORS settings include Vercel URL

### Backend health check fails
- Check Render logs for errors
- Verify all environment variables are set
- Check if database file is being created

### Build fails
- Check build logs in Vercel/Render dashboards
- Verify Node.js version (>=18.0.0)
- Ensure all dependencies are in package.json

## 📝 Environment Variables Reference

### Frontend (Vercel)
| Variable | Value | Required |
|----------|-------|----------|
| `VITE_API_BASE_URL` | `https://music-video-gen.onrender.com` | Yes |

### Backend (Render)
| Variable | Value | Required |
|----------|-------|----------|
| `NODE_ENV` | `production` | Yes |
| `PORT` | Auto-set by Render | No |
| `JWT_SECRET` | Random string (generate) | Yes |
| `DATABASE_PATH` | `./data/playlist-studio.db` | Yes |
| `ALLOWED_ORIGINS` | Comma-separated URLs | Yes |
| `MAX_FILE_SIZE` | `104857600` | No |
| `UPLOAD_DIR` | `./uploads` | No |

## 🔗 Live URLs
- **Frontend**: https://suno-rho.vercel.app/
- **Backend**: https://music-video-gen.onrender.com
- **Backend Health**: https://music-video-gen.onrender.com/api/health

