# Playlist Studio Backend API

Backend server for the Playlist Studio application, providing REST API endpoints for project management, authentication, and file uploads.

## Features

- 🔐 User authentication (JWT-based)
- 📁 Project storage and management
- 📤 File upload and asset management
- 💾 SQLite database (lightweight, no setup required)
- 🚀 RESTful API endpoints

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
   - Set `JWT_SECRET` to a secure random string
   - Configure `PORT` if needed (default: 3001)
   - Set `ALLOWED_ORIGINS` to match your frontend URL

4. Start the server:
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The server will automatically create the database and necessary tables on first run.

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Projects (Requires Authentication)

- `GET /api/projects` - Get all user projects
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### File Upload (Requires Authentication)

- `POST /api/upload/file` - Upload single file
- `POST /api/upload/files` - Upload multiple files
- `GET /api/upload/assets` - Get user's assets
- `DELETE /api/upload/assets/:id` - Delete asset

### Health Check

- `GET /api/health` - Server health status

## Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Database

The backend uses SQLite with better-sqlite3 for simplicity. The database file is created automatically at `./data/playlist-studio.db`.

### Tables

- `users` - User accounts
- `projects` - User projects
- `songs` - Individual songs within projects
- `feedback` - User feedback on songs
- `assets` - Uploaded files and assets

## Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - Secret key for JWT tokens
- `DATABASE_PATH` - Path to SQLite database file
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `MAX_FILE_SIZE` - Maximum file upload size in bytes
- `UPLOAD_DIR` - Directory for uploaded files

## Development

The backend uses ES modules and requires Node.js 18+.

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a secure `JWT_SECRET`
3. Configure proper CORS origins
4. Set up proper file storage (consider cloud storage for production)
5. Add database backups
6. Configure proper logging and monitoring

## Notes

- SQLite is suitable for small to medium applications
- For high-traffic production use, consider migrating to PostgreSQL or MySQL
- File uploads are stored locally; consider cloud storage (S3, Cloudinary) for production
- Add rate limiting and additional security measures for production use

