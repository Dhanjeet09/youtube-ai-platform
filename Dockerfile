# =============================================================================
# AutoTube — Dockerfile (multi-stage)
# =============================================================================
# Stage 1: Build
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (if any)
RUN apk add --no-cache python3 make g++

# ── Layer caching: install deps before copying source ─────────────────────
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Client deps (separate layer for caching)
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci --include=dev

# Copy source code
WORKDIR /app
COPY . .

# Build the client (Vite)
WORKDIR /app/client
RUN npm run build

# =============================================================================
# Stage 2: Production image
# =============================================================================
FROM node:20-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

# Runtime dependencies (ffmpeg for video processing)
RUN apk add --no-cache ffmpeg

# Copy package files and install production deps only
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy server source
COPY server/ ./server/

# Copy built client assets (served as static if needed)
COPY --from=builder /app/client/dist ./client/dist

# Storage mount point (create as a volume for persistence)
# NOTE: In production, R2 object storage is the primary storage backend.
# Local storage is only used for temp files during pipeline processing
# and as fallback when R2 is not configured.
RUN mkdir -p /app/storage
VOLUME ["/app/storage"]

# Health check — uses the lightweight / route (also serves as health endpoint)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/ || exit 1

EXPOSE 5000

# Switch to non-root user for security
USER node

CMD ["node", "server/app.js"]
