# Local Development Setup

This guide helps you run the project locally without affecting GitHub.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## Quick Start

### 1. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../playlist-studio-react
npm install
```

### 2. Configure Environment Variables

#### Backend (.env file)
The `.env` file should already exist in the `backend/` directory. If not, create it:

```bash
cd backend
cat > .env << 'EOF'
# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=tYAFOti+8imuoB8LNrMfOcA6av3/muZ3p4pHOkjhdbY=

# Database
DATABASE_PATH=./data/playlist-studio.db

# CORS - Comma-separated list of allowed origins
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# File Upload
MAX_FILE_SIZE=104857600
UPLOAD_DIR=./uploads
EOF
```

#### Frontend (.env.local file - Optional)
Create `.env.local` in `playlist-studio-react/` if you want to override API URL:

```bash
cd playlist-studio-react
cat > .env.local << 'EOF'
# Backend API URL (defaults to http://localhost:3001 if not set)
VITE_API_BASE_URL=http://localhost:3001

# Google Drive Client ID (optional, only if using Google Drive features)
# VITE_GOOGLE_DRIVE_CLIENT_ID=your-client-id
EOF
```

### 3. Run the Application

#### Option 1: Run in Separate Terminals

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend will run on: http://localhost:3001

**Terminal 2 - Frontend:**
```bash
cd playlist-studio-react
npm run dev
```
Frontend will run on: http://localhost:5173

#### Option 2: Use the Start Script

```bash
# From project root
chmod +x start-local.sh
./start-local.sh
```

## Verify Setup

1. **Backend Health Check:**
   ```bash
   curl http://localhost:3001/api/health
   ```
   Should return: `{"status":"ok","timestamp":"...","version":"1.0.0"}`

2. **Frontend:**
   - Open http://localhost:5173 in your browser
   - Check browser console for any errors
   - Try adding a song to test the connection

## Local Development URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Backend Health**: http://localhost:3001/api/health

## Important Notes

- `.env` and `.env.local` files are in `.gitignore` and will NOT be committed to GitHub
- All local changes stay local unless you explicitly commit and push
- The backend uses SQLite database stored in `backend/data/playlist-studio.db`
- Uploaded files are stored in `backend/uploads/`

## Troubleshooting

### Port Already in Use
If port 3001 or 5173 is already in use:
- Backend: Change `PORT` in `backend/.env`
- Frontend: Vite will automatically use the next available port

### CORS Errors
- Make sure `ALLOWED_ORIGINS` in `backend/.env` includes your frontend URL
- Check that backend is running before starting frontend

### Database Issues
- Delete `backend/data/playlist-studio.db` to reset the database
- The database will be recreated automatically on next backend start

### Module Not Found
- Run `npm install` in both `backend/` and `playlist-studio-react/` directories
- Delete `node_modules` and `package-lock.json` and reinstall if issues persist

## Development Workflow

1. Make changes to code
2. Changes are automatically reflected (hot reload)
3. Test locally
4. When ready, commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

## Stopping the Servers

- Press `Ctrl+C` in each terminal to stop the servers
- Or use the stop script if you created one

