# Environment Variables Setup

Create a `.env` file in the `backend` directory with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Secret (change this in production!)
# Generate a secure random string: openssl rand -base64 32
JWT_SECRET=your-secret-key-change-this-in-production

# Database
DATABASE_PATH=./data/playlist-studio.db

# CORS - Comma-separated list of allowed origins
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# File Upload
MAX_FILE_SIZE=104857600
UPLOAD_DIR=./uploads
```

## Quick Setup

1. Copy the example above into a new file named `.env` in the `backend` directory
2. Generate a secure JWT secret:
   ```bash
   openssl rand -base64 32
   ```
3. Replace `your-secret-key-change-this-in-production` with the generated secret
4. Update `ALLOWED_ORIGINS` to match your frontend URL(s)

## Production Notes

- **Never commit** `.env` files to version control
- Use strong, random JWT secrets in production
- Set `NODE_ENV=production` for production deployments
- Consider using environment-specific configuration files
- Use a proper database (PostgreSQL, MySQL) for production instead of SQLite

