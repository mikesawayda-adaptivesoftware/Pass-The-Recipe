# Stage 1: Build Angular Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY src ./src
COPY angular.json tsconfig*.json ./
COPY public ./public

# Build frontend for production
RUN npm run build

# Stage 2: Build NestJS Backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY server/package*.json ./

# Install backend dependencies
RUN npm ci

# Copy backend source
COPY server/src ./src
COPY server/tsconfig*.json server/nest-cli.json ./

# Build backend
RUN npm run build

# Stage 3: Production Image
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies for backend
COPY server/package*.json ./
RUN npm ci --only=production

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copy built frontend to public folder (served by NestJS)
COPY --from=frontend-builder /app/frontend/dist/pass-the-recipe/browser ./public

# Create data and uploads directories
RUN mkdir -p /app/data /app/uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/pass-the-recipe.db
ENV JWT_SECRET=change-this-secret-in-production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/auth/profile || exit 1

# Start the application
CMD ["node", "dist/main.js"]

