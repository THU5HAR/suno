# Playlist Studio

Professional Music Video Creator - Create and edit playlists with audio extraction, stitching, and video thumbnail design.

## Features

- 🎵 **Audio Extraction**: Extract audio from YouTube and Suno.com links
- 📝 **Playlist Management**: Add songs from links, CSV/Excel files, or local device
- 🎬 **Video Editor**: Design custom video thumbnails with text, images, and elements
- ✂️ **Audio Stitching**: Combine multiple songs into one continuous audio track
- 🎨 **Advanced Editing**: 
  - Transparency/opacity controls for all elements
  - Font selection and customization
  - Layer management (bring to front/send to back)
  - Smooth resize with visual feedback
  - Element list sidebar

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Audio Processing**: FFmpeg.wasm
- **Deployment**: Vercel (Frontend) + Render (Backend)

## Quick Start

### Local Development

```bash
# Install dependencies
npm run install:all

# Start backend
npm run dev:backend

# Start frontend (in another terminal)
npm run dev:frontend
```

### Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick Deploy:**
1. **Frontend (Vercel)**: Connect GitHub repo, set Root Directory = `playlist-studio-react`
2. **Backend (Render)**: Create Web Service, set Root Directory = `backend`

## Project Structure

```
suno/
├── backend/              # Node.js/Express backend
│   ├── src/
│   │   ├── routes/      # API routes
│   │   └── server.js    # Main server file
│   └── package.json
├── playlist-studio-react/  # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/     # API services
│   │   └── context/     # React context
│   └── package.json
├── DEPLOYMENT.md        # Deployment guide
└── render.yaml          # Render configuration
```

## Environment Variables

### Frontend (Vercel)
- `VITE_API_BASE_URL`: Backend API URL

### Backend (Render)
- `NODE_ENV`: `production`
- `PORT`: `3001`
- `JWT_SECRET`: Secure random string
- `ALLOWED_ORIGINS`: Comma-separated frontend URLs
- `DATABASE_PATH`: `./data/playlist-studio.db`
- `MAX_FILE_SIZE`: `104857600`
- `UPLOAD_DIR`: `./uploads`

## License

MIT

