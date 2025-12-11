# Docker Setup Guide

This guide explains how to run the Playlist Studio application using Docker.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)

## Quick Start

1. **Build and start all services:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Backend Health Check: http://localhost:3001/api/health

## Docker Commands

### Start services in detached mode (background):
```bash
docker-compose up -d
```

### View logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Stop services:
```bash
docker-compose down
```

### Stop and remove volumes (cleans up data):
```bash
docker-compose down -v
```

### Rebuild after code changes:
```bash
docker-compose up --build
```

### Restart a specific service:
```bash
docker-compose restart backend
docker-compose restart frontend
```

## Environment Variables

### Backend Environment Variables

Create a `.env` file in the `backend/` directory or set them in `docker-compose.yml`:

```env
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=http://localhost:80,http://localhost:3000,http://localhost:5173
JWT_SECRET=your-secret-key-change-in-production
```

### Frontend Environment Variables

The frontend API URL is set during build time via the `VITE_API_BASE_URL` build argument in `docker-compose.yml`.

To change it, modify the `docker-compose.yml` file:
```yaml
frontend:
  build:
    args:
      - VITE_API_BASE_URL=http://localhost:3001
```

## Services

### Backend Service
- **Port:** 3001
- **Health Check:** http://localhost:3001/api/health
- **Volumes:**
  - `./backend/data` - Database files
  - `./backend/uploads` - Uploaded files

### Frontend Service
- **Port:** 3000 (mapped to container port 80)
- **Web Server:** Nginx
- **Build:** Multi-stage build with Node.js and Nginx

## Troubleshooting

### Port already in use
If port 3000 or 3001 is already in use, modify the ports in `docker-compose.yml`:
```yaml
ports:
  - "3001:3001"  # Change 3001 to another port
```

### Backend not connecting
1. Check backend logs: `docker-compose logs backend`
2. Verify backend is healthy: `curl http://localhost:3001/api/health`
3. Check CORS settings in `ALLOWED_ORIGINS`

### Frontend can't reach backend
1. Ensure `VITE_API_BASE_URL` in `docker-compose.yml` matches your backend URL
2. Check network connectivity: `docker-compose exec frontend ping backend`
3. Verify backend is running: `docker-compose ps`

### Rebuild after dependency changes
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### View container status
```bash
docker-compose ps
```

### Execute commands in containers
```bash
# Backend shell
docker-compose exec backend sh

# Frontend shell
docker-compose exec frontend sh
```

## Production Deployment

For production deployment:

1. **Update environment variables:**
   - Set strong `JWT_SECRET`
   - Update `ALLOWED_ORIGINS` with production domains
   - Set `NODE_ENV=production`

2. **Use production-optimized images:**
   - Consider using specific version tags instead of `latest`
   - Enable Docker build cache for faster builds

3. **Security:**
   - Don't expose database ports publicly
   - Use reverse proxy (nginx/traefik) for SSL/TLS
   - Set up proper firewall rules

4. **Monitoring:**
   - Set up health check monitoring
   - Configure log aggregation
   - Monitor container resource usage

## Development vs Production

### Development
- Use `docker-compose up` with volume mounts for live code changes
- Enable hot-reload (may require additional configuration)

### Production
- Build optimized images
- Use environment-specific configuration
- Enable proper logging and monitoring


