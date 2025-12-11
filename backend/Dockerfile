# Backend Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies for native modules (sqlite3, etc.) and healthcheck tool
RUN apk add --no-cache python3 make g++ wget

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p data uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the application
CMD ["node", "src/server.js"]

