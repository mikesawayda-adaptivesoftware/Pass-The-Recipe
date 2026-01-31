# =============================================================================
# Stage 1: Build Angular Frontend
# =============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy only package files first (better caching)
COPY package*.json ./

# Install ALL dependencies (needed for Angular CLI build)
RUN npm ci

# Copy frontend source AFTER npm ci (better layer caching)
COPY src ./src
COPY angular.json tsconfig*.json ./
COPY public ./public

# Build frontend for production
RUN npm run build

# =============================================================================
# Stage 2: Build NestJS Backend
# =============================================================================
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Install build dependencies for native modules (sqlite3, bcrypt)
RUN apk add --no-cache python3 make g++

# Copy backend package files first (better caching)
COPY server/package*.json ./

# Install ALL dependencies including devDependencies for build
RUN npm ci

# Copy backend source AFTER npm ci (better layer caching)
COPY server/src ./src
COPY server/tsconfig*.json server/nest-cli.json ./

# Build backend
RUN npm run build

# Install ONLY production dependencies in a clean directory
RUN mkdir -p /app/prod && \
    cp package*.json /app/prod/ && \
    cd /app/prod && \
    npm ci --omit=dev && \
    npm rebuild sqlite3 bcrypt --build-from-source

# =============================================================================
# Stage 3: Minimal Production Image
# =============================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Install only runtime dependencies (wget for healthcheck)
RUN apk add --no-cache wget

# Copy production node_modules (already built)
COPY --from=backend-builder /app/prod/node_modules ./node_modules
COPY --from=backend-builder /app/prod/package*.json ./

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
ENV CORS_ORIGIN=*

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api || exit 1

# Start the application
CMD ["node", "dist/main.js"]
